import React from 'react'
import { GraphCanvas } from '@/entities/graph/GraphCanvas'
import { GraphToolbar } from '@/widgets/graph/GraphToolbar'
import { GraphProperties } from '@/widgets/graph/GraphProperties'
import { useGraphStore } from '@/shared/store/graphStore'

const GraphPage: React.FC = () => {
  const { diagram } = useGraphStore()
  
  // Note: Keyboard shortcuts for Undo/Redo, Zoom, and other operations
  // are handled in GraphCanvas.tsx to avoid conflicts and ensure proper scope

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