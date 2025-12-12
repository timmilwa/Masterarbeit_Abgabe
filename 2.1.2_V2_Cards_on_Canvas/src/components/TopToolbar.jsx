import { createPortal } from 'react-dom'
import { Brain, Merge, Download } from 'lucide-react'

function TopToolbar({ activeMode, onModeChange }) {
  const toolbarContent = (
    <div 
      className="fixed top-6 left-1/2 z-50"
      style={{
        transform: 'translate(-50%, 0)',
        position: 'fixed',
        top: '24px',
        left: '50%',
        zIndex: 9999,
        isolation: 'isolate',
        pointerEvents: 'auto'
      }}
    >
      <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg p-1">
        {/* Segmented Switch: Reflection, Merge, Export */}
        <div className="flex items-center bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => onModeChange('reflection')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeMode === 'reflection'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Reflection Mode"
          >
            <Brain size={16} />
            <span className="font-medium text-sm">Reflection</span>
          </button>
          
          <button
            onClick={() => onModeChange('merge')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeMode === 'merge'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Merge"
          >
            <Merge size={16} />
            <span className="font-medium text-sm">Merge</span>
          </button>
          
          <button
            onClick={() => onModeChange('export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeMode === 'export'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Export"
          >
            <Download size={16} />
            <span className="font-medium text-sm">Export</span>
          </button>
        </div>
      </div>
    </div>
  )

  // Render to document.body using portal to avoid transform inheritance
  if (typeof document !== 'undefined') {
    return createPortal(toolbarContent, document.body)
  }
  return toolbarContent
}

export default TopToolbar
