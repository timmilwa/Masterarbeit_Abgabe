import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Trash2, Check, X, Loader2 } from 'lucide-react'
import EmptyState from './components/EmptyState'
import Canvas from './components/Canvas'
import CanvasImage from './components/CanvasImage'
import ReflectionCards from './components/ReflectionCards'
import TopToolbar from './components/TopToolbar'
import BottomToolbar from './components/BottomToolbar'
import { validateApiKey, generateImageTitle } from './services/geminiService'

function App() {
  // Canvas state
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [activeMode, setActiveMode] = useState('reflection') // 'reflection' | 'merge' | 'export'
  const [selectedImageId, setSelectedImageId] = useState(null)
  
  // Reflection mode is active when activeMode is 'reflection'
  const reflectionMode = activeMode === 'reflection'

  // Images array - each image has its own state
  const [images, setImages] = useState(() => {
    // Initialize with default image if needed
    // Position is in canvas coordinates (center-relative, where 0,0 is viewport center)
    // For initial positioning at viewport center, use 0, 0
    const defaultImage = {
      id: 'default-1',
      url: '/weather-app.png',
      position: { x: 0, y: 0 }, // Center of viewport in canvas coordinates
      tags: [],
      currentQuestionIndex: 0,
      currentLayerIndex: 0,
      activeTagId: null,
      hoveredTagId: null,
      aiGeneratedTitle: '',
      isGeneratingTitle: false,
      weatherInput: ''
    }
    return [defaultImage]
  })

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef(null)
  const validationTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // AI-related state (global, not per-image)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('geminiApiKey') || ''
  })
  const [isApiKeyValid, setIsApiKeyValid] = useState(false)
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('geminiModel') || 'gemini-2.0-flash-exp'
  })
  const [aiMode, setAiMode] = useState(() => {
    return localStorage.getItem('aiMode') === 'true'
  })
  
  // AI Custom Instructions
  const [aiInstructions, setAiInstructions] = useState(() => {
    const saved = localStorage.getItem('aiInstructions')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return {
          titleGeneration: '',
          functionalQuestions: '',
          consequencesQuestion1: '',
          consequencesQuestion2: '',
          valuesQuestion: ''
        }
      }
    }
    return {
      titleGeneration: '',
      functionalQuestions: '',
      consequencesQuestion1: '',
      consequencesQuestion2: '',
      valuesQuestion: ''
    }
  })
  const [showInstructions, setShowInstructions] = useState(false)

  // Get selected image
  const selectedImage = images.find(img => img.id === selectedImageId)
  const imageRefs = useRef({})

  // Image upload handler
  const handleImageUpload = useCallback(async (file, x, y) => {
    if (!file || !file.type.startsWith('image/')) return

    const url = URL.createObjectURL(file)
    const newImageId = `image-${Date.now()}-${Math.random()}`
    
    const newImage = {
      id: newImageId,
      url: url,
      position: { x: x || 0, y: y || 0 }, // Default to center (0, 0 in canvas coordinates)
      tags: [],
      currentQuestionIndex: 0,
      currentLayerIndex: 0,
      activeTagId: null,
      hoveredTagId: null,
      aiGeneratedTitle: '',
      isGeneratingTitle: false,
      weatherInput: ''
    }

    // Generate AI title if AI mode is active and API key is valid
    if (aiMode && apiKey && isApiKeyValid) {
      setImages(prev => prev.map(img => 
        img.id === newImageId ? { ...img, isGeneratingTitle: true } : img
      ))
      
      try {
        const title = await generateImageTitle(file, apiKey, selectedModel, aiInstructions)
        setImages(prev => prev.map(img => 
          img.id === newImageId 
            ? { ...img, aiGeneratedTitle: title || '', isGeneratingTitle: false }
            : img
        ))
      } catch (error) {
        console.error('Failed to generate image title:', error)
        setImages(prev => prev.map(img => 
          img.id === newImageId 
            ? { ...img, aiGeneratedTitle: '', isGeneratingTitle: false }
            : img
        ))
      }
    }

    setImages(prev => [...prev, newImage])
  }, [aiMode, apiKey, isApiKeyValid, selectedModel, aiInstructions])

  // Handle file input (for EmptyState)
  const handleFileInput = useCallback((event) => {
    const file = event.target.files?.[0]
    if (file) {
      // Position at viewport center (0, 0 in canvas coordinates)
      handleImageUpload(file, 0, 0)
    }
  }, [handleImageUpload])

  // Image selection
  const handleImageSelect = useCallback((imageId) => {
    setSelectedImageId(imageId)
  }, [])

  // Exit reflection for specific image
  const handleExitReflection = useCallback((imageId) => {
    setSelectedImageId(null)
  }, [])

  // Image position change
  const handleImagePositionChange = useCallback((imageId, x, y) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, position: { x, y } } : img
    ))
  }, [])

  // Image size change (for resize handles)
  const handleImageSizeChange = useCallback((imageId, width, height, newPosition) => {
    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { 
            ...img, 
            size: { width, height },
            position: newPosition || img.position
          } 
        : img
    ))
  }, [])

  // Image click handler (for tag creation)
  const handleImageClick = useCallback((e, imageId) => {
    const image = images.find(img => img.id === imageId)
    if (!image || image.currentLayerIndex !== 1) return

    const imgRef = imageRefs.current[imageId]
    const imgElement = imgRef?.current
    if (!imgElement) return

    const rect = imgElement.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const newTagId = Date.now() + Math.random()
    const newTag = {
      id: newTagId,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      text: '',
      questionId: image.currentQuestionIndex,
      saved: false,
      dataLayerResponses: null,
      valuesLayerResponses: null
    }

    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { 
            ...img, 
            tags: [...img.tags, newTag],
            activeTagId: newTagId
          }
        : img
    ))
  }, [images])

  // Tag handlers (per-image)
  const handleTagTextChange = useCallback((imageId, tagId, text) => {
    setImages(prev => prev.map(img => 
      img.id === imageId
        ? {
            ...img,
            tags: img.tags.map(tag => 
              tag.id === tagId ? { ...tag, text } : tag
            )
          }
        : img
    ))
  }, [])

  const handleSaveTag = useCallback((imageId, tagId) => {
    setImages(prev => prev.map(img => 
      img.id === imageId
        ? {
            ...img,
            tags: img.tags.map(tag => 
              tag.id === tagId ? { ...tag, saved: true } : tag
            )
          }
        : img
    ))
  }, [])

  const handleDeleteTag = useCallback((imageId, tagId) => {
    setImages(prev => prev.map(img => 
      img.id === imageId
        ? {
            ...img,
            tags: img.tags.filter(tag => tag.id !== tagId),
            activeTagId: img.activeTagId === tagId ? null : img.activeTagId
          }
        : img
    ))
  }, [])

  const handleTagClick = useCallback((imageId, tagId) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, activeTagId: tagId } : img
    ))
  }, [])

  const handleTagHover = useCallback((imageId, tagId) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, hoveredTagId: tagId } : img
    ))
  }, [])

  const handleTagHoverEnd = useCallback((imageId) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, hoveredTagId: null } : img
    ))
  }, [])

  // Layer and question index changes (per-image)
  const handleLayerIndexChange = useCallback((imageId, newLayerIndex) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        const updated = { ...img, currentLayerIndex: newLayerIndex }
        // Deselect all pins when switching to Consequences or Values card
        if (newLayerIndex === 2 || newLayerIndex === 3) {
          updated.activeTagId = null
        }
        return updated
      }
      return img
    }))
  }, [])

  const handleQuestionIndexChange = useCallback((imageId, newIndex) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, currentQuestionIndex: newIndex } : img
    ))
  }, [])

  // Data layer response (per-image)
  const handleDataLayerResponse = useCallback((imageId, tagId, questionIndex, answer, questionText) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return {
          ...img,
          tags: img.tags.map(tag => {
            if (tag.id === tagId) {
              const currentResponses = tag.dataLayerResponses || {
                question1: null,
                answer1: null,
                question2: null,
                answer2: null,
                completed: false
              }
              
              const updatedResponses = { ...currentResponses }
              
              if (questionIndex === 0) {
                updatedResponses.question1 = questionText
                updatedResponses.answer1 = answer
              } else if (questionIndex === 1) {
                updatedResponses.question2 = questionText
                updatedResponses.answer2 = answer
                updatedResponses.completed = true
              }
              
              return {
                ...tag,
                dataLayerResponses: updatedResponses
              }
            }
            return tag
          })
        }
      }
      return img
    }))
  }, [])

  // Values layer response (per-image)
  const handleValuesLayerResponse = useCallback((imageId, tagId, answer, questionText) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return {
          ...img,
          tags: img.tags.map(tag => {
            if (tag.id === tagId) {
              return {
                ...tag,
                valuesLayerResponses: {
                  question: questionText,
                  answer: answer,
                  completed: true
                }
              }
            }
            return tag
          })
        }
      }
      return img
    }))
  }, [])

  // Consequences question generated (per-image)
  const handleConsequencesQuestionGenerated = useCallback((imageId, tagId, questionNumber, questionText) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return {
          ...img,
          tags: img.tags.map(tag => {
            if (tag.id === tagId) {
              const currentResponses = tag.dataLayerResponses || {
                question1: null,
                answer1: null,
                question2: null,
                answer2: null,
                completed: false
              }
              
              const updatedResponses = { ...currentResponses }
              if (questionNumber === 1) {
                updatedResponses.question1 = questionText
              } else if (questionNumber === 2) {
                updatedResponses.question2 = questionText
              }
              
              return {
                ...tag,
                dataLayerResponses: updatedResponses
              }
            }
            return tag
          })
        }
      }
      return img
    }))
  }, [])

  // Values question generated (per-image)
  const handleValuesQuestionGenerated = useCallback((imageId, tagId, questionText) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return {
          ...img,
          tags: img.tags.map(tag => {
            if (tag.id === tagId) {
              const currentResponses = tag.valuesLayerResponses || {
                question: null,
                answer: null,
                completed: false
              }
              
              return {
                ...tag,
                valuesLayerResponses: {
                  ...currentResponses,
                  question: questionText
                }
              }
            }
            return tag
          })
        }
      }
      return img
    }))
  }, [])

  // Delete image
  const handleDeleteImage = useCallback((imageId) => {
    setImages(prev => {
      const image = prev.find(img => img.id === imageId)
      if (image && image.url !== '/weather-app.png' && image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url)
      }
      const filtered = prev.filter(img => img.id !== imageId)
      if (selectedImageId === imageId) {
        setSelectedImageId(null)
      }
      return filtered
    })
  }, [selectedImageId])

  // Delete all tags for an image
  const handleDeleteAllTags = useCallback((imageId) => {
    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, tags: [], activeTagId: null, hoveredTagId: null }
        : img
    ))
    setIsSettingsOpen(false)
  }, [])

  // Toolbar handlers
  const handleModeChange = useCallback((mode) => {
    setActiveMode(mode)
    
    // When switching away from reflection mode, deselect image
    if (mode !== 'reflection' && reflectionMode) {
      setSelectedImageId(null)
    }
    
    // Handle mode-specific actions
    if (mode === 'merge') {
      // Placeholder for merge functionality
      console.log('Merge functionality - to be implemented')
    } else if (mode === 'export') {
      // Placeholder for export functionality
      console.log('Export functionality - to be implemented')
    }
  }, [reflectionMode])


  // Add image handler
  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle file input change
  const handleFileInputChange = useCallback((event) => {
    const file = event.target.files?.[0]
    if (file) {
      // Place image at center of viewport (0, 0 in canvas coordinates)
      handleImageUpload(file, 0, 0)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleImageUpload])

  // Debounced API key validation
  const handleApiKeyChange = useCallback((newApiKey) => {
    setApiKey(newApiKey)
    
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }
    
    if (!newApiKey || newApiKey.trim() === '') {
      setIsApiKeyValid(false)
      setIsValidatingApiKey(false)
      return
    }
    
    setIsValidatingApiKey(true)
    setIsApiKeyValid(false)
    
    validationTimeoutRef.current = setTimeout(async () => {
      const valid = await validateApiKey(newApiKey)
      setIsApiKeyValid(valid)
      setIsValidatingApiKey(false)
    }, 500)
  }, [])

  // Validate API key on mount
  useEffect(() => {
    if (apiKey) {
      setIsValidatingApiKey(true)
      validateApiKey(apiKey).then(valid => {
        setIsApiKeyValid(valid)
        setIsValidatingApiKey(false)
      })
    }
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('geminiApiKey', apiKey)
    } else {
      localStorage.removeItem('geminiApiKey')
    }
  }, [apiKey])

  useEffect(() => {
    localStorage.setItem('geminiModel', selectedModel)
  }, [selectedModel])

  useEffect(() => {
    localStorage.setItem('aiMode', aiMode.toString())
  }, [aiMode])

  useEffect(() => {
    localStorage.setItem('aiInstructions', JSON.stringify(aiInstructions))
  }, [aiInstructions])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false)
      }
    }

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSettingsOpen])

  // Prevent browser zoom gestures (but allow canvas zoom)
  useEffect(() => {
    const preventKeyboardZoom = (e) => {
      // Prevent Ctrl/Cmd + Plus/Minus/0 (browser zoom shortcuts)
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault()
        return false
      }
    }

    const preventWheelZoom = (e) => {
      // Prevent browser zoom via Ctrl/Cmd + wheel
      // But ONLY if it's NOT on the canvas (canvas handles its own zoom)
      if ((e.ctrlKey || e.metaKey) && e.type === 'wheel') {
        const isOnCanvas = e.target.closest('.canvas-background')
        if (!isOnCanvas) {
          // Not on canvas - prevent browser zoom
          e.preventDefault()
          return false
        }
        // On canvas - let Canvas component handle it (it will preventDefault)
      }
    }

    const preventTouchZoom = (e) => {
      // Prevent pinch zoom on touch devices (except on canvas)
      if (e.touches.length > 1) {
        const isOnCanvas = e.target.closest('.canvas-background')
        if (!isOnCanvas) {
          e.preventDefault()
          return false
        }
      }
    }

    // Prevent keyboard zoom shortcuts
    document.addEventListener('keydown', preventKeyboardZoom)
    // Prevent wheel zoom outside canvas (canvas handles its own)
    document.addEventListener('wheel', preventWheelZoom, { passive: false })
    // Prevent touch zoom outside canvas
    document.addEventListener('touchstart', preventTouchZoom, { passive: false })
    document.addEventListener('touchmove', preventTouchZoom, { passive: false })
    // Prevent double-tap zoom on mobile
    let lastTouchEnd = 0
    const preventDoubleTapZoom = (e) => {
      const isOnCanvas = e.target.closest('.canvas-background')
      if (!isOnCanvas) {
        const now = Date.now()
        if (now - lastTouchEnd <= 300) {
          e.preventDefault()
          return false
        }
        lastTouchEnd = now
      }
    }
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })

    return () => {
      document.removeEventListener('keydown', preventKeyboardZoom)
      document.removeEventListener('wheel', preventWheelZoom)
      document.removeEventListener('touchstart', preventTouchZoom)
      document.removeEventListener('touchmove', preventTouchZoom)
      document.removeEventListener('touchend', preventDoubleTapZoom)
    }
  }, [])

  // Calculate selected image size for ReflectionCards positioning
  const getSelectedImageSize = () => {
    if (!selectedImage) return { width: 0, height: 0 }
    const imgRef = imageRefs.current[selectedImageId]
    const imgElement = imgRef?.current
    if (!imgElement) return { width: 600, height: 400 } // Default size
    return {
      width: imgElement.offsetWidth || 600,
      height: imgElement.offsetHeight || 400
    }
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <EmptyState onImageUpload={handleFileInput} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Canvas
        transform={canvasTransform}
        onTransformChange={setCanvasTransform}
        onImageUpload={handleImageUpload}
        isReflectionMode={reflectionMode}
        onCanvasClick={() => setSelectedImageId(null)}
      >
        {/* Render all images */}
        {images.map(image => {
          // Get or create image ref
          if (!imageRefs.current[image.id]) {
            imageRefs.current[image.id] = { current: null }
          }

          const imageRef = imageRefs.current[image.id]

          return (
            <CanvasImage
              key={image.id}
              imageId={image.id}
              imageUrl={image.url}
              position={image.position}
              size={image.size}
              isSelected={selectedImageId === image.id}
              isReflectionMode={reflectionMode}
              tags={image.tags}
              currentLayerIndex={image.currentLayerIndex}
              activeTagId={image.activeTagId}
              onPositionChange={handleImagePositionChange}
              onSizeChange={handleImageSizeChange}
              onSelect={handleImageSelect}
              onExitReflection={handleExitReflection}
              onImageClick={handleImageClick}
              onTagTextChange={handleTagTextChange}
              onSaveTag={handleSaveTag}
              onDeleteTag={handleDeleteTag}
              onTagClick={handleTagClick}
              onTagHover={handleTagHover}
              onTagHoverEnd={handleTagHoverEnd}
              imageRef={imageRef}
            />
          )
        })}

        {/* Render ReflectionCards when in reflection mode and image is selected */}
        {reflectionMode && selectedImage && (
          <ReflectionCards
            imageId={selectedImage.id}
            imagePosition={selectedImage.position}
            imageSize={getSelectedImageSize()}
            tags={selectedImage.tags}
            currentQuestionIndex={selectedImage.currentQuestionIndex}
            onQuestionIndexChange={(newIndex) => handleQuestionIndexChange(selectedImage.id, newIndex)}
            onLayerIndexChange={(newIndex) => handleLayerIndexChange(selectedImage.id, newIndex)}
            activeTagId={selectedImage.activeTagId}
            onDataLayerResponse={(tagId, questionIndex, answer, questionText) => 
              handleDataLayerResponse(selectedImage.id, tagId, questionIndex, answer, questionText)
            }
            onValuesLayerResponse={(tagId, answer, questionText) => 
              handleValuesLayerResponse(selectedImage.id, tagId, answer, questionText)
            }
            onConsequencesQuestionGenerated={(tagId, questionNumber, questionText) => 
              handleConsequencesQuestionGenerated(selectedImage.id, tagId, questionNumber, questionText)
            }
            onValuesQuestionGenerated={(tagId, questionText) => 
              handleValuesQuestionGenerated(selectedImage.id, tagId, questionText)
            }
            aiGeneratedTitle={selectedImage.aiGeneratedTitle}
            aiMode={aiMode}
            isGeneratingTitle={selectedImage.isGeneratingTitle}
            apiKey={apiKey}
            selectedModel={selectedModel}
            aiInstructions={aiInstructions}
          />
        )}
      </Canvas>

      {/* Top Toolbar */}
      <TopToolbar
        activeMode={activeMode}
        onModeChange={handleModeChange}
      />

      {/* Bottom Toolbar */}
      <BottomToolbar
        onAddImage={handleAddImage}
      />

      {/* Hidden file input for adding images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Settings Button - Bottom Left */}
      <div 
        ref={settingsRef}
        className="fixed bottom-6 left-6 z-50"
      >
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-lg hover:bg-gray-50 transition-colors"
          aria-label="Settings"
        >
          <Settings size={20} className="text-gray-700" />
        </button>
        
        {/* Dropdown Menu */}
        {isSettingsOpen && (
          <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[320px] overflow-hidden">
            {/* AI Configuration Section */}
            <div className="border-b border-gray-200">
              <div className="px-4 py-3 bg-gray-50">
                <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">AI Configuration</h3>
              </div>
              
              {/* API Key Input */}
              <div className="px-4 py-3 space-y-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-10 bg-gray-100 text-gray-900"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidatingApiKey ? (
                      <Loader2 size={16} className="text-gray-400 animate-spin" />
                    ) : isApiKeyValid ? (
                      <Check size={16} className="text-green-600" />
                    ) : apiKey ? (
                      <X size={16} className="text-red-600" />
                    ) : null}
                  </div>
                </div>
              </div>
              
              {/* Model Selection */}
              <div className="px-4 py-3 space-y-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-gray-100 text-gray-900"
                >
                  <option value="gemini-2.0-flash-exp">Gemini 2.5 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>
              
              {/* AI Mode Toggle */}
              <div className="px-4 py-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">AI Active Mode</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={aiMode}
                      onChange={(e) => setAiMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${
                      aiMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                        aiMode ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {aiMode ? 'AI features are active' : 'Demo mode - AI features disabled'}
                </p>
              </div>
            </div>
            
            {/* AI Instructions Section */}
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">AI Instructions</span>
                <span className="text-gray-400">{showInstructions ? '−' : '+'}</span>
              </button>
              
              {showInstructions && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 bg-gray-50 max-h-[60vh] overflow-y-auto">
                  {/* Title Generation Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Title Generation
                    </label>
                    <textarea
                      value={aiInstructions.titleGeneration}
                      onChange={(e) => setAiInstructions(prev => ({ ...prev, titleGeneration: e.target.value }))}
                      placeholder="e.g., Keep titles to 2-3 words. Be descriptive but concise."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-gray-100 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Context: The uploaded image is analyzed directly. No additional context provided.
                    </p>
                  </div>
                  
                  {/* Functional Questions Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Functional Questions
                    </label>
                    <textarea
                      value={aiInstructions.functionalQuestions}
                      onChange={(e) => setAiInstructions(prev => ({ ...prev, functionalQuestions: e.target.value }))}
                      placeholder="e.g., Ask about visual hierarchy. Keep questions under 15 words."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-gray-100 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Context: AI-generated image title, user focus from first card, existing pinned answers, previously asked questions, and covered aspects.
                    </p>
                  </div>
                  
                  {/* Consequences Question 1 Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Consequences Question 1
                    </label>
                    <textarea
                      value={aiInstructions.consequencesQuestion1}
                      onChange={(e) => setAiInstructions(prev => ({ ...prev, consequencesQuestion1: e.target.value }))}
                      placeholder="e.g., Focus on data implications. Keep it concise."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-gray-100 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Context: Selected pin's functional answer, AI-generated image title, user focus from first card. (Currently uses static questions; AI generation coming soon)
                    </p>
                  </div>
                  
                  {/* Consequences Question 2 Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Consequences Question 2
                    </label>
                    <textarea
                      value={aiInstructions.consequencesQuestion2}
                      onChange={(e) => setAiInstructions(prev => ({ ...prev, consequencesQuestion2: e.target.value }))}
                      placeholder="e.g., Focus on user impact. Keep it concise."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-gray-100 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Context: Selected pin's functional answer, answer to Question 1, AI-generated image title, user focus. (Currently uses static questions; AI generation coming soon)
                    </p>
                  </div>
                  
                  {/* Values Question Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Values Question
                    </label>
                    <textarea
                      value={aiInstructions.valuesQuestion}
                      onChange={(e) => setAiInstructions(prev => ({ ...prev, valuesQuestion: e.target.value }))}
                      placeholder="e.g., Focus on ethical implications. Keep it reflective."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-gray-100 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Context: Selected pin's functional answer, consequences answers (both questions), AI-generated image title, user focus. (Currently uses static questions; AI generation coming soon)
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Delete All Pins for Selected Image */}
            {selectedImage && (
              <button
                onClick={() => handleDeleteAllTags(selectedImage.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
              >
                <Trash2 size={16} />
                <span>Delete all pins</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
