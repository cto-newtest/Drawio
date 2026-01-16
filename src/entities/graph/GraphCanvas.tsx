import React, { useEffect, useMemo, useRef } from 'react'
import {
  Graph,
  InternalEvent,
  RubberBandHandler,
  type Cell,
  type CellStyle,
  Geometry,
  constants,
  ConnectionConstraint,
  Point,
} from '@maxgraph/core'
import { useGraphStore, type GraphEdge, type GraphNode } from '@/shared/store/graphStore'
import { cn } from '@/shared/lib/utils'

interface GraphCanvasProps {
  className?: string
}

const getVertexStyle = (node: GraphNode): CellStyle => {
  const nodeStyle = node.style ?? {}

  const shape = (nodeStyle.shape as string | undefined) ?? constants.SHAPE.RECTANGLE

  const style: CellStyle = {
    shape,
    rounded: true,
    whiteSpace: 'wrap',
    align: constants.ALIGN.CENTER,
    verticalAlign: constants.ALIGN.MIDDLE,
  }

  if (nodeStyle.fillColor) {
    style.fillColor = nodeStyle.fillColor
  }

  if (nodeStyle.strokeColor) {
    style.strokeColor = nodeStyle.strokeColor
  }

  if (nodeStyle.fontColor) {
    style.fontColor = nodeStyle.fontColor
  }

  if (nodeStyle.fontSize) {
    style.fontSize = nodeStyle.fontSize
  }

  if (nodeStyle.fontFamily) {
    style.fontFamily = nodeStyle.fontFamily
  }

  if (nodeStyle.fontWeight === 'bold') {
    style.fontStyle = constants.FONT.BOLD
  }

  if (typeof nodeStyle.opacity === 'number') {
    style.opacity = Math.round(Math.max(0, Math.min(1, nodeStyle.opacity)) * 100)
  }

  if (typeof nodeStyle.rotation === 'number') {
    style.rotation = nodeStyle.rotation
  }

  if (shape === constants.SHAPE.LABEL) {
    style.fillColor = constants.NONE
    style.strokeColor = constants.NONE
    style.rounded = false
  }

  return style
}

