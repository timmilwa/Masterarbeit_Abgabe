import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Trash2, Check, X, Loader2 } from 'lucide-react'
import EmptyState from './components/EmptyState'
import ImageCard from './components/ImageCard'
import Tag from './components/Tag'
import { validateApiKey, generateImageTitle } from './services/geminiService'

function App() {
  const [uploadedImage, setUploadedImage] = useState(true) // Set to true to show default image
  const [imageUrl, setImageUrl] = useState('/weather-app.png') // Default weather app image
  const [tags, setTags] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0)
  const [activeTagId, setActiveTagId] = useState(null)
  const [hoveredTagId, setHoveredTagId] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const imageRef = useRef(null)
  const settingsRef = useRef(null)
  const validationTimeoutRef = useRef(null)
  
  // AI-related state
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
  const [aiGeneratedTitle, setAiGeneratedTitle] = useState('')
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  
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

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setUploadedImage(file)
      
      // Generate AI title if AI mode is active and API key is valid
      if (aiMode && apiKey && isApiKeyValid) {
        setIsGeneratingTitle(true)
        setAiGeneratedTitle('')
        try {
          const title = await generateImageTitle(file, apiKey, selectedModel, aiInstructions)
          if (title) {
            setAiGeneratedTitle(title)
          } else {
            setAiGeneratedTitle('')
          }
        } catch (error) {
          console.error('Failed to generate image title:', error)
          setAiGeneratedTitle('')
        } finally {
          setIsGeneratingTitle(false)
        }
      } else {
        // Clear AI title if not in AI mode
        setAiGeneratedTitle('')
        setIsGeneratingTitle(false)
      }
    }
  }

  const handleImageClick = (e) => {
    // Only allow tagging when on Functional Layer (index 1)
    if (currentLayerIndex !== 1) return
    if (!imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Create new pending tag (not saved yet)
    const newTagId = Date.now() + Math.random()
    const newTag = {
      id: newTagId,
      x: Math.max(0, Math.min(100, x)), // Clamp between 0-100
      y: Math.max(0, Math.min(100, y)), // Clamp between 0-100
      text: '',
      questionId: currentQuestionIndex,
      saved: false, // Tag is pending until user clicks plus button
      dataLayerResponses: null, // Initialize as null for new tags
      valuesLayerResponses: null // Initialize as null for new tags
    }
    
    setTags(prev => [...prev, newTag])
    setActiveTagId(newTagId) // Set the new tag as active
  }

  const handleTagTextChange = (id, text) => {
    setTags(prev => prev.map(tag => 
      tag.id === id ? { ...tag, text } : tag
    ))
  }

  const handleSaveTag = (id) => {
    setTags(prev => prev.map(tag => 
      tag.id === id ? { ...tag, saved: true } : tag
    ))
  }

  const handleDeleteTag = (id) => {
    setTags(prev => prev.filter(tag => tag.id !== id))
    if (activeTagId === id) {
      setActiveTagId(null) // Clear active tag if deleted
    }
  }

  const handleTagClick = (id) => {
    setActiveTagId(id) // Set clicked tag as active
  }

  const handleTagHover = (id) => {
    setHoveredTagId(id) // Set hovered tag
  }

  const handleTagHoverEnd = () => {
    setHoveredTagId(null) // Clear hovered tag
  }

  const handleDeleteAllTags = () => {
    setTags([])
    setActiveTagId(null)
    setHoveredTagId(null)
    setIsSettingsOpen(false)
  }

  const handleDeleteImage = () => {
    // Clean up the object URL if it's not the default image
    if (imageUrl && imageUrl !== '/weather-app.png' && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl)
    }
    setImageUrl(null)
    setUploadedImage(null)
    setTags([])
    setActiveTagId(null)
    setHoveredTagId(null)
    setAiGeneratedTitle('')
  }

  const handleLayerIndexChange = (newLayerIndex) => {
    setCurrentLayerIndex(newLayerIndex)
    // Deselect all pins when switching to Consequences card (index 2) or Values card (index 3)
    if (newLayerIndex === 2 || newLayerIndex === 3) {
      setActiveTagId(null)
    }
  }

  const handleDataLayerResponse = (tagId, questionIndex, answer, questionText) => {
    setTags(prev => prev.map(tag => {
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
    }))
  }

  const handleValuesLayerResponse = (tagId, answer, questionText) => {
    setTags(prev => prev.map(tag => {
      if (tag.id === tagId) {
        const currentResponses = tag.valuesLayerResponses || {
          question: null,
          answer: null,
          completed: false
        }
        
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
    }))
  }

  const handleConsequencesQuestionGenerated = (tagId, questionNumber, questionText) => {
    setTags(prev => prev.map(tag => {
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
    }))
  }

  const handleValuesQuestionGenerated = (tagId, questionText) => {
    setTags(prev => prev.map(tag => {
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
    }))
  }

  // Debounced API key validation
  const handleApiKeyChange = useCallback((newApiKey) => {
    setApiKey(newApiKey)
    
    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }
    
    // If empty, clear validation state
    if (!newApiKey || newApiKey.trim() === '') {
      setIsApiKeyValid(false)
      setIsValidatingApiKey(false)
      return
    }
    
    // Set validating state
    setIsValidatingApiKey(true)
    setIsApiKeyValid(false)
    
    // Debounce validation
    validationTimeoutRef.current = setTimeout(async () => {
      const valid = await validateApiKey(newApiKey)
      setIsApiKeyValid(valid)
      setIsValidatingApiKey(false)
    }, 500) // 500ms debounce
  }, [])

  // Validate API key on mount if it exists
  useEffect(() => {
    if (apiKey) {
      setIsValidatingApiKey(true)
      validateApiKey(apiKey).then(valid => {
        setIsApiKeyValid(valid)
        setIsValidatingApiKey(false)
      })
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, []) // Only run on mount

  // Save API key and model to localStorage when they change
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

  return (
    <div className="min-h-screen bg-background">
      {!imageUrl ? (
        <EmptyState onImageUpload={handleImageUpload} />
      ) : (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Image Section */}
            <div className="flex-shrink-0">
              <div 
                className={`relative rounded-lg overflow-visible ${currentLayerIndex === 1 ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={(e) => {
                  // Only handle click if not clicking on a tag
                  if (!e.target.closest('[data-tag-container]')) {
                    if (currentLayerIndex === 1) {
                      // On Functional Layer: create new tag (which will be set as active)
                      handleImageClick(e)
                    } else {
                      // On other layers: just clear active tag
                      setActiveTagId(null)
                    }
                  }
                }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Uploaded"
                  className="h-auto max-h-[80vh] object-contain pointer-events-none"
                />
                {/* Render tags */}
                {tags
                  .filter(tag => {
                    // When value card is active (layer index 3), only show pins that have both functional and consequence pins
                    if (currentLayerIndex === 3) {
                      return tag.dataLayerResponses?.completed === true
                    }
                    // Otherwise, show all tags
                    return true
                  })
                  .map(tag => (
                    <Tag
                      key={tag.id}
                      tag={tag}
                      isActive={activeTagId === tag.id}
                      isHovered={hoveredTagId === tag.id}
                      onTextChange={handleTagTextChange}
                      onSave={handleSaveTag}
                      onDelete={handleDeleteTag}
                      onClick={handleTagClick}
                      onHover={handleTagHover}
                      onHoverEnd={handleTagHoverEnd}
                      imageRef={imageRef}
                      currentLayerIndex={currentLayerIndex}
                      activeTagId={activeTagId}
                    />
                  ))}
              </div>
              {/* Delete Image Button */}
              <button
                onClick={handleDeleteImage}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Delete image"
              >
                <Trash2 size={16} />
                <span>Delete image</span>
              </button>
            </div>

            {/* Card Section - Top Right */}
            <div className="w-full lg:w-96 flex flex-col gap-4 lg:mt-[50px]">
              <ImageCard 
                tags={tags}
                currentQuestionIndex={currentQuestionIndex}
                onQuestionIndexChange={setCurrentQuestionIndex}
                onLayerIndexChange={handleLayerIndexChange}
                activeTagId={activeTagId}
                onDataLayerResponse={handleDataLayerResponse}
                onValuesLayerResponse={handleValuesLayerResponse}
                onConsequencesQuestionGenerated={handleConsequencesQuestionGenerated}
                onValuesQuestionGenerated={handleValuesQuestionGenerated}
                aiGeneratedTitle={aiGeneratedTitle}
                aiMode={aiMode}
                isGeneratingTitle={isGeneratingTitle}
                apiKey={apiKey}
                selectedModel={selectedModel}
                aiInstructions={aiInstructions}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Button - Bottom Left (Always Visible) */}
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
                
                {/* Delete All Pins */}
                <button
                  onClick={handleDeleteAllTags}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
                >
                  <Trash2 size={16} />
                  <span>Delete all pins</span>
                </button>
              </div>
            )}
          </div>
    </div>
  )
}

export default App

