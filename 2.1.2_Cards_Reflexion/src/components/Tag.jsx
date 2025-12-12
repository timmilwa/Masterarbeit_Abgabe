import { useState, useRef, useEffect } from 'react'
import { X, Pencil, Plus } from 'lucide-react'

function Tag({ tag, isActive, onTextChange, onSave, onDelete, onClick, imageRef }) {
  const isPending = !tag.saved
  // Only show input when tag is active
  const [isEditing, setIsEditing] = useState(isActive && isPending)
  const [text, setText] = useState(tag.text || '')
  const inputRef = useRef(null)
  const tagRef = useRef(null)

  // Update editing state when active state changes
  useEffect(() => {
    if (isActive) {
      setIsEditing(isPending)
    } else {
      setIsEditing(false)
    }
  }, [isActive, isPending])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use setTimeout to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [isEditing])

  const handleTextChange = (e) => {
    const newText = e.target.value
    setText(newText)
    onTextChange(tag.id, newText)
  }

  const handleSave = (e) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (text.trim()) {
      onSave(tag.id)
      setIsEditing(false)
    }
  }

  const handlePinClick = (e) => {
    e.stopPropagation()
    if (onClick) {
      onClick(tag.id)
    }
  }

  const handleSaveMouseDown = (e) => {
    // Prevent input blur when clicking the plus button
    e.preventDefault()
  }

  const handleBlur = () => {
    if (isPending) {
      // If pending and no text, delete the tag
      if (!text.trim()) {
        onDelete(tag.id)
      }
      // If pending but has text, keep it in edit mode (user can click plus later)
    } else {
      // If saved, just exit edit mode
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && text.trim()) {
      if (isPending) {
        handleSave()
      } else {
        setIsEditing(false)
      }
    } else if (e.key === 'Escape') {
      if (isPending) {
        onDelete(tag.id)
      } else {
        setIsEditing(false)
      }
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(tag.id)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  // Determine if input should be on left or right side of pin
  const isInputOnLeft = tag.x > 60

  return (
    <div
      ref={tagRef}
      data-tag-container
      className="absolute"
      style={{
        left: `${tag.x}%`,
        top: `${tag.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pin Circle */}
      <div className="relative">
        <div
          onClick={handlePinClick}
          className="w-6 h-6 rounded-full bg-[#007AFF] border-2 border-white cursor-pointer shadow-lg"
          style={{
            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        />
        
        {/* Text Input Box - Only show when active */}
        {isActive && (
          <div
            className="absolute whitespace-nowrap"
            style={{
              [isInputOnLeft ? 'right' : 'left']: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <div className="bg-white/90 backdrop-blur-md rounded-lg border border-[#007AFF]/30 shadow-lg px-3 py-2 min-w-[200px] max-w-[300px]">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment..."
                  className="flex-1 text-sm text-[#007AFF] bg-transparent border-0 outline-none focus:outline-none p-0"
                  onClick={(e) => e.stopPropagation()}
                />
                {isPending && (
                  <button
                    onClick={handleSave}
                    onMouseDown={handleSaveMouseDown}
                    disabled={!text.trim()}
                    className="flex-shrink-0 p-1 rounded hover:bg-[#007AFF]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Save tag"
                  >
                    <Plus size={16} className="text-[#007AFF]" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 group">
                <p 
                  className="text-sm text-[#007AFF] flex-1 cursor-pointer"
                  onClick={handleEdit}
                >
                  {text || 'Add a comment...'}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleEdit}
                    className="p-1 hover:bg-[#007AFF]/10 rounded transition-colors"
                    aria-label="Edit comment"
                  >
                    <Pencil size={12} className="text-[#007AFF]" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    aria-label="Delete tag"
                  >
                    <X size={12} className="text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default Tag
