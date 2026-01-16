import type { Meta, StoryObj } from '@storybook/react'
import { GraphCanvas } from '@/entities/graph/GraphCanvas'
import { useGraphStore } from '@/shared/store/graphStore'
import React from 'react'

const meta = {
  title: 'Graph/Canvas',
  component: GraphCanvas,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Основной компонент canvas для работы с графами, использующий maxGraph (@maxgraph/core)',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      React.useEffect(() => {
        const store = useGraphStore.getState()
        
        // Добавляем пример узлов
        const node1Id = store.addNode({ 
          x: 150, 
          y: 100, 
          value: 'Start', 
          width: 100, 
          height: 60 
        })
        const node2Id = store.addNode({ 
          x: 350, 
          y: 150, 
          value: 'Process', 
          width: 120, 
          height: 80 
        })
        const node3Id = store.addNode({ 
          x: 550, 
          y: 200, 
          value: 'End', 
          width: 100, 
          height: 60 
        })
        
        // Добавляем пример ребер
        store.addEdge({ 
          source: node1Id, 
          target: node2Id,
          style: { arrowShape: 'triangle' }
        })
        store.addEdge({ 
          source: node2Id, 
          target: node3Id,
          style: { arrowShape: 'triangle' }
        })
        
        // Выделяем первый узел
        store.selectCells([node1Id])
      }, [])
      
      return (
        <div className="h-screen w-full">
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof GraphCanvas>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  decorators: [
    (Story) => (
      <div className="h-screen w-full">
        <Story />
      </div>
    ),
  ],
}

export const WithNodes: Story = {
  decorators: [
    (Story) => {
      React.useEffect(() => {
        const store = useGraphStore.getState()
        store.clearDiagram()
        
        const node1 = store.addNode({ 
          x: 100, 
          y: 100, 
          value: 'Node 1', 
          width: 120, 
          height: 60,
          style: { fillColor: '#e0f2fe', strokeColor: '#0284c7' }
        })
        const node2 = store.addNode({ 
          x: 300, 
          y: 200, 
          value: 'Node 2', 
          width: 120, 
          height: 60,
          style: { fillColor: '#fef3c7', strokeColor: '#f59e0b' }
        })
        const node3 = store.addNode({ 
          x: 500, 
          y: 150, 
          value: 'Node 3', 
          width: 120, 
          height: 60,
          style: { fillColor: '#dcfce7', strokeColor: '#16a34a' }
        })
        
        store.addEdge({ source: node1, target: node2 })
        store.addEdge({ source: node2, target: node3 })
      }, [])
      
      return (
        <div className="h-screen w-full">
          <Story />
        </div>
      )
    },
  ],
}

export const ComplexGraph: Story = {
  decorators: [
    (Story) => {
      React.useEffect(() => {
        const store = useGraphStore.getState()
        store.clearDiagram()
        
        // Создаем более сложный граф
        const nodes = []
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * 2 * Math.PI
          const x = 300 + Math.cos(angle) * 200
          const y = 200 + Math.sin(angle) * 150
          const nodeId = store.addNode({
            x,
            y,
            value: `Node ${i + 1}`,
            width: 100,
            height: 60,
            style: {
              fillColor: `hsl(${i * 60}, 70%, 90%)`,
              strokeColor: `hsl(${i * 60}, 70%, 50%)`,
              fontSize: 14,
              fontWeight: 'bold'
            }
          })
          nodes.push(nodeId)
        }
        
        // Создаем связи между узлами
        for (let i = 0; i < nodes.length; i++) {
          const next = (i + 1) % nodes.length
          store.addEdge({
            source: nodes[i],
            target: nodes[next],
            style: { 
              arrowShape: 'triangle',
              lineColor: `hsl(${i * 60}, 70%, 50%)`
            }
          })
        }
      }, [])
      
      return (
        <div className="h-screen w-full">
          <Story />
        </div>
      )
    },
  ],
}

export const DarkTheme: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story, context) => {
      React.useEffect(() => {
        document.documentElement.classList.add('dark')
        const store = useGraphStore.getState()
        store.clearDiagram()
        
        const node1 = store.addNode({ 
          x: 150, 
          y: 100, 
          value: 'Dark Theme', 
          width: 120, 
          height: 60,
          style: { 
            fillColor: '#374151', 
            strokeColor: '#60a5fa',
            fontColor: '#f9fafb'
          }
        })
        const node2 = store.addNode({ 
          x: 350, 
          y: 150, 
          value: 'Node', 
          width: 120, 
          height: 60,
          style: { 
            fillColor: '#1f2937', 
            strokeColor: '#3b82f6',
            fontColor: '#f3f4f6'
          }
        })
        
        store.addEdge({ 
          source: node1, 
          target: node2,
          style: { 
            arrowShape: 'triangle',
            lineColor: '#60a5fa'
          }
        })
        
        store.selectCells([node1])
      }, [])
      
      return (
        <div className="h-screen w-full dark">
          <Story />
        </div>
      )
    },
  ],
}