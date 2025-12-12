import { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import Tag from './Tag'

function CanvasImage({
  imageId,
  imageUrl,
  position,
  isSelected,
  isReflectionMode,
  tags = [],
  currentLayerIndex,
  activeTagId,
  onPositionChange,
  onSelect,
  onExitReflection,
  onImageClick,
  onTagTextChange,
  onSaveTag,
  onDeleteTag,
  onTagClick,
  onTagHover,
  onTagHoverEnd,
  imageRef,
  canvasTransform,
  activeTool
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // Convert viewport coordinates to canvas coordinates
  const viewportToCanvas = useCallback((viewportX, viewportY) => {
    // Get the canvas background element (root of canvas)
    const canvasBackground = containerRef.current?.closest('.canvas-background')
    if (!canvasBackground) return { x: 0, y: 0 }
    const canvasRect = canvasBackground.getBoundingClientRect()
    
    // Convert: (viewport - canvas offset - transform) / scale
    const x = (viewportX - canvasRect.left - canvasTransform.x) / canvasTransform.scale
    const y = (viewportY - canvasRect.top - canvasTransform.y) / canvasTransform.scale
    return { x, y }
  }, [canvasTransform])

  // Update image size when image loads
  useEffect(() => {
    if (imgRef.current) {
      const updateSize = () => {
        setImageSize({
          width: imgRef.current.naturalWidth || imgRef.current.offsetWidth,
          height: imgRef.current.naturalHeight || imgRef.current.offsetHeight
        })
      }
      
      if (imgRef.current.complete) {
        updateSize()
      } else {
        imgRef.current.addEventListener('load', updateSize)
        return () => imgRef.current?.removeEventListener('load', updateSize)
      }
    }
  }, [imageUrl])

  // Expose image ref to parent
  useEffect(() => {
    if (imageRef && imgRef.current) {
      imageRef.current = imgRef.current
    }
  }, [imageRef])

  const handleMouseDown = useCallback((e) => {
    // Don't start drag if clicking on tag or exit button
    if (e.target.closest('.canvas-tag') || 
        e.target.closest('.exit-reflection-button') ||
        e.target.closest('[data-tag-container]')) {
      return
    }

    // Hand tool: prevent all image interaction
    if (activeTool === 'hand') {
      return
    }

    // In reflection mode, clicking selects the image but doesn't drag
    if (isReflectionMode) {
      if (onSelect) {
        onSelect(imageId)
      }
      return
    }

    // Select tool: click and drag directly moves image (one-step)
    if (activeTool === 'select') {
      // Select image on click
      if (onSelect) {
        onSelect(imageId)
      }
      
      // Start dragging immediately (click and drag)
      const canvasPos = viewportToCanvas(e.clientX, e.clientY)
      setIsDragging(true)
      setDragStart({
        x: canvasPos.x - position.x,
        y: canvasPos.y - position.y
      })
      e.stopPropagation()
    }
  }, [isReflectionMode, position, imageId, onSelect, viewportToCanvas, activeTool, isSelected])

  const handleMouseMove = useCallback((e) => {
    if (isDragging && !isReflectionMode && activeTool === 'select') {
      // Convert viewport coordinates to canvas coordinates
      const canvasPos = viewportToCanvas(e.clientX, e.clientY)
      const newX = canvasPos.x - dragStart.x
      const newY = canvasPos.y - dragStart.y
      
      if (onPositionChange) {
        onPositionChange(imageId, newX, newY)
      }
    }
  }, [isDragging, dragStart, isReflectionMode, imageId, onPositionChange, viewportToCanvas, activeTool])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse move/up handlers
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => {
        handleMouseMove(e)
      }
      const handleGlobalMouseUp = () => {
        handleMouseUp()
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleImageClick = useCallback((e) => {
    // Don't handle click if clicking on tag
    if (e.target.closest('[data-tag-container]')) {
      return
    }

    if (isReflectionMode) {
      if (onSelect) {
        onSelect(imageId)
      }
    } else {
      // In normal mode, just select
      if (onSelect) {
        onSelect(imageId)
      }
    }

    // Handle tag creation on image click (only in select tool)
    if (activeTool === 'select' && onImageClick && currentLayerIndex === 1) {
      onImageClick(e, imageId)
    }
  }, [isReflectionMode, imageId, onSelect, onImageClick, currentLayerIndex, activeTool])

  const handleExitReflection = useCallback((e) => {
    e.stopPropagation()
    if (onExitReflection) {
      onExitReflection(imageId)
    }
  }, [imageId, onExitReflection])

  // Calculate image display dimensions (maintain aspect ratio, max size)
  const maxWidth = 600
  const maxHeight = 600
  // Use default dimensions if image hasn't loaded yet
  const defaultWidth = 400
  const defaultHeight = 300
  const aspectRatio = imageSize.width && imageSize.height 
    ? imageSize.width / imageSize.height 
    : defaultWidth / defaultHeight
  let displayWidth = imageSize.width && imageSize.height ? maxWidth : defaultWidth
  let displayHeight = imageSize.width && imageSize.height ? maxWidth / aspectRatio : defaultHeight

  if (imageSize.width && imageSize.height) {
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight
      displayWidth = maxHeight * aspectRatio
    }
  }

  return (
    <div
      ref={containerRef}
      className="canvas-image absolute"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        cursor: activeTool === 'hand' ? 'default' : (isDragging ? 'grabbing' : (isReflectionMode ? 'pointer' : (isSelected ? 'grab' : 'pointer'))),
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Image with optional blue border */}
      <div
        className="relative"
        style={{
          border: isSelected ? (isReflectionMode ? '4px solid #3B82F6' : '3px solid #3B82F6') : '2px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'border 0.2s ease',
          backgroundColor: '#f9fafb' // Light background to make container visible
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Canvas image"
          draggable={false}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            minWidth: `${displayWidth}px`,
            minHeight: `${displayHeight}px`,
            objectFit: 'contain',
            display: 'block',
            pointerEvents: currentLayerIndex === 1 ? 'auto' : 'none',
            backgroundColor: '#f3f4f6' // Light gray background while loading
          }}
          onClick={handleImageClick}
          onError={(e) => {
            console.error('Failed to load image:', imageUrl)
            e.target.style.display = 'none'
          }}
        />
        
        {/* Render tags on the image */}
        <div className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {tags
            .filter(tag => {
              // When value card is active (layer index 3), only show pins that have both functional and consequence pins
              if (currentLayerIndex === 3) {
                return tag.dataLayerResponses?.completed === true
              }
              return true
            })
            .map(tag => (
              <Tag
                key={tag.id}
                tag={tag}
                isActive={activeTagId === tag.id}
                isHovered={false}
                onTextChange={(id, text) => onTagTextChange(imageId, id, text)}
                onSave={(id) => onSaveTag(imageId, id)}
                onDelete={(id) => onDeleteTag(imageId, id)}
                onClick={(id) => onTagClick(imageId, id)}
                onHover={(id) => onTagHover(imageId, id)}
                onHoverEnd={() => onTagHoverEnd(imageId)}
                imageRef={imgRef}
                currentLayerIndex={currentLayerIndex}
                activeTagId={activeTagId}
              />
            ))}
        </div>
      </div>

      {/* Exit Reflection Button */}
      {isSelected && isReflectionMode && (
        <button
          className="exit-reflection-button mt-2 mx-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
          onClick={handleExitReflection}
          style={{
            pointerEvents: 'auto'
          }}
        >
          <X size={16} />
          <span>Exit Reflection</span>
        </button>
      )}
    </div>
  )
}

export default CanvasImage
