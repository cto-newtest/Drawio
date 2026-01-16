import React, { useEffect, useRef, useState } from 'react'
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape'
import { useGraphStore } from '@/shared/store/graphStore'
import { cn } from '@/shared/lib/utils'

interface GraphCanvasProps {
  className?: string
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const {
    diagram,
    selectedTool,
    addNode,
    updateNode,
    deleteNode,
    selectCells,
    clearSelection,
    setViewport,
    zoomIn,
    zoomOut,
    resetZoom,
    setSelectedTool,
  } = useGraphStore()

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    try {
      const container = containerRef.current
      const cy = cytoscape({
        container,
        elements: [],
        style: getGraphStyles(),
        layout: { name: 'preset' },
        wheelSensitivity: 0.1,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: true,
        autoungrabify: false,
        autolock: false,
        autounselectify: false,
      })

      cyRef.current = cy
      setupEventHandlers(cy)
      setIsInitialized(true)

      // Handle resize
      const handleResize = () => {
        if (cy) {
          cy.resize()
        }
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        if (cy) {
          cy.destroy()
        }
      }
    } catch (error) {
      console.error('Failed to initialize graph:', error)
    }
  }, [isInitialized])

  // Get graph styles
  const getGraphStyles = () => [
    {
      selector: 'node',
      style: {
        'background-color': 'hsl(var(--graph-node-default))',
        'border-color': 'hsl(var(--border))',
        'border-width': 1,
        'border-style': 'solid',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-family': 'Inter, sans-serif',
        'font-size': 12,
        'color': 'hsl(var(--foreground))',
        'text-outline-width': 0,
        'width': 'data(width)',
        'height': 'data(height)',
        'shape': 'data(shape)',
        'corner-radius': 'data(cornerRadius)',
        'shadow-blur': 'data(shadowBlur)',
        'shadow-opacity': 'data(shadowOpacity)',
        'shadow-color': 'data(shadowColor)',
        'shadow-offset-x': 'data(shadowOffsetX)',
        'shadow-offset-y': 'data(shadowOffsetY)',
        'opacity': 'data(opacity)',
        'rotation': 'data(rotation)',
        'padding': 'data(padding)',
        'text-wrap': 'data(textWrap)',
        'text-max-width': 'data(textMaxWidth)',
        'text-outline-color': 'data(textOutlineColor)',
        'text-outline-width': 'data(textOutlineWidth)',
        'font-weight': 'data(fontWeight)',
        'font-style': 'data(fontStyle)',
        'text-decoration': 'data(textDecoration)',
        'text-transform': 'data(textTransform)',
        'line-height': 'data(lineHeight)',
        'text-margin-y': 'data(textMarginY)',
        'text-margin-x': 'data(textMarginX)',
      },
    },
    {
      selector: 'node:hover',
      style: {
        'background-color': 'hsl(var(--graph-node-hover))',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': 'hsl(var(--graph-node-selected))',
        'border-color': 'hsl(var(--graph-node-selected))',
        'border-width': 2,
        'text-outline-color': 'hsl(var(--primary-foreground))',
        'text-outline-width': 2,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': 'hsl(var(--graph-edge-default))',
        'target-arrow-color': 'hsl(var(--graph-edge-default))',
        'target-arrow-shape': 'data(arrowShape)',
        'curve-style': 'data(curveStyle)',
        'label': 'data(label)',
        'font-family': 'Inter, sans-serif',
        'font-size': 10,
        'color': 'hsl(var(--foreground))',
        'text-outline-width': 0,
        'text-background-opacity': 'data(textBackgroundOpacity)',
        'text-background-color': 'data(textBackgroundColor)',
        'text-background-shape': 'data(textBackgroundShape)',
        'line-style': 'data(lineStyle)',
        'line-cap': 'data(lineCap)',
        'line-join': 'data(lineJoin)',
        'opacity': 'data(opacity)',
        'z-index': 'data(zIndex)',
        'line-gradient-stop-colors': 'data(lineGradientStopColors)',
        'line-gradient-stop-positions': 'data(lineGradientStopPositions)',
        'control-point-weight': 'data(controlPointWeight)',
        'segment-distances': 'data(segmentDistances)',
        'segment-weights': 'data(segmentWeights)',
        'taxi-direction': 'data(taxiDirection)',
        'taxi-turn': 'data(taxiTurn)',
        'taxi-turn-min-distance': 'data(taxiTurnMinDistance)',
        'haystack-radius': 'data(haystackRadius)',
        'edge-distances': 'data(edgeDistances)',
        'arrow-scale': 'data(arrowScale)',
      },
    },
    {
      selector: 'edge:hover',
      style: {
        'width': 2,
        'line-color': 'hsl(var(--graph-edge-hover))',
        'target-arrow-color': 'hsl(var(--graph-edge-hover))',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 2,
        'line-color': 'hsl(var(--graph-edge-selected))',
        'target-arrow-color': 'hsl(var(--graph-edge-selected))',
      },
    },
    {
      selector: '.grid',
      style: {
        'background-image': 'linear-gradient(to right, hsl(var(--graph-grid)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--graph-grid)) 1px, transparent 1px)',
        'background-size': `${diagram.settings.gridSize}px ${diagram.settings.gridSize}px`,
      },
    },
  ]

  // Set up event handlers
  const setupEventHandlers = (cy: Core) => {
    // Selection events
    cy.on('select', 'node', (event) => {
      const node = event.target
      selectCells([node.id()])
    })

    cy.on('select', 'edge', (event) => {
      const edge = event.target
      selectCells([edge.id()])
    })

    cy.on('unselect', (event) => {
      const selected = cy.$(':selected')
      if (selected.length === 0) {
        clearSelection()
      }
    })

    // Drag events
    cy.on('dragfree', 'node', (event) => {
      const node = event.target
      updateNode(node.id(), {
        x: node.position().x,
        y: node.position().y,
      })
    })

    // Tap events for adding nodes
    cy.on('tap', (event) => {
      if (event.target === cy && selectedTool === 'add-node') {
        const point = event.position
        const nodeId = addNode({
          x: point.x,
          y: point.y,
          value: 'New Node',
          width: 120,
          height: 60,
        })
        
        // Select the new node
        const node = cy.getElementById(nodeId)
        if (node) {
          node.select()
        }
      }
    })

    // Pan and zoom events
    cy.on('pan', () => {
      const pan = cy.pan()
      setViewport({
        translateX: pan.x,
        translateY: pan.y,
      })
    })

    cy.on('zoom', () => {
      setViewport({
        scale: cy.zoom(),
      })
    })
  }

  // Update graph when diagram changes
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return

    const cy = cyRef.current
    const existingNodeIds = new Set()
    const existingEdgeIds = new Set()

    // Update nodes
    diagram.nodes.forEach((node) => {
      let element = cy.getElementById(node.id)
      
      if (element.empty()) {
        // Create new node
        const nodeData = {
          id: node.id,
          label: node.value,
          width: node.width,
          height: node.height,
          shape: getShapeFromStyle(node.style),
          cornerRadius: node.style?.cornerRadius || 6,
          shadowBlur: node.style?.shadowBlur || 0,
          shadowOpacity: node.style?.shadowOpacity || 0,
          shadowColor: node.style?.shadowColor || 'transparent',
          shadowOffsetX: node.style?.shadowOffsetX || 0,
          shadowOffsetY: node.style?.shadowOffsetY || 0,
          opacity: node.style?.opacity || 1,
          rotation: node.style?.rotation || 0,
          padding: node.style?.padding || 8,
          textWrap: node.style?.textWrap || 'wrap',
          textMaxWidth: node.style?.textMaxWidth || 200,
          textOutlineColor: node.style?.textOutlineColor || 'transparent',
          textOutlineWidth: node.style?.textOutlineWidth || 0,
          fontWeight: node.style?.fontWeight || 'normal',
          fontStyle: node.style?.fontStyle || 'normal',
          textDecoration: node.style?.textDecoration || 'none',
          textTransform: node.style?.textTransform || 'none',
          lineHeight: node.style?.lineHeight || 1,
          textMarginY: node.style?.textMarginY || 0,
          textMarginX: node.style?.textMarginX || 0,
        }
        
        element = cy.add({
          group: 'nodes',
          data: nodeData,
          position: { x: node.x, y: node.y },
        })
      } else {
        // Update existing node
        element.position({ x: node.x, y: node.y })
        element.data({
          ...element.data(),
          label: node.value,
          width: node.width,
          height: node.height,
        })
      }
      
      existingNodeIds.add(node.id)
    })

    // Update edges
    diagram.edges.forEach((edge) => {
      let element = cy.getElementById(edge.id)
      
      if (element.empty()) {
        // Create new edge
        const edgeData = {
          id: edge.id,
          label: edge.style?.label || '',
          arrowShape: edge.style?.arrowShape || 'triangle',
          curveStyle: edge.style?.curveStyle || 'bezier',
          textBackgroundOpacity: edge.style?.textBackgroundOpacity || 0,
          textBackgroundColor: edge.style?.textBackgroundColor || 'transparent',
          textBackgroundShape: edge.style?.textBackgroundShape || 'round-rectangle',
          lineStyle: edge.style?.lineStyle || 'solid',
          lineCap: edge.style?.lineCap || 'round',
          lineJoin: edge.style?.lineJoin || 'round',
          opacity: edge.style?.opacity || 1,
          zIndex: edge.style?.zIndex || 0,
          arrowScale: edge.style?.arrowScale || 1,
        }
        
        element = cy.add({
          group: 'edges',
          data: {
            ...edgeData,
            source: edge.source,
            target: edge.target,
          },
        })
      } else {
        // Update existing edge
        element.data({
          ...element.data(),
          source: edge.source,
          target: edge.target,
        })
      }
      
      existingEdgeIds.add(edge.id)
    })

    // Remove deleted elements
    cy.nodes().forEach((node) => {
      if (!existingNodeIds.has(node.id())) {
        node.remove()
      }
    })

    cy.edges().forEach((edge) => {
      if (!existingEdgeIds.has(edge.id())) {
        edge.remove()
      }
    })

    // Update selection
    if (diagram.selection.cells.length > 0) {
      const selectedElements = cy.collection()
      diagram.selection.cells.forEach((id) => {
        const element = cy.getElementById(id)
        if (!element.empty()) {
          selectedElements.merge(element)
        }
      })
      cy.$(':selected').unselect()
      selectedElements.select()
    } else {
      cy.$(':selected').unselect()
    }

    // Update viewport
    cy.zoom(diagram.viewport.scale)
    cy.pan({
      x: diagram.viewport.translateX,
      y: diagram.viewport.translateY,
    })

    // Update grid visibility
    if (diagram.settings.showGrid) {
      cy.style().selector('.grid').style({
        'background-image': `linear-gradient(to right, hsl(var(--graph-grid)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--graph-grid)) 1px, transparent 1px)`,
        'background-size': `${diagram.settings.gridSize}px ${diagram.settings.gridSize}px`,
      }).update()
    } else {
      cy.style().selector('.grid').style({
        'background-image': 'none',
      }).update()
    }
  }, [diagram, isInitialized])

  // Helper function to convert style to cytoscape shape
  const getShapeFromStyle = (style: Record<string, any> = {}) => {
    switch (style.shape) {
      case 'ellipse':
      case 'circle':
        return 'ellipse'
      case 'diamond':
      case 'rhombus':
        return 'diamond'
      case 'triangle':
        return 'triangle'
      case 'hexagon':
        return 'hexagon'
      case 'octagon':
        return 'octagon'
      case 'star':
        return 'star'
      case 'polygon':
        return 'polygon'
      default:
        return 'rectangle'
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!cyRef.current) return

      // Delete selected cells
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (diagram.selection.cells.length > 0) {
          const cy = cyRef.current
          const selected = cy.$(':selected')
          selected.forEach((element) => {
            if (element.isNode()) {
              deleteNode(element.id())
            } else if (element.isEdge()) {
              // deleteEdge(element.id())
            }
          })
        }
      }

      // Zoom shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault()
            zoomIn()
            break
          case '-':
            event.preventDefault()
            zoomOut()
            break
          case '0':
            event.preventDefault()
            resetZoom()
            break
          case 'a':
            event.preventDefault()
            // selectAll()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [diagram.selection.cells, zoomIn, zoomOut, resetZoom, deleteNode])

  return (
    <div className={cn('graph-workspace', className)}>
      <div
        ref={containerRef}
        className="graph-canvas w-full h-full"
        style={{
          backgroundColor: 'hsl(var(--graph-workspace))',
        }}
      />
    </div>
  )
}