/// <reference types="vite/client" />

declare module 'cytoscape' {
  export interface CytoscapeOptions {
    container: HTMLElement
    elements?: any[]
    style?: any[]
    layout?: any
    wheelSensitivity?: number
    userZoomingEnabled?: boolean
    userPanningEnabled?: boolean
    boxSelectionEnabled?: boolean
    autoungrabify?: boolean
    autolock?: boolean
    autounselectify?: boolean
  }

  export interface NodeSingular {
    id(): string
    data(key?: string): any
    position(): { x: number; y: number }
    position(pos: { x: number; y: number }): NodeSingular
    selected(): boolean
    select(): NodeSingular
    unselect(): NodeSingular
    remove(): NodeSingular
    addClass(className: string): NodeSingular
    removeClass(className: string): NodeSingular
    hasClass(className: string): boolean
    style(propertyName: string): any
    style(propertyName: string, value: any): NodeSingular
  }

  export interface EdgeSingular {
    id(): string
    data(key?: string): any
    source(): NodeSingular
    target(): NodeSingular
    selected(): boolean
    select(): EdgeSingular
    unselect(): EdgeSingular
    remove(): EdgeSingular
    addClass(className: string): EdgeSingular
    removeClass(className: string): EdgeSingular
    hasClass(className: string): boolean
    style(propertyName: string): any
    style(propertyName: string, value: any): EdgeSingular
  }

  export interface ElementCollection {
    length: number
    [index: number]: NodeSingular | EdgeSingular
    ids(): string[]
    addClass(className: string): ElementCollection
    removeClass(className: string): ElementCollection
    hasClass(className: string): boolean
    remove(): ElementCollection
    position(): { x: number; y: number }
    positions(pos: { x: number; y: number }): ElementCollection
    style(propertyName: string): any
    style(propertyName: string, value: any): ElementCollection
    select(): ElementCollection
    unselect(): ElementCollection
    selected(): boolean
  }

  export interface Core {
    add(elements: any[]): ElementCollection
    remove(elements: any[]): ElementCollection
    getElementById(id: string): NodeSingular | EdgeSingular | null
    nodes(): ElementCollection
    edges(): ElementCollection
    elementById(id: string): NodeSingular | EdgeSingular | null
    cyCanvas(): any
    fit(elements?: ElementCollection, padding?: number): Core
    center(elements?: ElementCollection): Core
    zoom(): number
    zoom(level: number): Core
    pan(): { x: number; y: number }
    panTo(elements?: ElementCollection): Core
    panBy(delta: { x: number; y: number }): Core
    reset(): Core
    destroy(): void
    resize(): Core
    on(event: string, selector: string | null, handler: (event: any) => void): Core
    off(event: string, selector: string | null, handler: (event: any) => void): Core
    one(event: string, selector: string | null, handler: (event: any) => void): Core
    batch(collOrFn: ElementCollection | (() => void)): Core
    startBatch(): Core
    endBatch(): Core
    collection(elements?: any[]): ElementCollection
    getElementById(id: string): NodeSingular | EdgeSingular
    $(selector?: string): ElementCollection
    elements(selector?: string): ElementCollection
  }

  export default function cytoscape(options: CytoscapeOptions): Core
}