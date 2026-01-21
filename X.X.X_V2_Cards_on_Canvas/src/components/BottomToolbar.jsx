import { createPortal } from 'react-dom'
import { MousePointer2, ImagePlus } from 'lucide-react'

function BottomToolbar({ onAddImage }) {
  const toolbarContent = (
    <div 
      className="fixed bottom-6 left-1/2 z-50"
      style={{
        transform: 'translate(-50%, 0)',
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        zIndex: 9999,
        isolation: 'isolate',
        pointerEvents: 'auto'
      }}
    >
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-2">
        {/* Add Image Button */}
        <button
          onClick={onAddImage}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Add Image"
          title="Add Image"
        >
          <ImagePlus size={20} />
        </button>
      </div>
    </div>
  )

  // Render to document.body using portal to avoid transform inheritance
  if (typeof document !== 'undefined') {
    return createPortal(toolbarContent, document.body)
  }
  return toolbarContent
}

export default BottomToolbar

