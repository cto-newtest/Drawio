import React, { useEffect } from 'react'
import { GraphCanvas } from '@/entities/graph/GraphCanvas'
import { GraphToolbar } from '@/widgets/graph/GraphToolbar'
import { GraphProperties } from '@/widgets/graph/GraphProperties'
import { useGraphStore } from '@/shared/store/graphStore'
import { cn } from '@/shared/lib/utils'

const GraphPage: React.FC = () => {
  const { diagram, undo, redo } = useGraphStore()

  // Global keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      // Ctrl+Shift+Z or Ctrl+Y or Cmd+Shift+Z for redo
      else if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo])

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-foreground">
              {diagram.metadata.name}
            </h1>
            <div className="text-sm text-muted-foreground">
              Modified: {new Date(diagram.metadata.modified).toLocaleString()}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                // TODO: Implement theme toggle
                document.documentElement.classList.toggle('dark')
              }}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Toggle Theme
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border bg-card p-2">
        <GraphToolbar className="w-full" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <GraphCanvas className="w-full h-full" />
          
          {/* Minimap */}
          {diagram.settings.showMinimap && (
            <div className="graph-minimap">
              <div className="w-full h-full bg-muted/20 border-2 border-primary/50 rounded" />
              {/* TODO: Implement minimap viewport */}
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {diagram.settings.showProperties && (
          <div className="flex-shrink-0 w-80 border-l border-border">
            <GraphProperties className="w-full h-full" />
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphPage