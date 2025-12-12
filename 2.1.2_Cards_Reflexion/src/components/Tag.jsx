import { useState, useRef, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'

function Tag({ tag, isActive, isHovered, onTextChange, onSave, onDelete, onClick, onHover, onHoverEnd, imageRef, currentLayerIndex, activeTagId }) {
  const isPending = !tag.saved
  // Show input when tag is active OR hovered
  const shouldShowInput = isActive || isHovered
  // Only show input when tag is active
  const [isEditing, setIsEditing] = useState(isActive && isPending)
  const [text, setText] = useState(tag.text || '')
  const [inputWidth, setInputWidth] = useState(120)
  const [isHoveringTextField, setIsHoveringTextField] = useState(false)
  const inputRef = useRef(null)
  const measureRef = useRef(null)
  const tagRef = useRef(null)
  const textFieldRef = useRef(null)

  // Update editing state when active state changes
  useEffect(() => {
    if (isActive) {
      setIsEditing(isPending)
    } else {
      setIsEditing(false)
    }
  }, [isActive, isPending])

  // Reset text field hover when tag loses hover
  useEffect(() => {
    if (!isHovered && !isActive) {
      setIsHoveringTextField(false)
    }
  }, [isHovered, isActive])

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
    
    // Measure text width to adjust input width
    if (measureRef.current) {
      measureRef.current.textContent = newText || 'Add a comment...'
      const width = Math.max(120, Math.min(350, measureRef.current.offsetWidth + 40))
      setInputWidth(width)
    }
  }

  // Sync text from tag prop
  useEffect(() => {
    setText(tag.text || '')
  }, [tag.text])

  useEffect(() => {
    // Update width when text changes (including from props)
    if (measureRef.current) {
      const measureText = text || 'Add a comment...'
      measureRef.current.textContent = measureText
      const width = Math.max(120, Math.min(350, measureRef.current.offsetWidth + 40))
      setInputWidth(width)
    }
  }, [text])

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

  // Determine if input should be on left or right side of pin
  const isInputOnLeft = tag.x > 60
  
  // Calculate total width of overlapping circles
  // Each circle is 24px (w-6), and they overlap by 8px each (-ml-2)
  // Base circle (blue): 24px
  // Additional circles add: 24px - 8px = 16px each
  const hasYellowCircle = tag.dataLayerResponses?.completed
  const hasVioletCircle = tag.valuesLayerResponses?.completed
  const circleCount = 1 + (hasYellowCircle ? 1 : 0) + (hasVioletCircle ? 1 : 0)
  const totalCircleWidth = 24 + (circleCount - 1) * 16 // 24px base + 16px per additional circle
  // The circles flex container starts at the center of the tag container
  // The rightmost edge of circles is at: center + (totalCircleWidth / 2)
  // But since input uses 'left' from tag container edge, and tag is centered,
  // we need: (totalCircleWidth / 2) + gap from center
  // Increased gap to ensure no overlap
  const inputOffset = totalCircleWidth / 2 + 32 // Half circle group width + 32px gap

  const hoverTimeoutRef = useRef(null)

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (onHover) {
      onHover(tag.id)
    }
  }

  const handleMouseLeave = (e) => {
    // Check if we're moving to a child element within the tag container
    const relatedTarget = e.relatedTarget
    if (relatedTarget && tagRef.current?.contains(relatedTarget)) {
      // Moving to a child element (pin or input field), don't hide
      // But reset text field hover if moving away from text field
      if (!textFieldRef.current?.contains(relatedTarget)) {
        setIsHoveringTextField(false)
      }
      return
    }
    
    // Small delay to allow smooth transition between pin and input field
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringTextField(false)
      if (onHoverEnd) {
        onHoverEnd()
      }
    }, 150)
  }

  const handleTextFieldMouseEnter = () => {
    setIsHoveringTextField(true)
    // Clear any pending hide timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const handleTextFieldMouseLeave = (e) => {
    // Check if we're moving to the pin or another part of the tag
    const relatedTarget = e.relatedTarget
    if (relatedTarget && tagRef.current?.contains(relatedTarget)) {
      // Still within tag container, just not over text field
      setIsHoveringTextField(false)
      return
    }
    
    setIsHoveringTextField(false)
    // Small delay before hiding hover state
    hoverTimeoutRef.current = setTimeout(() => {
      if (onHoverEnd) {
        onHoverEnd()
      }
    }, 150)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Determine if this tag should have reduced opacity
  // When Consequences (index 2) is active and a pin is selected, reduce opacity of non-active pins to 30%
  const shouldReduceOpacity = currentLayerIndex === 2 && activeTagId !== null && !isActive

  return (
    <div
      ref={tagRef}
      data-tag-container
      className="absolute transition-opacity duration-300"
      style={{
        left: `${tag.x}%`,
        top: `${tag.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        opacity: shouldReduceOpacity ? 0.3 : 1,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pin Circles - Blue (Functional), Yellow (Consequences), and Violet (Values) */}
      <div className="relative flex items-center">
        {/* Blue Circle - Functional Layer (bottom layer) */}
        <div
          onClick={handlePinClick}
          className="w-6 h-6 rounded-full bg-[#007AFF] border-2 border-white cursor-pointer shadow-lg relative z-0"
          style={{
            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        />
        {/* Yellow Circle - Consequences (middle layer, only shown when completed) */}
        {tag.dataLayerResponses?.completed && (
          <div
            onClick={handlePinClick}
            className="w-6 h-6 rounded-full bg-[#AA8302] border-2 border-white cursor-pointer shadow-lg relative -ml-2 z-5"
            style={{
              boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          />
        )}
        {/* Violet Circle - Values (top layer, only shown when completed) */}
        {tag.valuesLayerResponses?.completed && (
          <div
            onClick={handlePinClick}
            className="w-6 h-6 rounded-full bg-[#8B5CF6] border-2 border-white cursor-pointer shadow-lg relative -ml-2 z-10"
            style={{
              boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          />
        )}
        
        {/* Text Input Box - Show when active OR hovered */}
        {shouldShowInput && (
          <div
            ref={textFieldRef}
            className="absolute whitespace-nowrap"
            style={{
              [isInputOnLeft ? 'right' : 'left']: `${inputOffset}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            onMouseEnter={handleTextFieldMouseEnter}
            onMouseLeave={handleTextFieldMouseLeave}
          >
            <div 
              className={`bg-white/90 backdrop-blur-md rounded-full border border-[#007AFF]/30 shadow-lg inline-flex items-center gap-2 relative transition-all duration-200 ease-in-out`} 
              style={{ 
                minHeight: '36px', 
                height: '36px', 
                paddingTop: '6px', 
                paddingBottom: '6px', 
                paddingLeft: '12px', 
                paddingRight: ((isPending && isEditing) || (isHoveringTextField && !isPending)) ? '6px' : '12px'
              }}
            >
            {/* Hidden span to measure text width */}
            <span
              ref={measureRef}
              className="absolute invisible text-sm text-[#007AFF] whitespace-pre"
              style={{ 
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                lineHeight: 'inherit',
                padding: 0,
                visibility: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
            {isEditing ? (
              <div className="flex items-center gap-2" style={{ height: '100%' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment..."
                  className="text-sm text-[#007AFF] bg-transparent border-0 outline-none focus:outline-none p-0"
                  style={{ width: `${inputWidth}px`, minWidth: '120px', maxWidth: '350px', height: '100%', lineHeight: '1' }}
                  onClick={(e) => e.stopPropagation()}
                />
                {isPending && (
                  <button
                    onClick={handleSave}
                    onMouseDown={handleSaveMouseDown}
                    disabled={!text.trim()}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#007AFF] hover:bg-[#007AFF]/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Save tag"
                  >
                    <Plus size={16} className="text-white" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2" style={{ height: '100%' }}>
                <p className="text-sm text-[#007AFF] leading-none flex items-center" style={{ height: '100%' }}>
                  {text || 'Add a comment...'}
                </p>
                {isHoveringTextField && (
                  <button
                    onClick={handleDelete}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 ease-in-out"
                    aria-label="Delete tag"
                    style={{
                      opacity: isHoveringTextField ? 1 : 0,
                      transform: isHoveringTextField ? 'scale(1)' : 'scale(0.8)'
                    }}
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                )}
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
