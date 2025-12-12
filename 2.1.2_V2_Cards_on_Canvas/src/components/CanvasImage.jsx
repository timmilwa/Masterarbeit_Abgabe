import { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import Tag from './Tag'
import { useCanvasContext } from './Canvas'

function CanvasImage({
  imageId,
  imageUrl,
  position, // Now in World Space coordinates
  size,
  isSelected,
  isReflectionMode,
  tags = [],
  currentLayerIndex,
  activeTagId,
  onPositionChange,
  onSizeChange,
  onSelect,
  onExitReflection,
  onImageClick,
  onTagTextChange,
  onSaveTag,
  onDeleteTag,
  onTagClick,
  onTagHover,
  onTagHoverEnd,
  imageRef
}) {
  const canvasContext = useCanvasContext()
  const { screenToWorld, transform } = canvasContext

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null) // 'tl', 'tr', 'bl', 'br'
  const [resizeStart, setResizeStart] = useState({ 
    mouseX: 0, 
    mouseY: 0, 
    width: 0, 
    height: 0, 
    centerX: 0, 
    centerY: 0,
    anchorX: 0,
    anchorY: 0,
    aspectRatio: 1,
    initialDirX: 1,
    initialDirY: 1
  })
  const imgRef = useRef(null)
  const containerRef = useRef(null)

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

  const handleResizeHandleMouseDown = useCallback((e, handle) => {
    e.stopPropagation()
    e.preventDefault()
    if (isReflectionMode) return
    
    // Calculate current display dimensions
    const maxWidth = 600
    const maxHeight = 600
    const defaultWidth = 400
    const defaultHeight = 300
    
    const aspectRatio = imageSize.width && imageSize.height 
      ? imageSize.width / imageSize.height 
      : defaultWidth / defaultHeight
    
    let currentDisplayWidth, currentDisplayHeight
    if (size && size.width && size.height && size.width > 0 && size.height > 0) {
      currentDisplayWidth = size.width
      currentDisplayHeight = size.height
    } else if (imageSize.width && imageSize.height && imageSize.width > 0 && imageSize.height > 0) {
      currentDisplayWidth = Math.min(maxWidth, imageSize.width)
      currentDisplayHeight = Math.min(maxHeight, imageSize.height)
      if (currentDisplayWidth / currentDisplayHeight > aspectRatio) {
        currentDisplayWidth = currentDisplayHeight * aspectRatio
      } else {
        currentDisplayHeight = currentDisplayWidth / aspectRatio
      }
    } else {
      currentDisplayWidth = defaultWidth
      currentDisplayHeight = defaultHeight
    }
    
    // Get mouse position in World Space
    const worldPos = screenToWorld(e.clientX, e.clientY)
    
    // Calculate the anchor corner (opposite of the handle being dragged)
    // This corner MUST stay fixed during resize - it's the pivot point
    // Convert display dimensions to world coordinates (divide by scale)
    const halfWidthWorld = (currentDisplayWidth / 2) / transform.scale
    const halfHeightWorld = (currentDisplayHeight / 2) / transform.scale
    let anchorCorner = { x: 0, y: 0 }
    
    // Calculate anchor corner from current center position
    // The anchor is the corner opposite to the handle being dragged
    switch (handle) {
      case 'br': // Bottom-right handle: anchor is top-left corner
        anchorCorner = {
          x: position.x - halfWidthWorld,
          y: position.y - halfHeightWorld
        }
        break
      case 'bl': // Bottom-left handle: anchor is top-right corner
        anchorCorner = {
          x: position.x + halfWidthWorld,
          y: position.y - halfHeightWorld
        }
        break
      case 'tr': // Top-right handle: anchor is bottom-left corner
        anchorCorner = {
          x: position.x - halfWidthWorld,
          y: position.y + halfHeightWorld
        }
        break
      case 'tl': // Top-left handle: anchor is bottom-right corner
        anchorCorner = {
          x: position.x + halfWidthWorld,
          y: position.y + halfHeightWorld
        }
        break
    }
    
    // Determine the direction based on which handle is being dragged
    let initialDirX, initialDirY
    switch (handle) {
      case 'br':
        initialDirX = 1
        initialDirY = 1
        break
      case 'bl':
        initialDirX = -1
        initialDirY = 1
        break
      case 'tr':
        initialDirX = 1
        initialDirY = -1
        break
      case 'tl':
        initialDirX = -1
        initialDirY = -1
        break
    }
    
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      mouseX: worldPos.x,
      mouseY: worldPos.y,
      width: currentDisplayWidth,
      height: currentDisplayHeight,
      centerX: position.x,
      centerY: position.y,
      anchorX: anchorCorner.x,
      anchorY: anchorCorner.y,
      aspectRatio: currentDisplayWidth / currentDisplayHeight,
      initialDirX: initialDirX,
      initialDirY: initialDirY
    })
  }, [isReflectionMode, screenToWorld, size, imageSize, position, transform.scale])

  const handleMouseDown = useCallback((e) => {
    // Don't start drag if clicking on resize handle, tag, or exit button
    if (e.target.closest('.resize-handle') ||
        e.target.closest('.canvas-tag') || 
        e.target.closest('.exit-reflection-button') ||
        e.target.closest('[data-tag-container]')) {
      return
    }

    // In reflection mode, clicking selects the image but doesn't drag
    if (isReflectionMode) {
      if (onSelect) {
        onSelect(imageId)
      }
      return
    }

    // Click and drag directly moves image
    if (onSelect) {
      onSelect(imageId)
    }
    
    // Start dragging immediately (click and drag)
    const worldPos = screenToWorld(e.clientX, e.clientY)
    setIsDragging(true)
    setDragStart({
      x: worldPos.x - position.x,
      y: worldPos.y - position.y
    })
    e.stopPropagation()
  }, [isReflectionMode, position, imageId, onSelect, screenToWorld])

  const handleMouseMove = useCallback((e) => {
    if (isResizing && resizeHandle && !isReflectionMode) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      
      // The anchor corner is FIXED - it should not move at all
      // This is the corner opposite to the handle being dragged
      const anchorX = resizeStart.anchorX
      const anchorY = resizeStart.anchorY
      
      // Get the direction vectors (which quadrant we're in)
      const dirX = resizeStart.initialDirX
      const dirY = resizeStart.initialDirY
      
      // Calculate the vector from anchor to mouse position
      const deltaX = worldPos.x - anchorX
      const deltaY = worldPos.y - anchorY
      
      // Project the delta onto the direction vectors to get signed dimensions
      // This ensures we're working in the correct quadrant
      const signedWidth = deltaX * dirX
      const signedHeight = deltaY * dirY
      
      // Get absolute dimensions
      let rawWidth = Math.abs(signedWidth)
      let rawHeight = Math.abs(signedHeight)
      
      // Minimum size constraint (convert from screen pixels to world space)
      const minSizeWorld = 50 / transform.scale
      rawWidth = Math.max(minSizeWorld, rawWidth)
      rawHeight = Math.max(minSizeWorld, rawHeight)
      
      // Maintain aspect ratio - choose the dimension that requires less adjustment
      const aspectRatio = resizeStart.aspectRatio
      let finalWidth, finalHeight
      
      const widthFromHeight = rawHeight * aspectRatio
      const heightFromWidth = rawWidth / aspectRatio
      
      // Choose which constraint to apply based on which is closer
      if (Math.abs(rawWidth - widthFromHeight) < Math.abs(rawHeight - heightFromWidth)) {
        // Adjust width to match height-based aspect ratio
        finalWidth = widthFromHeight
        finalHeight = rawHeight
      } else {
        // Adjust height to match width-based aspect ratio
        finalWidth = rawWidth
        finalHeight = heightFromWidth
      }
      
      // CRITICAL: Calculate the dragged corner position from the FIXED anchor
      // The anchor (anchorX, anchorY) is the pivot point and MUST NOT move
      // The dragged corner is at: anchor + (direction * dimensions)
      // This ensures the anchor corner stays exactly where it is
      const draggedCornerX = anchorX + (dirX * finalWidth)
      const draggedCornerY = anchorY + (dirY * finalHeight)
      
      // Calculate the new center as the exact midpoint between anchor and dragged corner
      // This formula guarantees the anchor stays fixed:
      // center = (anchor + draggedCorner) / 2
      // Therefore: anchor = 2*center - draggedCorner
      // Since we calculate center FROM the fixed anchor, the anchor mathematically stays fixed
      const newCenterX = (anchorX + draggedCornerX) / 2
      const newCenterY = (anchorY + draggedCornerY) / 2
      
      // VERIFICATION: Ensure anchor stays fixed by recalculating it from the new center
      // This should equal the original anchorX/anchorY (within floating-point precision)
      // If there's any drift, we correct it by adjusting the center slightly
      const recalculatedAnchorX = 2 * newCenterX - draggedCornerX
      const recalculatedAnchorY = 2 * newCenterY - draggedCornerY
      
      // Calculate any drift and correct the center to compensate
      const anchorDriftX = anchorX - recalculatedAnchorX
      const anchorDriftY = anchorY - recalculatedAnchorY
      
      // Adjust center to eliminate any drift (should be zero, but handles floating-point errors)
      const finalCenterX = newCenterX + anchorDriftX
      const finalCenterY = newCenterY + anchorDriftY
      
      // Convert dimensions from world coordinates to screen pixels for storage
      const screenWidth = finalWidth * transform.scale
      const screenHeight = finalHeight * transform.scale
      
      if (onSizeChange) {
        onSizeChange(imageId, screenWidth, screenHeight, { x: finalCenterX, y: finalCenterY })
      }
    } else if (isDragging && !isReflectionMode) {
      // Convert screen coordinates to world coordinates
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const newX = worldPos.x - dragStart.x
      const newY = worldPos.y - dragStart.y
      
      if (onPositionChange) {
        onPositionChange(imageId, newX, newY)
      }
    }
  }, [isResizing, resizeHandle, resizeStart, isDragging, dragStart, isReflectionMode, imageId, onPositionChange, onSizeChange, screenToWorld, transform.scale])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Global mouse move/up handlers
  useEffect(() => {
    if (isDragging || isResizing) {
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
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

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

    // Handle tag creation on image click
    if (onImageClick && currentLayerIndex === 1) {
      onImageClick(e, imageId)
    }
  }, [isReflectionMode, imageId, onSelect, onImageClick, currentLayerIndex])

  const handleExitReflection = useCallback((e) => {
    e.stopPropagation()
    if (onExitReflection) {
      onExitReflection(imageId)
    }
  }, [imageId, onExitReflection])

  // Calculate image display dimensions
  const maxWidth = 600
  const maxHeight = 600
  const defaultWidth = 400
  const defaultHeight = 300
  
  const aspectRatio = imageSize.width && imageSize.height 
    ? imageSize.width / imageSize.height 
    : defaultWidth / defaultHeight
  
  // Use stored size if available, otherwise calculate from natural dimensions
  let displayWidth, displayHeight
  if (size && size.width && size.height && size.width > 0 && size.height > 0) {
    displayWidth = size.width
    displayHeight = size.height
  } else if (imageSize.width && imageSize.height && imageSize.width > 0 && imageSize.height > 0) {
    displayWidth = Math.min(maxWidth, imageSize.width)
    displayHeight = Math.min(maxHeight, imageSize.height)
    // Maintain aspect ratio
    if (displayWidth / displayHeight > aspectRatio) {
      displayWidth = displayHeight * aspectRatio
    } else {
      displayHeight = displayWidth / aspectRatio
    }
  } else {
    displayWidth = defaultWidth
    displayHeight = defaultHeight
  }
  
  // Ensure valid numbers
  displayWidth = Number.isFinite(displayWidth) && displayWidth > 0 ? displayWidth : defaultWidth
  displayHeight = Number.isFinite(displayHeight) && displayHeight > 0 ? displayHeight : defaultHeight

  return (
    <div
      ref={containerRef}
      className="canvas-image absolute"
      data-image-id={imageId}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : (isReflectionMode ? 'pointer' : (isSelected ? 'grab' : 'pointer')),
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Image container */}
      <div
        className="relative"
        style={{
          borderRadius: '0px',
          overflow: 'visible',
          width: `${displayWidth}px`,
          height: `${displayHeight}px`
        }}
      >
        {/* Image with clipping container */}
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: '0px'
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
              pointerEvents: currentLayerIndex === 1 ? 'auto' : 'none'
            }}
            onClick={handleImageClick}
            onError={(e) => {
              console.error('Failed to load image:', imageUrl)
              e.target.style.display = 'none'
            }}
          />
        </div>
        
        {/* Selection border overlay - fixed size regardless of zoom */}
        {isSelected && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: isReflectionMode ? `${4 / transform.scale}px solid #3B82F6` : `${3 / transform.scale}px solid #3B82F6`,
              borderRadius: `${8 / transform.scale}px`
            }}
          />
        )}
        
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

        {/* Resize handles - using zero-point anchoring to prevent drift at any zoom level */}
        {isSelected && !isReflectionMode && (
        <>
          {/* Top-left */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div
              className="resize-handle cursor-nwse-resize"
              style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: resizeHandle === 'tl' ? '#1D4ED8' : '#3B82F6',
                border: '3px solid white',
                borderRadius: '4px',
                pointerEvents: 'auto',
                boxShadow: resizeHandle === 'tl' 
                  ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.15)',
                transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'tl')}
            />
          </div>
          {/* Top-right */}
          <div
            className="absolute"
            style={{
              right: 0,
              top: 0,
              width: 0,
              height: 0,
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div
              className="resize-handle cursor-nesw-resize"
              style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: resizeHandle === 'tr' ? '#1D4ED8' : '#3B82F6',
                border: '3px solid white',
                borderRadius: '4px',
                pointerEvents: 'auto',
                boxShadow: resizeHandle === 'tr' 
                  ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.15)',
                transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'tr')}
            />
          </div>
          {/* Bottom-left */}
          <div
            className="absolute"
            style={{
              left: 0,
              bottom: 0,
              width: 0,
              height: 0,
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div
              className="resize-handle cursor-nesw-resize"
              style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: resizeHandle === 'bl' ? '#1D4ED8' : '#3B82F6',
                border: '3px solid white',
                borderRadius: '4px',
                pointerEvents: 'auto',
                boxShadow: resizeHandle === 'bl' 
                  ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.15)',
                transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'bl')}
            />
          </div>
          {/* Bottom-right */}
          <div
            className="absolute"
            style={{
              right: 0,
              bottom: 0,
              width: 0,
              height: 0,
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div
              className="resize-handle cursor-nwse-resize"
              style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: resizeHandle === 'br' ? '#1D4ED8' : '#3B82F6',
                border: '3px solid white',
                borderRadius: '4px',
                pointerEvents: 'auto',
                boxShadow: resizeHandle === 'br' 
                  ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.15)',
                transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'br')}
            />
          </div>
        </>
        )}
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

