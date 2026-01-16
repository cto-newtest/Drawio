import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface GraphNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  value: string
  style: Record<string, any>
  vertex: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  style: Record<string, any>
  edge: boolean
}

export interface GraphViewport {
  scale: number
  translateX: number
  translateY: number
}

export interface GraphSelection {
  cells: string[]
}

export interface GraphTheme {
  name: string
  colors: {
    background: string
    grid: string
    node: {
      selected: string
      default: string
      hover: string
    }
    edge: {
      selected: string
      default: string
      hover: string
    }
  }
  styles: {
    node: Record<string, any>
    edge: Record<string, any>
  }
}

export interface GraphHistory {
  canUndo: boolean
  canRedo: boolean
  maxHistory: number
}

export interface GraphSettings {
  showGrid: boolean
  showMinimap: boolean
  showProperties: boolean
  snapToGrid: boolean
  gridSize: number
  theme: string
  autoSave: boolean
  autoSaveInterval: number
}

export interface GraphDiagram {
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport: GraphViewport
  selection: GraphSelection
  history: GraphHistory
  settings: GraphSettings
  themes: Record<string, GraphTheme>
  metadata: {
    name: string
    created: string
    modified: string
    version: string
  }
}

interface GraphStore {
  // State
  diagram: GraphDiagram
  selectedTool: string
  isLoading: boolean
  error: string | null
  
  // Actions
  // Node actions
  addNode: (node: Partial<GraphNode>) => string
  updateNode: (id: string, updates: Partial<GraphNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string) => void
  
  // Edge actions
  addEdge: (edge: Partial<GraphEdge>) => string
  updateEdge: (id: string, updates: Partial<GraphEdge>) => void
  deleteEdge: (id: string) => void
  
  // Selection actions
  selectCells: (cellIds: string[]) => void
  clearSelection: () => void
  selectAll: () => void
  
  // Viewport actions
  setViewport: (viewport: Partial<GraphViewport>) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  resetZoom: () => void
  
  // Settings actions
  updateSettings: (settings: Partial<GraphSettings>) => void
  setShowGrid: (show: boolean) => void
  setShowMinimap: (show: boolean) => void
  setShowProperties: (show: boolean) => void
  setSnapToGrid: (snap: boolean) => void
  
  // Theme actions
  setTheme: (themeName: string) => void
  addTheme: (name: string, theme: GraphTheme) => void
  
  // History actions
  undo: () => void
  redo: () => void
  
  // Diagram actions
  loadDiagram: (diagram: GraphDiagram) => void
  exportDiagram: () => GraphDiagram
  clearDiagram: () => void
  
  // UI actions
  setSelectedTool: (tool: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Utilities
  getSelectedCells: () => GraphNode[]
  getCellById: (id: string) => GraphNode | GraphEdge | null
  findPath: (fromId: string, toId: string) => string[]
}

const defaultTheme: GraphTheme = {
  name: 'default',
  colors: {
    background: 'hsl(var(--graph-workspace))',
    grid: 'hsl(var(--graph-grid))',
    node: {
      selected: 'hsl(var(--graph-node-selected))',
      default: 'hsl(var(--graph-node-default))',
      hover: 'hsl(var(--graph-node-hover))',
    },
    edge: {
      selected: 'hsl(var(--graph-edge-selected))',
      default: 'hsl(var(--graph-edge-default))',
      hover: 'hsl(var(--graph-edge-hover))',
    },
  },
  styles: {
    node: {
      shape: 'rectangle',
      rounded: true,
      shadow: true,
    },
    edge: {
      arrow: true,
      curved: false,
      dashed: false,
    },
  },
}

const defaultDiagram: GraphDiagram = {
  nodes: [],
  edges: [],
  viewport: {
    scale: 1,
    translateX: 0,
    translateY: 0,
  },
  selection: {
    cells: [],
  },
  history: {
    canUndo: false,
    canRedo: false,
    maxHistory: 50,
  },
  settings: {
    showGrid: true,
    showMinimap: true,
    showProperties: true,
    snapToGrid: false,
    gridSize: 20,
    theme: 'default',
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
  },
  themes: {
    default: defaultTheme,
  },
  metadata: {
    name: 'Untitled Diagram',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: '1.0.0',
  },
}

export const useGraphStore = create<GraphStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      diagram: defaultDiagram,
      selectedTool: 'select',
      isLoading: false,
      error: null,
      
