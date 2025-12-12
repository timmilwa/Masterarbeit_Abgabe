import { Upload } from 'lucide-react'
import { useRef } from 'react'

function EmptyState({ onImageUpload }) {
  const fileInputRef = useRef(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-lg bg-muted mb-4">
          <Upload className="w-12 h-12 text-foreground/40" />
        </div>
        <h2 className="text-2xl font-medium text-foreground">
          Upload an image to get started
        </h2>
        <p className="text-base text-foreground/60 max-w-md mx-auto">
          Select an image file to begin exploring
        </p>
        <button
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-all duration-200 hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <Upload className="w-4 h-4" />
          Choose Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}

export default EmptyState







