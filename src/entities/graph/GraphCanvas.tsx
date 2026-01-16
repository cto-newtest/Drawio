import React, { useEffect, useMemo, useRef } from 'react'
import {
  Graph,
  InternalEvent,
  RubberBandHandler,
  type Cell,
  type CellStyle,
  Geometry,
  constants,
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
    html: true,
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
  }

  if (edgeStyle.lineColor) {
    style.strokeColor = edgeStyle.lineColor
  }

  return style
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const graphRef = useRef<Graph | null>(null)
  const isApplyingStoreRef = useRef(false)

  const { diagram, selectedTool } = useGraphStore()

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

    // Rubberband selection
    // eslint-disable-next-line no-new
    new RubberBandHandler(graph)

    // Add node/text on click
    graph.addListener(InternalEvent.CLICK, (_sender, evt) => {
      if (isApplyingStoreRef.current) return

      const cell = evt.getProperty('cell') as Cell | null
      if (cell) return

      const mouseEvent = evt.getProperty('event') as MouseEvent | undefined
      if (!mouseEvent) return

      const store = useGraphStore.getState()
      const tool = store.selectedTool

      if (tool === 'select' || tool === 'add-edge') return

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
    graph.addListener(InternalEvent.CELLS_MOVED, (_sender, evt) => {
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
        })
      }
    })

    // Sync resized cells -> store
    graph.addListener(InternalEvent.CELLS_RESIZED, (_sender, evt) => {
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
    })

    // Sync viewport (scale & translate) -> store
    graph.getView().addListener(InternalEvent.SCALE_AND_TRANSLATE, (_sender, evt) => {
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
