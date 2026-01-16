import React from 'react'
import { useGraphStore } from '@/shared/store/graphStore'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  MousePointer,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Minus,
  Type,
  Image,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Trash2,
  Save,
  FolderOpen,
  Download,
  Upload,
  Undo,
  Redo,
} from 'lucide-react'

interface GraphToolbarProps {
  className?: string
}

const tools = [
  { id: 'select', icon: MousePointer, label: 'Select' },
  { id: 'add-node', icon: Square, label: 'Rectangle' },
  { id: 'add-oval', icon: Circle, label: 'Circle' },
  { id: 'add-rhombus', icon: Triangle, label: 'Diamond' },
  { id: 'add-edge', icon: ArrowRight, label: 'Arrow' },
  { id: 'add-line', icon: Minus, label: 'Line' },
  { id: 'add-text', icon: Type, label: 'Text' },
  { id: 'add-image', icon: Image, label: 'Image' },
]

const viewTools = [
  { id: 'zoom-in', icon: ZoomIn, label: 'Zoom In', action: 'zoomIn' },
  { id: 'zoom-out', icon: ZoomOut, label: 'Zoom Out', action: 'zoomOut' },
  { id: 'reset-zoom', icon: RotateCcw, label: 'Reset Zoom', action: 'resetZoom' },
]

const fileTools = [
  { id: 'new', icon: Layers, label: 'New' },
  { id: 'open', icon: FolderOpen, label: 'Open' },
  { id: 'save', icon: Save, label: 'Save' },
  { id: 'export', icon: Download, label: 'Export' },
  { id: 'import', icon: Upload, label: 'Import' },
]

export const GraphToolbar: React.FC<GraphToolbarProps> = ({ className }) => {
  const {
    selectedTool,
    setSelectedTool,
    zoomIn,
    zoomOut,
    resetZoom,
    clearDiagram,
    exportDiagram,
    loadDiagram,
    copyCells,
    diagram,
    undo,
    redo,
  } = useGraphStore()

  const handleToolClick = (toolId: string) => {
    if (toolId === 'new') {
      if (confirm('Create new diagram? Unsaved changes will be lost.')) {
        clearDiagram()
      }
    } else if (toolId === 'save') {
      // TODO: Implement save functionality
      const diagram = exportDiagram()
      const blob = new Blob([JSON.stringify(diagram, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${diagram.metadata.name || 'diagram'}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (toolId === 'open') {
      // TODO: Implement open functionality
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const diagram = JSON.parse(e.target?.result as string)
              loadDiagram(diagram)
            } catch (error) {
              alert('Invalid diagram file')
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    } else if (viewTools.find(t => t.id === toolId)) {
      const viewTool = viewTools.find(t => t.id === toolId)!
      switch (viewTool.action) {
        case 'zoomIn':
          zoomIn()
          break
        case 'zoomOut':
          zoomOut()
          break
        case 'resetZoom':
          resetZoom()
          break
      }
    } else {
      setSelectedTool(toolId)
    }
  }

  return (
    <div className={cn('graph-toolbar flex items-center space-x-1', className)}>
      {/* File Tools */}
      <div className="flex items-center space-x-1 border-r pr-2">
        {fileTools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant="ghost"
              size="icon"
              onClick={() => handleToolClick(tool.id)}
              title={tool.label}
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>

      {/* Drawing Tools */}
      <div className="flex items-center space-x-1 border-r pr-2">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? 'default' : 'ghost'}
              size="icon"
              onClick={() => handleToolClick(tool.id)}
              title={tool.label}
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>

      {/* View Tools */}
      <div className="flex items-center space-x-1">
        {viewTools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant="ghost"
              size="icon"
              onClick={() => handleToolClick(tool.id)}
              title={
                tool.id === 'zoom-in' ? 'Zoom In (+ or Ctrl+Mouse Wheel Up)' :
                tool.id === 'zoom-out' ? 'Zoom Out (- or Ctrl+Mouse Wheel Down)' :
                tool.id === 'reset-zoom' ? 'Reset Zoom (Ctrl+0)' :
                tool.label
              }
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
        
        {/* Zoom indicator */}
        <div className="text-xs text-muted-foreground px-2 border rounded mx-1">
          {Math.round(diagram.viewport.scale * 100)}%
        </div>
      </div>

      {/* Action Tools */}
      <div className="flex items-center space-x-1 border-l pl-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => undo()}
          title="Undo (Ctrl+Z or Cmd+Z)"
          className="h-8 w-8"
          disabled={!diagram.history.canUndo}
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => redo()}
          title="Redo (Ctrl+Y, Ctrl+Shift+Z or Cmd+Y)"
          className="h-8 w-8"
          disabled={!diagram.history.canRedo}
        >
          <Redo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            copyCells()
          }}
          title="Copy (Ctrl+C)"
          className="h-8 w-8"
          disabled={diagram.selection.cells.length === 0}
        >
          <Copy className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const store = useGraphStore.getState()
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
          }}
          title="Delete Selected (Delete)"
          className="h-8 w-8"
          disabled={diagram.selection.cells.length === 0}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}