import { useRef, useState, useCallback, useEffect, createContext, useContext } from 'react'

// Interaction modes
const MODE_IDLE = 'IDLE'
const MODE_PANNING = 'PANNING'
const MODE_SELECTING = 'SELECTING'
const MODE_RESIZING = 'RESIZING'
const MODE_DRAGGING = 'DRAGGING'

// Context for coordinate conversion functions
const CanvasContext = createContext(null)

export const useCanvasContext = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvasContext must be used within Canvas component')
  }
  return context
}

function Canvas({ children, onImageUpload, transform, onTransformChange, isReflectionMode, onCanvasClick }) {
  const canvasRef = useRef(null)
  const worldRef = useRef(null)
  const interactionRef = useRef({
    mode: MODE_IDLE,
    startScreen: { x: 0, y: 0 },
    startViewport: { x: 0, y: 0 },
    startWorld: { x: 0, y: 0 },
    currentScreen: { x: 0, y: 0 },
    startTransform: { x: 0, y: 0, scale: 1 },
    selectedItems: [],
    touchStart: null,
    isTwoFingerGesture: false
  })

  const [mode, setMode] = useState(MODE_IDLE)
  const [selectionBox, setSelectionBox] = useState(null) // { start: {x, y}, current: {x, y} }

  // Coordinate conversion: Screen Space -> Viewport Space
  const screenToViewport = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const centerX = clientX - (rect.left + rect.width / 2)
    const centerY = clientY - (rect.top + rect.height / 2)
    return { x: centerX, y: centerY }
  }, [])

  // Coordinate conversion: Viewport Space -> World Space
  const viewportToWorld = useCallback((viewportX, viewportY) => {
    const x = (viewportX - transform.x) / transform.scale
    const y = (viewportY - transform.y) / transform.scale
    return { x, y }
  }, [transform])

  // Coordinate conversion: World Space -> Viewport Space
  const worldToViewport = useCallback((worldX, worldY) => {
    const x = worldX * transform.scale + transform.x
    const y = worldY * transform.scale + transform.y
    return { x, y }
  }, [transform])

  // Combined: Screen Space -> World Space
  const screenToWorld = useCallback((clientX, clientY) => {
    const viewport = screenToViewport(clientX, clientY)
    return viewportToWorld(viewport.x, viewport.y)
  }, [screenToViewport, viewportToWorld])

  // Zoom-to-cursor algorithm
  const handleZoomToCursor = useCallback((mouseViewport, newScale) => {
    const scaleRatio = newScale / transform.scale
    const newX = mouseViewport.x - (mouseViewport.x - transform.x) * scaleRatio
    const newY = mouseViewport.y - (mouseViewport.y - transform.y) * scaleRatio
    return { x: newX, y: newY }
  }, [transform])

  // Touch gesture helpers
  const getTouchCenter = useCallback((touches) => {
    if (touches.length < 2) return null
    const touch1 = touches[0]
    const touch2 = touches[1]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    
    const centerX = ((touch1.clientX + touch2.clientX) / 2) - (rect.left + rect.width / 2)
    const centerY = ((touch1.clientY + touch2.clientY) / 2) - (rect.top + rect.height / 2)
    return { x: centerX, y: centerY }
  }, [])

  const getTouchDistance = useCallback((touches) => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
  }, [])

  // AABB collision detection
  const isAABBOverlap = useCallback((box1, box2) => {
    return !(box1.right < box2.left || box1.left > box2.right ||
             box1.bottom < box2.top || box1.top > box2.bottom)
  }, [])

  // Handle mouse down
  const handleMouseDown = useCallback((e) => {
    // Don't handle if clicking on interactive elements
    if (e.target.closest('.canvas-image') || 
        e.target.closest('.canvas-tag') ||
        e.target.closest('.reflection-cards') ||
        e.target.closest('.resize-handle')) {
      return
    }

    // Only handle clicks on canvas background
    if (e.target === canvasRef.current || 
        (e.target.closest('.canvas-background') && 
         !e.target.closest('.canvas-image') && 
         !e.target.closest('.canvas-tag') &&
         !e.target.closest('.reflection-cards'))) {
      
      // Always deselect when clicking on canvas background
      if (onCanvasClick) {
        onCanvasClick()
      }
      
      // In reflection mode, just deselect and return
      if (isReflectionMode) {
        return
      }

      // Middle mouse button = pan
      if (e.button === 1) {
        e.preventDefault()
        const viewport = screenToViewport(e.clientX, e.clientY)
        interactionRef.current = {
          ...interactionRef.current,
          mode: MODE_PANNING,
          startScreen: { x: e.clientX, y: e.clientY },
          startViewport: viewport,
          startTransform: { ...transform }
        }
        setMode(MODE_PANNING)
        return
      }

      // Left click on canvas = start selection box
      if (e.button === 0) {
        const world = screenToWorld(e.clientX, e.clientY)
        interactionRef.current = {
          ...interactionRef.current,
          mode: MODE_SELECTING,
          startScreen: { x: e.clientX, y: e.clientY },
          startWorld: world,
          currentScreen: { x: e.clientX, y: e.clientY }
        }
        setMode(MODE_SELECTING)
        setSelectionBox({
          start: world,
          current: world
        })
      }
    }
  }, [isReflectionMode, onCanvasClick, screenToViewport, screenToWorld, transform])

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    const interaction = interactionRef.current

    if (interaction.mode === MODE_PANNING) {
      const viewport = screenToViewport(e.clientX, e.clientY)
      const deltaX = viewport.x - interaction.startViewport.x
      const deltaY = viewport.y - interaction.startViewport.y
      
      const newTransform = {
        ...transform,
        x: interaction.startTransform.x - deltaX,
        y: interaction.startTransform.y - deltaY
      }
      
      if (onTransformChange) {
        onTransformChange(newTransform)
      }
    } else if (interaction.mode === MODE_SELECTING) {
      const world = screenToWorld(e.clientX, e.clientY)
      interactionRef.current.currentScreen = { x: e.clientX, y: e.clientY }
      setSelectionBox({
        start: interaction.startWorld,
        current: world
      })
    }
  }, [mode, screenToViewport, screenToWorld, transform, onTransformChange])

  // Handle mouse up
  const handleMouseUp = useCallback((e) => {
    const interaction = interactionRef.current

    if (interaction.mode === MODE_SELECTING && selectionBox) {
      // Perform AABB collision detection
      // Use the selectionBox state which already has the correct world coordinates
      const selectionBoxWorld = {
        left: Math.min(selectionBox.start.x, selectionBox.current.x),
        right: Math.max(selectionBox.start.x, selectionBox.current.x),
        top: Math.min(selectionBox.start.y, selectionBox.current.y),
        bottom: Math.max(selectionBox.start.y, selectionBox.current.y)
      }

      // Find all canvas images and check collision
      // Note: Selection box collision detection is implemented but multi-select
      // functionality would need to be added to App.jsx to handle multiple selected images
      // For now, we'll just store the selected items in the interaction ref
      const canvasImages = canvasRef.current?.querySelectorAll('.canvas-image')
      const selectedIds = []
      
      if (canvasImages) {
        canvasImages.forEach(img => {
          const rect = img.getBoundingClientRect()
          
          // Convert image bounds to world space
          const imgTopLeft = screenToWorld(rect.left, rect.top)
          const imgBottomRight = screenToWorld(rect.right, rect.bottom)
          
          const imgBox = {
            left: Math.min(imgTopLeft.x, imgBottomRight.x),
            right: Math.max(imgTopLeft.x, imgBottomRight.x),
            top: Math.min(imgTopLeft.y, imgBottomRight.y),
            bottom: Math.max(imgTopLeft.y, imgBottomRight.y)
          }

          if (isAABBOverlap(selectionBoxWorld, imgBox)) {
            const imageId = img.getAttribute('data-image-id')
            if (imageId) {
              selectedIds.push(imageId)
            }
          }
        })
      }

      // Store selected items (could be used for multi-select in future)
      interactionRef.current.selectedItems = selectedIds
      
      // For now, if exactly one image is selected, select it
      // Multi-select functionality can be added later
      if (selectedIds.length === 1 && onCanvasClick) {
        // This would need to be passed as a prop to handle selection
        // For now, we'll leave it as a placeholder
      }
    }

    // Reset interaction state
    interactionRef.current = {
      ...interactionRef.current,
      mode: MODE_IDLE,
      startScreen: { x: 0, y: 0 },
      startViewport: { x: 0, y: 0 },
      startWorld: { x: 0, y: 0 },
      currentScreen: { x: 0, y: 0 }
    }
    setMode(MODE_IDLE)
    setSelectionBox(null)
  }, [screenToWorld, isAABBOverlap, selectionBox])

  // Handle wheel (zoom and pan)
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    
    // Ctrl/Cmd key = zoom gesture
    if (e.ctrlKey || e.metaKey) {
      const zoomSpeed = 0.0075
      const delta = e.deltaY * -zoomSpeed
      const newScale = Math.min(Math.max(0.5, transform.scale + delta), 3)
      
      const mouseViewport = screenToViewport(e.clientX, e.clientY)
      const newViewPos = handleZoomToCursor(mouseViewport, newScale)
      
      const newTransform = {
        scale: newScale,
        x: newViewPos.x,
        y: newViewPos.y
      }
      
      if (onTransformChange) {
        onTransformChange(newTransform)
      }
    } else {
      // Normal scroll = pan
      const panSpeed = 1
      const newTransform = {
        ...transform,
        x: transform.x - e.deltaX * panSpeed,
        y: transform.y - e.deltaY * panSpeed
      }
      
      if (onTransformChange) {
        onTransformChange(newTransform)
      }
    }
  }, [transform, onTransformChange, screenToViewport, handleZoomToCursor])

  // Handle touch start (for trackpad gestures)
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const center = getTouchCenter(e.touches)
      const distance = getTouchDistance(e.touches)
      
      if (center) {
        interactionRef.current = {
          ...interactionRef.current,
          mode: MODE_PANNING,
          touchStart: {
            touches: e.touches,
            initialDistance: distance,
            center: center
          },
          isTwoFingerGesture: true,
          startTransform: { ...transform }
        }
        setMode(MODE_PANNING)
      }
    }
  }, [transform, getTouchCenter, getTouchDistance])

  // Handle touch move (for trackpad gestures)
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && interactionRef.current.isTwoFingerGesture) {
      e.preventDefault()
      const center = getTouchCenter(e.touches)
      const currentDistance = getTouchDistance(e.touches)
      const touchStart = interactionRef.current.touchStart

      if (center && touchStart) {
        // Check if this is primarily a zoom (distance changed significantly) or pan (center moved)
        const distanceChange = Math.abs(currentDistance - touchStart.initialDistance)
        const centerChange = Math.hypot(
          center.x - touchStart.center.x,
          center.y - touchStart.center.y
        )

        if (distanceChange > 5) {
          // Zoom gesture
          const scaleRatio = currentDistance / touchStart.initialDistance
          const newScale = Math.min(Math.max(0.5, transform.scale * scaleRatio), 3)
          
          // Apply zoom-to-center of pinch
          const newViewPos = handleZoomToCursor(center, newScale)
          
          const newTransform = {
            scale: newScale,
            x: newViewPos.x,
            y: newViewPos.y
          }
          
          if (onTransformChange) {
            onTransformChange(newTransform)
          }

          // Update touch start for next frame
          interactionRef.current.touchStart = {
            ...touchStart,
            initialDistance: currentDistance,
            center: center
          }
        } else if (centerChange > 5) {
          // Pan gesture
          const deltaX = center.x - touchStart.center.x
          const deltaY = center.y - touchStart.center.y
          
          const newTransform = {
            ...transform,
            x: interactionRef.current.startTransform.x - deltaX,
            y: interactionRef.current.startTransform.y - deltaY
          }
          
          if (onTransformChange) {
            onTransformChange(newTransform)
          }
        }
      }
    }
  }, [transform, onTransformChange, getTouchCenter, getTouchDistance, handleZoomToCursor])

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (interactionRef.current.isTwoFingerGesture && e.touches.length < 2) {
      interactionRef.current = {
        ...interactionRef.current,
        mode: MODE_IDLE,
        touchStart: null,
        isTwoFingerGesture: false
      }
      setMode(MODE_IDLE)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0 && onImageUpload) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      imageFiles.forEach(file => {
        onImageUpload(file, worldPos.x, worldPos.y)
      })
    }
  }, [onImageUpload, screenToWorld])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  // Expose coordinate conversion functions via ref
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.screenToViewport = screenToViewport
      canvasRef.current.viewportToWorld = viewportToWorld
      canvasRef.current.worldToViewport = worldToViewport
      canvasRef.current.screenToWorld = screenToWorld
    }
  }, [screenToViewport, viewportToWorld, worldToViewport, screenToWorld])

  // Register wheel event
  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    canvasElement.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Calculate grid properties
  const baseSize = 20
  const gridSize = baseSize * transform.scale
  const gridOpacity = Math.max(0, Math.min(0.4, (transform.scale - 0.2) * 0.8))
  const viewPosition = { x: transform.x, y: transform.y }

  // Calculate zoom percentage
  const zoomPercentage = Math.round(transform.scale * 100)

  // Calculate selection box in viewport coordinates for rendering
  let selectionBoxViewport = null
  if (selectionBox) {
    const startViewport = worldToViewport(selectionBox.start.x, selectionBox.start.y)
    const currentViewport = worldToViewport(selectionBox.current.x, selectionBox.current.y)
    selectionBoxViewport = {
      left: Math.min(startViewport.x, currentViewport.x),
      top: Math.min(startViewport.y, currentViewport.y),
      width: Math.abs(currentViewport.x - startViewport.x),
      height: Math.abs(currentViewport.y - startViewport.y)
    }
  }

  return (
    <div
      ref={canvasRef}
      className="canvas-background w-full h-screen overflow-hidden relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        cursor: mode === MODE_PANNING ? 'grabbing' : (isReflectionMode ? 'default' : 'default'),
        backgroundPosition: `calc(50% + ${viewPosition.x}px - ${gridSize/2}px) calc(50% + ${viewPosition.y}px - ${gridSize/2}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, ${gridOpacity}) 1.5px, transparent 1.5px)`,
        backgroundColor: '#f9fafb'
      }}
    >
      {/* World container - receives camera transform */}
      <CanvasContext.Provider value={{
        screenToViewport,
        viewportToWorld,
        worldToViewport,
        screenToWorld,
        transform
      }}>
        <div
          ref={worldRef}
          className="canvas-world"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            width: '0',
            height: '0',
            willChange: 'transform'
          }}
        >
          {children}
        </div>
      </CanvasContext.Provider>

      {/* Selection box overlay */}
      {selectionBoxViewport && (
        <div
          className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 selection-box-no-radius"
          style={{
            left: `calc(50% + ${selectionBoxViewport.left}px)`,
            top: `calc(50% + ${selectionBoxViewport.top}px)`,
            width: `${selectionBoxViewport.width}px`,
            height: `${selectionBoxViewport.height}px`,
            zIndex: 1000
          }}
        />
      )}

      {/* Zoom percentage display */}
      <div
        className="absolute bottom-4 right-4 pointer-events-none text-sm font-medium text-gray-600 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm"
        style={{
          zIndex: 1001
        }}
      >
        {zoomPercentage}%
      </div>
    </div>
  )
}

export default Canvas
