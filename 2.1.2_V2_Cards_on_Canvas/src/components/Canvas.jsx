import { useRef, useState, useCallback, useEffect } from 'react'

function Canvas({ children, onImageUpload, transform, onTransformChange, isReflectionMode, onCanvasClick, activeTool }) {
  const canvasRef = useRef(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Convert viewport coordinates to canvas coordinates
  // Coordinate system origin (0,0) is at the geometric center of the viewport
  const viewportToCanvas = useCallback((viewportX, viewportY) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    // Convert to center-relative coordinates
    const centerX = viewportX - (rect.left + rect.width / 2)
    const centerY = viewportY - (rect.top + rect.height / 2)
    // Convert to canvas coordinates: (centerRelativePos - viewPosition) / scale
    const x = (centerX - transform.x) / transform.scale
    const y = (centerY - transform.y) / transform.scale
    return { x, y }
  }, [transform])

  // Convert canvas coordinates to viewport coordinates
  // Coordinate system origin (0,0) is at the geometric center of the viewport
  const canvasToViewport = useCallback((canvasX, canvasY) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    // Convert canvas coordinates to center-relative viewport coordinates
    const centerX = canvasX * transform.scale + transform.x
    const centerY = canvasY * transform.scale + transform.y
    // Convert back to absolute viewport coordinates
    const x = centerX + (rect.left + rect.width / 2)
    const y = centerY + (rect.top + rect.height / 2)
    return { x, y }
  }, [transform])

  const handleMouseDown = useCallback((e) => {
    // Only start panning if clicking on canvas background (not on an image or interactive element)
    if (e.target === canvasRef.current || 
        (e.target.closest('.canvas-background') && 
         !e.target.closest('.canvas-image') && 
         !e.target.closest('.canvas-tag') &&
         !e.target.closest('.reflection-cards'))) {
      // In reflection mode, clicking canvas background should deselect
      if (isReflectionMode && onCanvasClick) {
        onCanvasClick()
        return
      }
      
      // Hand tool: always pan on canvas background
      // Select tool: only pan with middle mouse button or space key
      if (activeTool === 'hand' || e.button === 1) {
        setIsPanning(true)
        // Get container bounds for center-relative coordinate conversion
        const rect = canvasRef.current.getBoundingClientRect()
        // Convert to center-relative coordinates (matching zoom coordinate system)
        const centerX = e.clientX - (rect.left + rect.width / 2)
        const centerY = e.clientY - (rect.top + rect.height / 2)
        // Store initial mouse position (center-relative) and transform for inverted panning
        setPanStart({
          x: centerX,
          y: centerY,
          transformX: transform.x,
          transformY: transform.y
        })
      } else if (activeTool === 'select' && onCanvasClick) {
        // In select tool, clicking canvas background deselects
        onCanvasClick()
      }
    }
  }, [transform, isReflectionMode, onCanvasClick, activeTool])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      // Get container bounds for center-relative coordinate conversion
      const rect = canvasRef.current.getBoundingClientRect()
      // Convert current mouse position to center-relative coordinates
      const centerX = e.clientX - (rect.left + rect.width / 2)
      const centerY = e.clientY - (rect.top + rect.height / 2)
      // Calculate delta in center-relative coordinate system
      const deltaX = centerX - panStart.x
      const deltaY = centerY - panStart.y
      // Invert panning directions: drag right moves canvas left, drag down moves canvas up
      const newTransform = {
        ...transform,
        x: panStart.transformX - deltaX, // Inverted horizontal
        y: panStart.transformY - deltaY  // Inverted vertical
      }
      if (onTransformChange) {
        onTransformChange(newTransform)
      }
    }
  }, [isPanning, panStart, transform, onTransformChange])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback((e) => {
    // Always prevent default to stop browser scrolling/zooming
    e.preventDefault()
    
    // Ctrl/Cmd key = zoom gesture (Safari trackpad pinch or Ctrl+wheel)
    if (e.ctrlKey || e.metaKey) {
      // Zoom gesture - increased speed for faster zooming
      const zoomSpeed = 0.0075
      const delta = e.deltaY * -zoomSpeed
      const newScale = Math.min(Math.max(0.5, transform.scale + delta), 3)
      
      // Calculate scale ratio (newScale / oldScale)
      const scaleRatio = newScale / transform.scale
      
      // Get container bounds
      const rect = canvasRef.current.getBoundingClientRect()
      
      /**
       * ZOOM-TO-CURSOR ALGORITHM - Mathematical Implementation
       * 
       * Center-Relative Coordinate Calculation:
       * The coordinate system's origin (0,0) is defined as the geometric center 
       * of the viewport container, not the top-left corner.
       * 
       * mouseX/Y = clientX/Y - (rect.left/top + rect.width/height / 2)
       * This converts raw client coordinates to center-relative coordinates.
       */
      const mouseX = e.clientX - (rect.left + rect.width / 2)
      const mouseY = e.clientY - (rect.top + rect.height / 2)
      
      /**
       * The Invariance Formula:
       * newPos = mousePos - (mousePos - oldViewPos) * scaleRatio
       * 
       * Mathematical Derivation:
       * 1. WorldPoint = (MousePos - ViewPos) / Scale (must remain constant)
       * 2. Before zoom: WorldPoint = (mousePos - oldViewPos) / oldScale
       * 3. After zoom:  WorldPoint = (mousePos - newViewPos) / newScale
       * 4. Equating: (mousePos - oldViewPos) / oldScale = (mousePos - newViewPos) / newScale
       * 5. Solving for newViewPos:
       *    (mousePos - newViewPos) = (mousePos - oldViewPos) * (newScale / oldScale)
       *    newViewPos = mousePos - (mousePos - oldViewPos) * scaleRatio
       * 
       * Variable Definitions:
       * - scaleRatio: The quotient of newScale / oldScale
       * - viewPosition (transform.x/y): The translation offset applied via CSS transform
       * - (mousePos - oldViewPos): The distance from the current image origin 
       *   (translation) to the mouse pointer in screen space
       * 
       * This formula ensures the point under the mouse cursor remains visually 
       * stationary during zoom operations.
       */
      const newX = mouseX - (mouseX - transform.x) * scaleRatio
      const newY = mouseY - (mouseY - transform.y) * scaleRatio
      
      const newTransform = {
        scale: newScale,
        x: newX,
        y: newY
      }
      
      if (onTransformChange) {
        onTransformChange(newTransform)
      }
    } else {
      // Normal scroll = pan (inverted directions)
      const panSpeed = 1
      const newTransform = {
        ...transform,
        x: transform.x - e.deltaX * panSpeed, // Inverted horizontal
        y: transform.y - e.deltaY * panSpeed  // Inverted vertical
      }
      
      if (onTransformChange) {
        onTransformChange(newTransform)
      }
    }
  }, [transform, onTransformChange])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0 && onImageUpload) {
      // Get drop position in canvas coordinates
      const canvasPos = viewportToCanvas(e.clientX, e.clientY)
      
      imageFiles.forEach(file => {
        onImageUpload(file, canvasPos.x, canvasPos.y)
      })
    }
  }, [onImageUpload, viewportToCanvas])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  // Expose coordinate conversion functions via ref if needed
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.viewportToCanvas = viewportToCanvas
      canvasRef.current.canvasToViewport = canvasToViewport
    }
  }, [viewportToCanvas, canvasToViewport])

  // Register wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    canvasElement.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Calculate dot grid properties based on transform
  const baseSize = 20
  const gridSize = baseSize * transform.scale
  const gridOpacity = Math.max(0, Math.min(0.4, (transform.scale - 0.2) * 0.8))
  
  // Calculate background position for infinite panning
  // viewPosition is the same as transform.x/y (pan offset)
  const viewPosition = { x: transform.x, y: transform.y }

  return (
    <div
      ref={canvasRef}
      className="canvas-background w-full h-screen overflow-hidden relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        cursor: isPanning ? 'grabbing' : (activeTool === 'hand' ? 'grab' : (isReflectionMode ? 'default' : 'default')),
        backgroundPosition: `calc(50% + ${viewPosition.x}px - ${gridSize/2}px) calc(50% + ${viewPosition.y}px - ${gridSize/2}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, ${gridOpacity}) 1.5px, transparent 1.5px)`,
        backgroundColor: '#f9fafb' // bg-gray-50 equivalent
      }}
    >
      {/* Canvas viewport container - zoom and pan applied here */}
      {/* 
        Transform uses center-relative coordinate system:
        - transformOrigin: '50% 50%' means scaling happens from viewport center
        - translate() values are center-relative (same as grid backgroundPosition)
        - This ensures grid and canvas content zoom/pan in perfect sync
      */}
      <div
        className="canvas-content"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '50% 50%',
          width: '100%',
          height: '100%',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          willChange: 'transform' // Optimize for transform animations
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default Canvas

