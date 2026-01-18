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

const getEdgeStyle = (edge: GraphEdge, tool: string): CellStyle => {
  const edgeStyle = edge.style ?? {}

  const style: CellStyle = {
    endArrow: constants.ARROW.BLOCK,
    // Use orthogonal edge style for draw.io-like right-angle bends
    // Only use straight lines for 'add-line' tool (lines without arrows)
    edgeStyle: edgeStyle.endArrow === 'none' ? constants.NONE : constants.EDGESTYLE.ORTHOGONAL,
    rounded: true,
    // Enable orthogonal routing
    orthogonal: true,
    // Set edge selection stroke width
    strokeWidth: 2,
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
    copyCells,
    pasteCells,
    cutCells
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
    
    // Enable edge selection and interaction
    graph.setCellsSelectable(true)
    graph.setAllowDanglingEdges(false)
    
    // Preview colors (connection preview, move preview) should stay visible in both themes.
    // Using CSS variables lets the browser resolve the final color when theme changes.
    const anyGraph = graph as any
    const previewColor = 'hsl(var(--primary))'
    const invalidColor = 'hsl(var(--destructive))'

    if (anyGraph.connectionHandler) {
      anyGraph.connectionHandler.previewColor = previewColor
      anyGraph.connectionHandler.validColor = previewColor
      anyGraph.connectionHandler.invalidColor = invalidColor
      anyGraph.connectionHandler.setCreateTarget?.(false)
    }

    if (anyGraph.graphHandler) {
      anyGraph.graphHandler.previewColor = previewColor
    }

    // Configure graph for orthogonal edge routing with draw.io-like right-angle bends
    graph.getAllConnectionConstraints = (terminal) => {
      if (terminal != null) {
        const cell = terminal.cell
        if (cell != null && cell.isVertex()) {
          // Return 8 connection points: 4 corners + 4 midpoints for draw.io-like connectivity
          return [
            // Corner points
            new ConnectionConstraint(new Point(0, 0), true), // Top-left
            new ConnectionConstraint(new Point(1, 0), true), // Top-right
            new ConnectionConstraint(new Point(1, 1), true), // Bottom-right
            new ConnectionConstraint(new Point(0, 1), true), // Bottom-left
            // Midpoint points
            new ConnectionConstraint(new Point(0.5, 0), true), // Top-center
            new ConnectionConstraint(new Point(1, 0.5), true), // Middle-right
            new ConnectionConstraint(new Point(0.5, 1), true), // Bottom-center
            new ConnectionConstraint(new Point(0, 0.5), true), // Middle-left
          ]
        }
      }
      return null
    }

    // Smart connection constraint selection for orthogonal routing
    // Choose connection points based on relative positions for draw.io-like routing
    const baseGetConnectionConstraint = graph.getConnectionConstraint.bind(graph)
    graph.getConnectionConstraint = (edgeState, terminalState, source) => {
      const baseConstraint = baseGetConnectionConstraint(edgeState, terminalState, source)

      // If a constraint is already defined (eg. via edge style), keep it.
      if (baseConstraint?.point) {
        return baseConstraint
      }

      const constraints = graph.getAllConnectionConstraints(terminalState, source)
      if (!terminalState || !constraints || constraints.length === 0) {
        return baseConstraint
      }

      const otherState = source ? edgeState.visibleTargetState : edgeState.visibleSourceState
      if (!otherState) {
        return constraints[0]
      }

      // Get centers of both terminals
      const thisCenterX = terminalState.x + terminalState.width / 2
      const thisCenterY = terminalState.y + terminalState.height / 2
      const otherCenterX = otherState.x + otherState.width / 2
      const otherCenterY = otherState.y + otherState.height / 2

      // Calculate differences
      const dx = otherCenterX - thisCenterX
      const dy = otherCenterY - thisCenterY

      // Use the larger difference to determine primary direction
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // Select constraint based on relative position
      // Priority: use the side that faces the other node
      if (absDx > absDy) {
        // Horizontal difference is larger
        if (dx > 0) {
          // Other node is to the right, connect from right side
          return constraints[1] // Right
        } else {
          // Other node is to the left, connect from left side
          return constraints[3] // Left
        }
      } else {
        // Vertical difference is larger or equal
        if (dy > 0) {
          // Other node is below, connect from bottom
          return constraints[2] // Bottom
        } else {
          // Other node is above, connect from top
          return constraints[0] // Top
        }
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

      // If clicking on a cell with select tool, handle selection properly
      if (cell) {
        // If we're in select mode, allow selection of both nodes and edges
        if (tool === 'select') {
          // For edges, ensure they are selectable
          if (cell.isEdge()) {
            const cellId = cell.id as string
            if (cellId) {
              store.selectCells([cellId])
              evt.consume()
            }
          }
          // Let the default selection handler work for vertices
          return
        }
        // Don't create new nodes if we're clicking on an existing cell in other modes
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
        // Force a re-sync after drag ends to ensure edges are properly updated
        const graph = graphRef.current
        if (graph) {
          // Trigger a layout update to refresh edge connections
          graph.refresh()
        }
      }, 100)
    })

    // Sync new edges -> store
    graph.addListener(InternalEvent.CONNECT, (_sender: any, evt: any) => {
      if (isApplyingStoreRef.current) return

      const edge = evt.getProperty('cell') as Cell
      if (!edge || !edge.isEdge()) return

      const source = edge.getTerminal(true)
      const target = edge.getTerminal(false)
      if (!source || !target) return

      const store = useGraphStore.getState()
      store.addEdge({
        source: source.id as string,
        target: target.id as string,
        style: store.selectedTool === 'add-line' ? { endArrow: 'none' } : {},
      })

      // Remove the temporary edge created by maxGraph; store will re-add it.
      isApplyingStoreRef.current = true
      try {
        graph.getDataModel().remove(edge)
      } finally {
        isApplyingStoreRef.current = false
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

      // Use event.code for layout-independent keyboard handling
      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        store.undo()
      }
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z for redo
      else if ((event.ctrlKey || event.metaKey) && (event.code === 'KeyY' || (event.code === 'KeyZ' && event.shiftKey))) {
        event.preventDefault()
        event.stopPropagation()
        store.redo()
      }
      // Ctrl+C or Cmd+C for copy
      else if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
        event.preventDefault()
        event.stopPropagation()
        copyCells()
      }
      // Delete key to delete selected cells
      else if (event.code === 'Delete' || event.code === 'Backspace') {
        event.preventDefault()
        const selectedIds = store.diagram.selection.cells

        if (selectedIds.length === 0) return

        // Separate vertex and edge IDs
        const vertexIds = selectedIds.filter(id => {
          const cell = store.getCellById(id)
          return cell && 'vertex' in cell && cell.vertex
        })
        const edgeIds = selectedIds.filter(id => {
          const cell = store.getCellById(id)
          return cell && 'edge' in cell && cell.edge
        })

        // Delete edges first (including those connected to vertices being deleted)
        const edgesToDelete = new Set([...edgeIds])
        vertexIds.forEach(vid => {
          store.diagram.edges.forEach(edge => {
            if (edge.source === vid || edge.target === vid) {
              edgesToDelete.add(edge.id)
            }
          })
        })

        // Delete all edges first, then all vertices
        edgesToDelete.forEach(edgeId => {
          store.deleteEdge(edgeId)
        })

        vertexIds.forEach(vertexId => {
          store.deleteNode(vertexId)
        })
      }
      // Ctrl+V or Cmd+V for paste
      else if ((event.ctrlKey || event.metaKey) && event.code === 'KeyV') {
        event.preventDefault()
        event.stopPropagation()
        pasteCells()
      }
      // Ctrl+X or Cmd+X for cut
      else if ((event.ctrlKey || event.metaKey) && event.code === 'KeyX') {
        event.preventDefault()
        event.stopPropagation()
        cutCells()
      }
      // Ctrl+Plus or Cmd+Plus for zoom in
      else if ((event.ctrlKey || event.metaKey) && (event.code === 'Equal' || event.code === 'NumpadAdd')) {
        event.preventDefault()
        const newScale = Math.min(store.diagram.viewport.scale * 1.2, 5)
        store.setViewport({ scale: newScale })
      }
      // Ctrl+Minus or Cmd+Minus for zoom out
      else if ((event.ctrlKey || event.metaKey) && (event.code === 'Minus' || event.code === 'NumpadSubtract')) {
        event.preventDefault()
        const newScale = Math.max(store.diagram.viewport.scale / 1.2, 0.1)
        store.setViewport({ scale: newScale })
      }
      // Ctrl+0 or Cmd+0 for reset zoom
      else if ((event.ctrlKey || event.metaKey) && (event.code === 'Digit0' || event.code === 'Numpad0')) {
        event.preventDefault()
        store.setViewport({ scale: 1, translateX: 0, translateY: 0 })
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

    // Intercept keyboard shortcuts on the graph container to prevent maxGraph from handling them
    const container = containerRef.current
    const handleContainerKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      // Stop propagation for graph-specific shortcuts to prevent maxGraph from handling them
      if ((event.ctrlKey || event.metaKey) &&
          (event.code === 'KeyZ' || event.code === 'KeyY' || event.code === 'KeyC' || event.code === 'KeyV' || event.code === 'KeyX' ||
           event.code === 'Equal' || event.code === 'NumpadAdd' || event.code === 'Minus' || event.code === 'NumpadSubtract' ||
           event.code === 'Digit0' || event.code === 'Numpad0')) {
        event.stopPropagation()
      }
    }

    // Use capture phase for keyboard to handle shortcuts before other handlers
    window.addEventListener('keydown', handleKeyDown, true)

    // Add wheel listener to the container for better zoom experience
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      // Add keydown listener on container to intercept shortcuts before maxGraph
      container.addEventListener('keydown', handleContainerKeyDown, true)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (container) {
        container.removeEventListener('wheel', handleWheel)
        container.removeEventListener('keydown', handleContainerKeyDown, true)
      }
    }
  }, [copyCells, pasteCells, cutCells])

  // Middle mouse button pan
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isPanning = false
    let startX = 0
    let startY = 0
    let initialTranslateX = 0
    let initialTranslateY = 0

    const stopPanning = () => {
      if (!isPanning) return
      isPanning = false
      container.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return

      e.preventDefault()

      const dx = e.clientX - startX
      const dy = e.clientY - startY

      const store = useGraphStore.getState()
      const currentScale = store.diagram.viewport.scale

      store.setViewport({
        translateX: initialTranslateX + dx / currentScale,
        translateY: initialTranslateY + dy / currentScale,
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
      }
      stopPanning()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return

      e.preventDefault()
      e.stopPropagation()

      isPanning = true
      startX = e.clientX
      startY = e.clientY

      const store = useGraphStore.getState()
      initialTranslateX = store.diagram.viewport.translateX
      initialTranslateY = store.diagram.viewport.translateY

      container.style.cursor = 'grabbing'

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    container.addEventListener('mousedown', handleMouseDown)

    return () => {
      stopPanning()
      container.removeEventListener('mousedown', handleMouseDown)
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

    // ABSOLUTELY CRITICAL: Skip re-sync during drag operations to prevent edges from disappearing
    if (isDraggingRef.current) return

    const model = graph.getDataModel()
    const parent = graph.getDefaultParent()

    isApplyingStoreRef.current = true
    model.beginUpdate()

    try {
      const nodeIds = new Set(diagram.nodes.map((n) => n.id))
      const edgeIds = new Set(diagram.edges.map((e) => e.id))

      // Upsert nodes - NEVER remove vertices during drag
      const vertices = graph.getChildVertices(parent)
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

      // DON'T remove missing vertices during drag - this breaks edges!
      const verticesToRemove = vertices.filter((v) => {
        const id = v.id
        return id ? !nodeIds.has(id) : false
      })
      if (verticesToRemove.length > 0 && !isDraggingRef.current) {
        graph.removeCells(verticesToRemove, true)
      }

      // Critical: Map edge IDs to their existing cells to preserve connections
      const edgeIdToCell = new Map<string, any>()
      const existingEdges = graph.getChildEdges(parent)
      for (const edgeCell of existingEdges) {
        if (edgeCell.id) {
          edgeIdToCell.set(edgeCell.id, edgeCell)
        }
      }

      for (const edge of diagram.edges) {
        const existingEdge = edgeIdToCell.get(edge.id)
        const source = model.getCell(edge.source)
        const target = model.getCell(edge.target)

        if (!source || !target) {
          if (import.meta.env.DEV) {
            console.warn(`Skipping edge ${edge.id}: source or target not found`)
          }
          continue
        }

        const style = getEdgeStyle(edge, selectedTool)

        if (!existingEdge) {
          if (import.meta.env.DEV) {
            console.log(`Creating new edge: ${edge.id}`)
          }
          const newEdge = graph.insertEdge(parent, edge.id, '', source, target, style)
          edgeIdToCell.set(edge.id, newEdge)
          continue
        }

        if (!existingEdge.isEdge()) continue

        // Update terminals if they've changed to ensure edge stays connected to correct nodes
        if (existingEdge.getTerminal(true) !== source) {
          model.setTerminal(existingEdge, source, true)
        }
        if (existingEdge.getTerminal(false) !== target) {
          model.setTerminal(existingEdge, target, false)
        }

        model.setStyle(existingEdge, style)
      }

      // Remove missing edges - but during drag, skip this completely
      const edges = graph.getChildEdges(parent)
      const edgesToRemove = edges.filter((e) => {
        const id = e.id
        return id ? !edgeIds.has(id) : false
      })
      
      if (edgesToRemove.length > 0 && !isDraggingRef.current) {
        graph.removeCells(edgesToRemove, true)
      }
    } finally {
      model.endUpdate()
      isApplyingStoreRef.current = false
    }
  }, [diagram.nodes, diagram.edges, selectedTool])

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
          'graph-canvas w-full h-full select-none',
          diagram.settings.showGrid && 'graph-grid',
          cursorClass
        )}
      />
      <style>{`
        .graph-canvas {
          cursor: default;
        }
        .crosshair {
          cursor: crosshair;
        }
        .text {
          cursor: text;
        }
        .pointer {
          cursor: pointer;
        }
        .graph-canvas div.mxRubberband {
          position: absolute;
          overflow: hidden;
          border-style: dashed;
          border-width: 1px;
          border-color: #0000ff;
          background: #0077ff33;
        }
      `}</style>
    </div>
  )
}
