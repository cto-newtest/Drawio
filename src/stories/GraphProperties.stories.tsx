import type { Meta, StoryObj } from '@storybook/react'
import { GraphProperties } from '@/widgets/graph/GraphProperties'
import { useGraphStore } from '@/shared/store/graphStore'
import React from 'react'

const meta = {
  title: 'Graph/Properties',
  component: GraphProperties,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // Create a mock store for storybook
      const MockGraphStore = () => {
        React.useEffect(() => {
          // Initialize store with some mock data
          const store = useGraphStore.getState()
          const nodeId = store.addNode({ 
            x: 100, 
            y: 100, 
            value: 'Test Node',
            width: 150,
            height: 80,
            style: {
              fillColor: '#f0f9ff',
              strokeColor: '#0ea5e9',
              fontSize: 14,
              fontFamily: 'Inter',
              fontWeight: 'bold',
            }
          })
          store.selectCells([nodeId])
        }, [])
        
        return <Story />
      }
      
      return <MockGraphStore />
    },
  ],
} satisfies Meta<typeof GraphProperties>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    className: 'w-80 h-96',
  },
}

export const NoSelection: Story = {
  args: {
    className: 'w-80 h-96',
  },
  decorators: [
    (Story) => {
      React.useEffect(() => {
        useGraphStore.getState().clearSelection()
      }, [])
      
      return <Story />
    },
  ],
}

export const WithNodeSelected: Story = {
  args: {
    className: 'w-80 h-96',
  },
  decorators: [
    (Story) => {
      React.useEffect(() => {
        const store = useGraphStore.getState()
        const nodeId = store.addNode({ 
          x: 200, 
          y: 150, 
          value: 'Selected Node',
          width: 120,
          height: 60,
          style: {
            fillColor: '#fef3c7',
            strokeColor: '#f59e0b',
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            rotation: 15,
          }
        })
        store.selectCells([nodeId])
      }, [])
      
      return <Story />
    },
  ],
}

export const DarkTheme: Story = {
  args: {
    className: 'w-80 h-96',
  },
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
        const nodeId = store.addNode({ 
          x: 100, 
          y: 100, 
          value: 'Dark Theme Node',
          style: {
            fillColor: '#1f2937',
            strokeColor: '#3b82f6',
          }
        })
        store.selectCells([nodeId])
      }, [])
      
      return (
        <div className="dark">
          <div className="min-h-screen bg-background text-foreground">
            <Story />
          </div>
        </div>
      )
    },
  ],
}