const getEdgeStyle = (edge: GraphEdge): CellStyle => {
  const edgeStyle = edge.style ?? {}

  const style: CellStyle = {
    endArrow: constants.ARROW.BLOCK,
    edgeStyle: constants.EDGESTYLE.ORTHOGONAL,
    rounded: true,
  }

  if (edgeStyle.lineColor) {
    style.strokeColor = edgeStyle.lineColor
  }

  if (edgeStyle.endArrow === 'none') {
    style.endArrow = constants.NONE
  }

  return style
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const graphRef = useRef<Graph | null>(null)
  const isApplyingStoreRef = useRef(false)
  const isDraggingRef = useRef(false)

  const { 
    diagram, 
    selectedTool, 
    undo, 
    redo, 
    copyCells 
  } = useGraphStore()

  const cursorClass = useMemo(() => {
    if (selectedTool === 'add-text') return 'text'
    if (selectedTool.startsWith('add-') && selectedTool !== 'add-edge') return 'crosshair'
    return 'pointer'
  }, [selectedTool])

  // Init maxGraph
  useEffect(() => {
    const container = containerRef.current
    if (!container || graphRef.current) return

    InternalEvent.disableContextMenu(container)

    const graph = new Graph(container)
    graphRef.current = graph

    graph.setPanning(true)
    graph.setConnectable(false)
    graph.setCellsCloneable(false)
    graph.setCellsEditable(true)
    graph.setCellsResizable(true)
    graph.setCellsMovable(true)
    graph.setHtmlLabels(true)

    // Configure graph for orthogonal edge routing (corner-to-corner)
    graph.getAllConnectionConstraints = (terminal) => {
      if (terminal != null) {
        const cell = terminal.cell
        if (cell != null && cell.isVertex()) {
          return [
            new ConnectionConstraint(new Point(0, 0), true), // Top-left
            new ConnectionConstraint(new Point(0.5, 0), true), // Top-center
            new ConnectionConstraint(new Point(1, 0), true), // Top-right
            new ConnectionConstraint(new Point(0, 0.5), true), // Middle-left
            new ConnectionConstraint(new Point(0.5, 0.5), true), // Center
            new ConnectionConstraint(new Point(1, 0.5), true), // Middle-right
            new ConnectionConstraint(new Point(0, 1), true), // Bottom-left
            new ConnectionConstraint(new Point(0.5, 1), true), // Bottom-center
            new ConnectionConstraint(new Point(1, 1), true), // Bottom-right
          ]
        }
      }
      return null
    }

    // Configure edge to use the closest constraint point
    graph.getConnectionConstraint = (edge, terminal, source) => {
      const constraints = graph.getAllConnectionConstraints(terminal)
      if (constraints && constraints.length > 0) {
        // Return the first constraint (closest corner will be selected by maxGraph)
        return constraints[0]
      }
      return null
    }

    // Set default edge style to ensure orthogonal routing
    const model = graph.getDataModel()
    model.getEdgeStyle = () => {
      return {
        endArrow: constants.ARROW.BLOCK,
        edgeStyle: constants.EDGESTYLE.ORTHOGONAL,
        rounded: true,
      }
    }

    // Rubberband selection
    // eslint-disable-next-line no-new
    new RubberBandHandler(graph)

    // Add node/text on click
    graph.addListener(InternalEvent.CLICK, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return
      if (isDraggingRef.current) return
      if (evt.isConsumed()) return

      const cell = evt.getProperty('cell') as Cell | null
      const mouseEvent = evt.getProperty('event') as MouseEvent | undefined
      if (!mouseEvent) return

      const store = useGraphStore.getState()
      const tool = store.selectedTool

      // If clicking on a cell with select tool, let the selection handler deal with it
      if (cell) {
        // Don't create new nodes if we're clicking on an existing cell
        return
      }

      // Only create new nodes if we're not in select mode or edge mode
      if (tool === 'select' || tool === 'add-edge' || tool === 'add-line') return

      const pt = graph.getPointForEvent(mouseEvent)

      const base = {
        x: pt.x,
        y: pt.y,
      }

      if (tool === 'add-node') {
        const id = store.addNode({
          ...base,
          value: 'Rectangle',
          width: 120,
          height: 60,
          style: { shape: constants.SHAPE.RECTANGLE },
        })
        store.selectCells([id])
      } else if (tool === 'add-oval') {
        const id = store.addNode({
          ...base,
          value: 'Circle',
          width: 100,
          height: 100,
          style: { shape: constants.SHAPE.ELLIPSE },
        })
        store.selectCells([id])
      } else if (tool === 'add-rhombus') {
        const id = store.addNode({
          ...base,
          value: 'Diamond',
          width: 100,
          height: 100,
          style: { shape: constants.SHAPE.RHOMBUS },
        })
        store.selectCells([id])
      } else if (tool === 'add-text') {
        const id = store.addNode({
          ...base,
          value: 'Text',
          width: 120,
          height: 30,
          style: {
            shape: constants.SHAPE.LABEL,
            fillColor: constants.NONE,
            strokeColor: constants.NONE,
          },
        })
        store.selectCells([id])
      }
    })

    // Sync selection -> store
    graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
      if (isApplyingStoreRef.current) return

      const store = useGraphStore.getState()
      const ids = graph
        .getSelectionCells()
        .map((c) => c.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

      if (ids.length === 0) {
        store.clearSelection()
      } else {
        store.selectCells(ids)
      }
    })

    // Sync moved cells -> store
    graph.addListener(InternalEvent.CELLS_MOVED, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return

      const cells = (evt.getProperty('cells') as Cell[] | undefined) ?? []
      const store = useGraphStore.getState()

      for (const cell of cells) {
        if (cell.isVertex()) {
          const id = cell.id
          if (!id) continue

          const geo = cell.getGeometry()
          if (!geo) continue

          store.updateNode(id, {
            x: geo.x + geo.width / 2,
            y: geo.y + geo.height / 2,
          })
        } else if (cell.isEdge()) {
          // Edge geometry changes when nodes move or when edge control points are modified
          // The edge geometry is automatically updated by maxGraph when connected nodes move
          // We just need to save history for edge movements
        }
      }
      store.saveHistory()
    })

    // Track drag start to prevent duplicate node creation
    graph.addListener(InternalEvent.MOVE_START, () => {
      isDraggingRef.current = true
    })

    // Track drag end to allow node creation again
    graph.addListener(InternalEvent.MOVE_END, () => {
      setTimeout(() => {
        isDraggingRef.current = false
      }, 100)
    })

    // Sync new edges -> store
    graph.addListener(InternalEvent.CONNECT, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return

      const edge = evt.getProperty('cell') as Cell
      if (edge && edge.isEdge()) {
        const source = edge.getTerminal(true)
        const target = edge.getTerminal(false)
        if (source && target) {
          const store = useGraphStore.getState()
          store.addEdge({
            source: source.id as string,
            target: target.id as string,
            style: store.selectedTool === 'add-line' ? { endArrow: 'none' } : {},
          })
          // Remove from graph model since store will re-add it
          graph.getDataModel().remove(edge)
        }
      }
    })

    // Sync resized cells -> store
    graph.addListener(InternalEvent.CELLS_RESIZED, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return

      const cells = (evt.getProperty('cells') as Cell[] | undefined) ?? []
      const store = useGraphStore.getState()

      for (const cell of cells) {
        if (!cell.isVertex()) continue

        const id = cell.id
        if (!id) continue

        const geo = cell.getGeometry()
        if (!geo) continue

        store.updateNode(id, {
          x: geo.x + geo.width / 2,
          y: geo.y + geo.height / 2,
          width: geo.width,
          height: geo.height,
        })
      }
      store.saveHistory()
    })

    // Handle edge control point changes
    graph.getDataModel().addListener(InternalEvent.CHANGE, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return

      const changes = evt.getProperty('changes') as any[] | undefined
      if (!changes) return

      const store = useGraphStore.getState()
      const model = graph.getDataModel()
      let hasEdgeChanges = false

      for (const change of changes) {
        const cell = change.cell as Cell | undefined
        if (!cell) continue

        if (cell.isEdge()) {
          hasEdgeChanges = true
          break
        }
      }

      if (hasEdgeChanges) {
        store.saveHistory()
      }
    })

    // Sync viewport (scale & translate) -> store
    graph.getView().addListener(InternalEvent.SCALE_AND_TRANSLATE, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return

      const scale = evt.getProperty('scale') as number | undefined
      const translate = evt.getProperty('translate') as { x: number; y: number } | undefined

      const store = useGraphStore.getState()
      store.setViewport({
        ...(typeof scale === 'number' ? { scale } : {}),
        ...(translate ? { translateX: translate.x, translateY: translate.y } : {}),
      })
    })

    return () => {
      graphRef.current = null
      graph.destroy()
    }
  }, [])

  // Update graph properties based on selected tool
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const isEdgeTool = selectedTool === 'add-edge' || selectedTool === 'add-line'

    graph.setConnectable(isEdgeTool)
    graph.setCellsResizable(!isEdgeTool)
  }, [selectedTool])

  // Keyboard shortcuts and wheel zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      const store = useGraphStore.getState()

      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        store.undo()
      }
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z for redo
      else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault()
        event.stopPropagation()
        store.redo()
      }
      // Ctrl+C or Cmd+C for copy
      else if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault()
        copyCells()
      }
      // Delete key to delete selected cells
      else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        const selectedIds = store.diagram.selection.cells
        
        selectedIds.forEach(id => {
          const cell = store.getCellById(id)
          if (cell) {
            if ('vertex' in cell && cell.vertex) {
              store.deleteNode(id)
            } else if ('edge' in cell && cell.edge) {
              store.deleteEdge(id)
            }
          }
        })
      }
    }

    const handleWheel = (event: WheelEvent) => {
      // Only handle wheel events when Ctrl/Cmd is pressed to avoid conflicts with page scrolling
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      
      event.preventDefault()
      
      const store = useGraphStore.getState()
      const currentScale = store.diagram.viewport.scale
      
      // Calculate new scale based on wheel direction
      // Scroll up (deltaY < 0) = zoom in, scroll down (deltaY > 0) = zoom out
      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.max(0.1, Math.min(5, currentScale * zoomFactor))
      
      // Only save to history if scale actually changed
      if (Math.abs(newScale - currentScale) > 0.001) {
        store.saveHistory()
      }
      
      // Apply zoom
      store.setViewport({ scale: newScale })
    }

    // Use capture phase for keyboard to handle shortcuts before other handlers
    window.addEventListener('keydown', handleKeyDown, true)

    // Add wheel listener to the container for better zoom experience
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (container) {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [copyCells])

  // Middle mouse button pan
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isPanning = false
    let startX = 0
    let startY = 0
    let initialTranslateX = 0
    let initialTranslateY = 0

    const handleMouseDown = (e: MouseEvent) => {
      // Check if it's middle mouse button (button 1)
      if (e.button === 1) {
        e.preventDefault()
        isPanning = true
        startX = e.clientX
        startY = e.clientY

        const store = useGraphStore.getState()
        initialTranslateX = store.diagram.viewport.translateX
        initialTranslateY = store.diagram.viewport.translateY

        container.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return

      e.preventDefault()

      const dx = e.clientX - startX
      const dy = e.clientY - startY

      const store = useGraphStore.getState()
      const currentScale = store.diagram.viewport.scale

      // Adjust for scale when panning
      store.setViewport({
        translateX: initialTranslateX + dx / currentScale,
        translateY: initialTranslateY + dy / currentScale,
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || isPanning) {
        isPanning = false
        container.style.cursor = ''
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent context menu on middle mouse button
      if (e.button === 2) {
        const lastMouseEvent = window.event as MouseEvent
        if (lastMouseEvent && lastMouseEvent.button === 1) {
          e.preventDefault()
        }
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('contextmenu', handleContextMenu)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  // Apply grid settings
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    graph.setGridSize(diagram.settings.gridSize)
    graph.setGridEnabled(diagram.settings.snapToGrid)
  }, [diagram.settings.gridSize, diagram.settings.snapToGrid])

  // Apply viewport from store
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    isApplyingStoreRef.current = true
    try {
      graph
        .getView()
        .scaleAndTranslate(diagram.viewport.scale, diagram.viewport.translateX, diagram.viewport.translateY)
    } finally {
      isApplyingStoreRef.current = false
    }
  }, [diagram.viewport.scale, diagram.viewport.translateX, diagram.viewport.translateY])

  // Apply diagram nodes and edges
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const model = graph.getDataModel()
    const parent = graph.getDefaultParent()

    isApplyingStoreRef.current = true
    model.beginUpdate()

    try {
      const nodeIds = new Set(diagram.nodes.map((n) => n.id))
      const edgeIds = new Set(diagram.edges.map((e) => e.id))

      // Upsert nodes
      for (const node of diagram.nodes) {
        const cell = model.getCell(node.id)

        const x = node.x - node.width / 2
        const y = node.y - node.height / 2

        const style = getVertexStyle(node)

        if (!cell) {
          graph.insertVertex(parent, node.id, node.value, x, y, node.width, node.height, style)
          continue
        }

        if (!cell.isVertex()) continue

        const geo = cell.getGeometry()
        if (
          !geo ||
          geo.x !== x ||
          geo.y !== y ||
          geo.width !== node.width ||
          geo.height !== node.height
        ) {
          const next = geo ? geo.clone() : new Geometry()
          next.x = x
          next.y = y
          next.width = node.width
          next.height = node.height
          model.setGeometry(cell, next)
        }

        if (cell.value !== node.value) {
          model.setValue(cell, node.value)
        }
        
        model.setStyle(cell, style)
      }

      // Remove missing vertices
      const vertices = graph.getChildVertices(parent)
      const verticesToRemove = vertices.filter((v) => {
        const id = v.id
        return id ? !nodeIds.has(id) : false
      })

      if (verticesToRemove.length > 0) {
        graph.removeCells(verticesToRemove, true)
      }

      // Upsert edges
      for (const edge of diagram.edges) {
        const existingEdge = model.getCell(edge.id)
        const source = model.getCell(edge.source)
        const target = model.getCell(edge.target)

        if (!source || !target) continue

        const style = getEdgeStyle(edge)

        if (!existingEdge) {
          graph.insertEdge(parent, edge.id, '', source, target, style)
          continue
        }

        if (!existingEdge.isEdge()) continue

        model.setStyle(existingEdge, style)
      }

      // Remove missing edges
      const edges = graph.getChildEdges(parent)
      const edgesToRemove = edges.filter((e) => {
        const id = e.id
        return id ? !edgeIds.has(id) : false
      })

      if (edgesToRemove.length > 0) {
        graph.removeCells(edgesToRemove, true)
      }
    } finally {
      model.endUpdate()
      isApplyingStoreRef.current = false
    }
  }, [diagram.nodes, diagram.edges])

  // Apply selection from store
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const model = graph.getDataModel()
    const ids = diagram.selection.cells

    isApplyingStoreRef.current = true
    try {
      if (ids.length === 0) {
        graph.clearSelection()
        return
      }

      const cells = ids
        .map((id) => model.getCell(id))
        .filter((cell): cell is Cell => !!cell)

      graph.setSelectionCells(cells)
    } finally {
      isApplyingStoreRef.current = false
    }
  }, [diagram.selection.cells])

  return (
    <div className={cn('graph-workspace', className)}>
      <div
        ref={containerRef}
        className={cn(
          'graph-canvas w-full h-full',
          diagram.settings.showGrid && 'graph-grid',
          cursorClass
        )}
      />
    </div>
  )
}
