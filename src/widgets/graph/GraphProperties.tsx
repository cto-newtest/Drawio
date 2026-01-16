import React, { useState, useEffect } from 'react'
import { useGraphStore } from '@/shared/store/graphStore'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { Settings, Palette, Type, Move, Lock, Unlock } from 'lucide-react'

interface GraphPropertiesProps {
  className?: string
}

export const GraphProperties: React.FC<GraphPropertiesProps> = ({ className }) => {
  const {
    diagram,
    getSelectedCells,
    getCellById,
    updateNode,
    updateEdge,
    setTheme,
    updateSettings,
    saveHistory,
  } = useGraphStore()

  const [selectedCell, setSelectedCell] = useState<any>(null)
  const [properties, setProperties] = useState({
    value: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fillColor: '#ffffff',
    strokeColor: '#000000',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: 'normal',
    opacity: 1,
    rotation: 0,
  })

  // Update selected cell when selection changes
  useEffect(() => {
    const selectedCells = getSelectedCells()
    if (selectedCells.length === 1) {
      const cell = selectedCells[0]
      setSelectedCell(cell)
      
      // Update properties panel
      setProperties({
        value: cell.value || '',
        x: cell.x || 0,
        y: cell.y || 0,
        width: cell.width || 100,
        height: cell.height || 50,
        fillColor: cell.style?.fillColor || '#ffffff',
        strokeColor: cell.style?.strokeColor || '#000000',
        fontSize: cell.style?.fontSize || 12,
        fontFamily: cell.style?.fontFamily || 'Inter',
        fontWeight: cell.style?.fontWeight || 'normal',
        opacity: cell.style?.opacity || 1,
        rotation: cell.style?.rotation || 0,
      })
    } else {
      setSelectedCell(null)
    }
  }, [diagram.selection.cells])

  const handlePropertyChange = (key: string, value: any) => {
    setProperties((prev) => ({ ...prev, [key]: value }))
    
    if (selectedCell) {
      if (selectedCell.vertex) {
        // Update node
        const updates: any = {}
        if (['value', 'x', 'y', 'width', 'height'].includes(key)) {
          updates[key] = parseFloat(value) || value
        } else {
          updates.style = {
            ...selectedCell.style,
            [key]: value,
          }
        }
        updateNode(selectedCell.id, updates)
      } else if (selectedCell.edge) {
        // Update edge
        updateEdge(selectedCell.id, {
          style: {
            ...selectedCell.style,
            [key]: value,
          },
        })
      }
      
      // Save history for property changes
      // Note: In a real app, we might want to debounce this or only save onBlur
      saveHistory()
    }
  }

  const themes = [
    { name: 'Default', value: 'default' },
    { name: 'Dark', value: 'dark' },
    { name: 'Minimal', value: 'minimal' },
    { name: 'Colorful', value: 'colorful' },
  ]

  return (
    <div className={cn('graph-property-panel', className)}>
      <div className="space-y-6">
        {/* Settings Section */}
        <div className="graph-property-section">
          <div className="flex items-center space-x-2 mb-3">
            <Settings className="h-4 w-4" />
            <h3>Settings</h3>
          </div>
          
          <div className="space-y-3">
            <div className="graph-property-field">
              <label className="graph-property-label">Theme</label>
              <select
                value={diagram.settings.theme}
                onChange={(e) => setTheme(e.target.value)}
                className="graph-property-input"
              >
                {themes.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="graph-property-field">
              <label className="graph-property-label">Grid Size</label>
              <Input
                type="number"
                value={diagram.settings.gridSize}
                onChange={(e) =>
                  updateSettings({ gridSize: parseInt(e.target.value) || 20 })
                }
                min="5"
                max="100"
                step="5"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showGrid"
                checked={diagram.settings.showGrid}
                onChange={(e) => updateSettings({ showGrid: e.target.checked })}
              />
              <label htmlFor="showGrid" className="text-sm">Show Grid</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="snapToGrid"
                checked={diagram.settings.snapToGrid}
                onChange={(e) => updateSettings({ snapToGrid: e.target.checked })}
              />
              <label htmlFor="snapToGrid" className="text-sm">Snap to Grid</label>
            </div>
          </div>
        </div>

        {/* Element Properties */}
        {selectedCell && (
          <>
            <div className="graph-property-section">
              <div className="flex items-center space-x-2 mb-3">
                <Type className="h-4 w-4" />
                <h3>Text</h3>
              </div>
              
              <div className="space-y-3">
                <div className="graph-property-field">
                  <label className="graph-property-label">Value</label>
                  <Input
                    value={properties.value}
                    onChange={(e) => handlePropertyChange('value', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="graph-property-field">
                    <label className="graph-property-label">Font Size</label>
                    <Input
                      type="number"
                      value={properties.fontSize}
                      onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value) || 12)}
                      min="8"
                      max="72"
                    />
                  </div>
                  
                  <div className="graph-property-field">
                    <label className="graph-property-label">Font Family</label>
                    <select
                      value={properties.fontFamily}
                      onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                      className="graph-property-input"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </div>
                </div>
                
                <div className="graph-property-field">
                  <label className="graph-property-label">Font Weight</label>
                  <select
                    value={properties.fontWeight}
                    onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
                    className="graph-property-input"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="lighter">Lighter</option>
                    <option value="bolder">Bolder</option>
                  </select>
                </div>
              </div>
            </div>

            {selectedCell.vertex && (
              <div className="graph-property-section">
                <div className="flex items-center space-x-2 mb-3">
                  <Move className="h-4 w-4" />
                  <h3>Position & Size</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="graph-property-field">
                      <label className="graph-property-label">X</label>
                      <Input
                        type="number"
                        value={properties.x}
                        onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="graph-property-field">
                      <label className="graph-property-label">Y</label>
                      <Input
                        type="number"
                        value={properties.y}
                        onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="graph-property-field">
                      <label className="graph-property-label">Width</label>
                      <Input
                        type="number"
                        value={properties.width}
                        onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 100)}
                        min="10"
                      />
                    </div>
                    
                    <div className="graph-property-field">
                      <label className="graph-property-label">Height</label>
                      <Input
                        type="number"
                        value={properties.height}
                        onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 50)}
                        min="10"
                      />
                    </div>
                  </div>
                  
                  <div className="graph-property-field">
                    <label className="graph-property-label">Rotation</label>
                    <Input
                      type="number"
                      value={properties.rotation}
                      onChange={(e) => handlePropertyChange('rotation', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="360"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="graph-property-section">
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="h-4 w-4" />
                <h3>Appearance</h3>
              </div>
              
              <div className="space-y-3">
                <div className="graph-property-field">
                  <label className="graph-property-label">Fill Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={properties.fillColor}
                      onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                      className="w-8 h-8 rounded border border-input"
                    />
                    <Input
                      value={properties.fillColor}
                      onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="graph-property-field">
                  <label className="graph-property-label">Stroke Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={properties.strokeColor}
                      onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
                      className="w-8 h-8 rounded border border-input"
                    />
                    <Input
                      value={properties.strokeColor}
                      onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="graph-property-field">
                  <label className="graph-property-label">Opacity</label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={properties.opacity}
                    onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">{Math.round(properties.opacity * 100)}%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* No Selection State */}
        {!selectedCell && (
          <div className="graph-property-section">
            <div className="text-center text-muted-foreground py-8">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select an element to edit properties</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}