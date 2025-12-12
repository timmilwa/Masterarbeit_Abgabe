import { Brain, Merge, Download, Upload } from 'lucide-react'

function Toolbar({ reflectionMode, onReflectionModeToggle, onMerge, onExport, onAddImage }) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
        {/* Add Image Button */}
        <button
          onClick={onAddImage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          aria-label="Add Image"
        >
          <Upload size={18} />
          <span className="font-medium">Add Image</span>
        </button>

        {/* Reflection Mode Button */}
        <button
          onClick={onReflectionModeToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            reflectionMode
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Toggle Reflection Mode"
        >
          <Brain size={18} />
          <span className="font-medium">Reflection Mode</span>
          {reflectionMode && (
            <span className="ml-1 w-2 h-2 bg-white rounded-full"></span>
          )}
        </button>

        {/* Merge Button */}
        <button
          onClick={onMerge}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          aria-label="Merge"
        >
          <Merge size={18} />
          <span className="font-medium">Merge</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          aria-label="Export"
        >
          <Download size={18} />
          <span className="font-medium">Export</span>
        </button>
      </div>
    </div>
  )
}

export default Toolbar
