import React, { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { useGraphStore } from '@/shared/store/graphStore'
import { cn } from '@/shared/lib/utils'

interface GraphCanvasProps {
  className?: string
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<any>(null)
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
        style: [
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
              'width': 'data(width)',
              'height': 'data(height)',
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
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 1,
              'line-color': 'hsl(var(--graph-edge-default))',
              'target-arrow-color': 'hsl(var(--graph-edge-default))',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
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
        ],
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

  // Set up event handlers
  const setupEventHandlers = (cy: any) => {
    // Selection events
    cy.on('select', 'node', (event: any) => {
      const node = event.target
      selectCells([node.id()])
    })

    cy.on('select', 'edge', (event: any) => {
      const edge = event.target
      selectCells([edge.id()])
    })

    cy.on('unselect', (event: any) => {
      const selected = cy.$(':selected')
      if (selected.length === 0) {
        clearSelection()
      }
    })

    // Drag events
    cy.on('dragfree', 'node', (event: any) => {
      const node = event.target
      updateNode(node.id(), {
        x: node.position().x,
        y: node.position().y,
      })
    })

    // Tap events for adding nodes
    cy.on('tap', (event: any) => {
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
        element = cy.add({
          group: 'edges',
          data: {
            id: edge.id,
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
    cy.nodes().forEach((node: any) => {
      if (!existingNodeIds.has(node.id())) {
        node.remove()
      }
    })

    cy.edges().forEach((edge: any) => {
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
  }, [diagram, isInitialized])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!cyRef.current) return

      // Delete selected cells
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (diagram.selection.cells.length > 0) {
          const cy = cyRef.current
          const selected = cy.$(':selected')
          selected.forEach((element: any) => {
            if (element.isNode()) {
              deleteNode(element.id())
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