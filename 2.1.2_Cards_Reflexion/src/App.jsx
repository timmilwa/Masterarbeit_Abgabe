import { useState, useRef, useEffect } from 'react'
import { Settings, Trash2 } from 'lucide-react'
import EmptyState from './components/EmptyState'
import ImageCard from './components/ImageCard'
import Tag from './components/Tag'

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

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setUploadedImage(file)
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
              />
            </div>
          </div>
          
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
              <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] overflow-hidden">
                <button
                  onClick={handleDeleteAllTags}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete all pins</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

