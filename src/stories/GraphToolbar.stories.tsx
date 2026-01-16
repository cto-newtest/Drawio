import type { Meta, StoryObj } from '@storybook/react'
import { GraphToolbar } from '@/widgets/graph/GraphToolbar'
import { useGraphStore } from '@/shared/store/graphStore'
import React from 'react'

const meta = {
  title: 'Graph/Toolbar',
  component: GraphToolbar,
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
          store.addNode({ x: 100, y: 100, value: 'Start Node' })
          store.addNode({ x: 300, y: 200, value: 'End Node' })
        }, [])
        
        return <Story />
      }
      
      return <MockGraphStore />
    },
  ],
} satisfies Meta<typeof GraphToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    className: 'w-full',
  },
}

export const SelectTool: Story = {
  args: {
    className: 'w-full',
  },
  parameters: {
    docs: {
      description: {
        story: 'Toolbar with select tool active',
      },
    },
  },
  decorators: [
    (Story) => {
      React.useEffect(() => {
        useGraphStore.getState().setSelectedTool('select')
      }, [])
      
      return <Story />
    },
  ],
}

export const AddNodeTool: Story = {
  args: {
    className: 'w-full',
  },
  decorators: [
    (Story) => {
      React.useEffect(() => {
        useGraphStore.getState().setSelectedTool('add-node')
      }, [])
      
      return <Story />
    },
  ],
}

export const WithSelection: Story = {
  args: {
    className: 'w-full',
  },
  decorators: [
    (Story) => {
      React.useEffect(() => {
        const store = useGraphStore.getState()
        const nodeId = store.addNode({ x: 150, y: 150, value: 'Selected Node' })
        store.selectCells([nodeId])
      }, [])
      
      return <Story />
    },
  ],
}