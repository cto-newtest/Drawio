import React, { useEffect } from 'react'
import { GraphCanvas } from '@/entities/graph/GraphCanvas'
import { GraphToolbar } from '@/widgets/graph/GraphToolbar'
import { GraphProperties } from '@/widgets/graph/GraphProperties'
import { useGraphStore } from '@/shared/store/graphStore'
import { cn } from '@/shared/lib/utils'

const GraphPage: React.FC = () => {
  const { diagram, undo, redo } = useGraphStore()
  
  // Global keyboard shortcuts for Undo/Redo and Zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        undo()
        return false
      }
      // Ctrl+Shift+Z or Ctrl+Y or Cmd+Shift+Z for redo
      else if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault()
        event.stopPropagation()
        redo()
        return false
      }
      // Ctrl+Plus or Cmd+Plus for zoom in
      else if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        const store = useGraphStore.getState()
        const newScale = Math.min(store.diagram.viewport.scale * 1.2, 5)
        store.setViewport({ scale: newScale })
      }
      // Ctrl+Minus or Cmd+Minus for zoom out
      else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault()
        const store = useGraphStore.getState()
        const newScale = Math.max(store.diagram.viewport.scale / 1.2, 0.1)
        store.setViewport({ scale: newScale })
      }
      // Ctrl+0 or Cmd+0 for reset zoom
      else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault()
        const store = useGraphStore.getState()
        store.setViewport({ scale: 1, translateX: 0, translateY: 0 })
      }
    }

    // Add event listener with capture to ensure it runs before other handlers
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
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