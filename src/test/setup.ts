import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock cytoscape
vi.mock('cytoscape', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      getElementById: vi.fn().mockReturnValue({ empty: () => true }),
      nodes: vi.fn().mockReturnValue({ forEach: vi.fn() }),
      edges: vi.fn().mockReturnValue({ forEach: vi.fn() }),
      $: vi.fn().mockReturnValue({ unselect: vi.fn(), select: vi.fn() }),
      zoom: vi.fn().mockReturnThis(),
      pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      one: vi.fn().mockReturnThis(),
      batch: vi.fn().mockReturnThis(),
      startBatch: vi.fn().mockReturnThis(),
      endBatch: vi.fn().mockReturnThis(),
      collection: vi.fn().mockReturnValue({ merge: vi.fn() }),
      elements: vi.fn().mockReturnValue({ forEach: vi.fn() }),
      fit: vi.fn().mockReturnThis(),
      center: vi.fn().mockReturnThis(),
      reset: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      resize: vi.fn().mockReturnThis(),
    })),
  }
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})