      // Node actions
      addNode: (node) => {
        const id = uuidv4()
        const newNode: GraphNode = {
          id,
          x: node.x ?? 100,
          y: node.y ?? 100,
          width: node.width ?? 120,
          height: node.height ?? 60,
          value: node.value ?? 'Node',
          style: node.style ?? {},
          vertex: true,
        }
        
        set((state) => ({
          diagram: {
            ...state.diagram,
            nodes: [...state.diagram.nodes, newNode],
            metadata: {
              ...state.diagram.metadata,
              modified: new Date().toISOString(),
            },
          },
        }))
        
        return id
      },
      
      updateNode: (id, updates) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            nodes: state.diagram.nodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
            metadata: {
              ...state.diagram.metadata,
              modified: new Date().toISOString(),
            },
          },
        }))
      },
      
      deleteNode: (id) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            nodes: state.diagram.nodes.filter((node) => node.id !== id),
            edges: state.diagram.edges.filter(
              (edge) => edge.source !== id && edge.target !== id
            ),
            selection: {
              ...state.diagram.selection,
              cells: state.diagram.selection.cells.filter((cellId) => cellId !== id),
            },
            metadata: {
              ...state.diagram.metadata,
              modified: new Date().toISOString(),
            },
          },
        }))
      },
      
      selectNode: (id) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            selection: {
              ...state.diagram.selection,
              cells: [id],
            },
          },
        }))
      },
      
      // Edge actions
      addEdge: (edge) => {
        const id = uuidv4()
        const newEdge: GraphEdge = {
          id,
          source: edge.source!,
          target: edge.target!,
          style: edge.style ?? {},
          edge: true,
        }
        
        set((state) => ({
          diagram: {
            ...state.diagram,
            edges: [...state.diagram.edges, newEdge],
            metadata: {
              ...state.diagram.metadata,
              modified: new Date().toISOString(),
            },
          },
        }))
        
        return id
      },
      
      updateEdge: (id, updates) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            edges: state.diagram.edges.map((edge) =>
              edge.id === id ? { ...edge, ...updates } : edge
            ),
            metadata: {
              ...state.diagram.metadata,
              modified: new Date().toISOString(),
            },
          },
        }))
      },
      
      deleteEdge: (id) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            edges: state.diagram.edges.filter((edge) => edge.id !== id),
            selection: {
              ...state.diagram.selection,
              cells: state.diagram.selection.cells.filter((cellId) => cellId !== id),
            },
            metadata: {
              ...state.diagram.metadata,
              modified: new Date().toISOString(),
            },
          },
        }))
      },
      
      // Selection actions
      selectCells: (cellIds) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            selection: {
              ...state.diagram.selection,
              cells: cellIds,
            },
          },
        }))
      },
      
      clearSelection: () => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            selection: {
              ...state.diagram.selection,
              cells: [],
            },
          },
        }))
      },
      
      selectAll: () => {
        const state = get()
        const allCellIds = [
          ...state.diagram.nodes.map((node) => node.id),
          ...state.diagram.edges.map((edge) => edge.id),
        ]
        
        set((state) => ({
          diagram: {
            ...state.diagram,
            selection: {
              ...state.diagram.selection,
              cells: allCellIds,
            },
          },
        }))
      },
      
      // Viewport actions
      setViewport: (viewport) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            viewport: {
              ...state.diagram.viewport,
              ...viewport,
            },
          },
        }))
      },
      
      zoomIn: () => {
        const state = get()
        const newScale = Math.min(state.diagram.viewport.scale * 1.2, 5)
        get().setViewport({ scale: newScale })
      },
      
      zoomOut: () => {
        const state = get()
        const newScale = Math.max(state.diagram.viewport.scale / 1.2, 0.1)
        get().setViewport({ scale: newScale })
      },
      
      zoomToFit: () => {
        const state = get()
        const { nodes } = state.diagram
        
        if (nodes.length === 0) return
        
        const bounds = nodes.reduce(
          (acc, node) => ({
            minX: Math.min(acc.minX, node.x),
            minY: Math.min(acc.minY, node.y),
            maxX: Math.max(acc.maxX, node.x + node.width),
            maxY: Math.max(acc.maxY, node.y + node.height),
          }),
          { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
        )
        
        const containerWidth = window.innerWidth - 400 // Account for sidebar
        const containerHeight = window.innerHeight - 200 // Account for toolbar
        
        const contentWidth = bounds.maxX - bounds.minX + 100
        const contentHeight = bounds.maxY - bounds.minY + 100
        
        const scaleX = containerWidth / contentWidth
        const scaleY = containerHeight / contentHeight
        const newScale = Math.min(scaleX, scaleY, 1)
        
        const centerX = (bounds.minX + bounds.maxX) / 2
        const centerY = (bounds.minY + bounds.maxY) / 2
        
        get().setViewport({
          scale: newScale,
          translateX: containerWidth / 2 - centerX * newScale,
          translateY: containerHeight / 2 - centerY * newScale,
        })
      },
      
      resetZoom: () => {
        get().setViewport({
          scale: 1,
          translateX: 0,
          translateY: 0,
        })
      },
      
      // Settings actions
      updateSettings: (settings) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            settings: {
              ...state.diagram.settings,
              ...settings,
            },
          },
        }))
      },
      
      setShowGrid: (show) => {
        get().updateSettings({ showGrid: show })
      },
      
      setShowMinimap: (show) => {
        get().updateSettings({ showMinimap: show })
      },
      
      setShowProperties: (show) => {
        get().updateSettings({ showProperties: show })
      },
      
      setSnapToGrid: (snap) => {
        get().updateSettings({ snapToGrid: snap })
      },
      
      // Theme actions
      setTheme: (themeName) => {
        const state = get()
        if (state.diagram.themes[themeName]) {
          get().updateSettings({ theme: themeName })
        }
      },
      
      addTheme: (name, theme) => {
        set((state) => ({
          diagram: {
            ...state.diagram,
            themes: {
              ...state.diagram.themes,
              [name]: theme,
            },
          },
        }))
      },
      
      // History actions
      undo: () => {
        // TODO: Implement history management
        console.log('Undo not implemented yet')
      },
      
      redo: () => {
        // TODO: Implement history management
        console.log('Redo not implemented yet')
      },
      
      // Diagram actions
      loadDiagram: (diagram) => {
        set(() => ({
          diagram,
        }))
      },
      
      exportDiagram: () => {
        return get().diagram
      },
      
      clearDiagram: () => {
        set(() => ({
          diagram: {
            ...defaultDiagram,
            metadata: {
              ...defaultDiagram.metadata,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
            },
          },
        }))
      },
      
      // UI actions
      setSelectedTool: (tool) => {
        set(() => ({
          selectedTool: tool,
        }))
      },
      
      setLoading: (loading) => {
        set(() => ({
          isLoading: loading,
        }))
      },
      
      setError: (error) => {
        set(() => ({
          error,
        }))
      },
      
      // Utilities
      getSelectedCells: () => {
        const state = get()
        return state.diagram.nodes.filter((node) =>
          state.diagram.selection.cells.includes(node.id)
        )
      },
      
      getCellById: (id) => {
        const state = get()
        return (
          state.diagram.nodes.find((node) => node.id === id) ||
          state.diagram.edges.find((edge) => edge.id === id) ||
          null
        )
      },
      
      findPath: (fromId, toId) => {
        // TODO: Implement pathfinding algorithm
        return []
      },
    }))
  )
)