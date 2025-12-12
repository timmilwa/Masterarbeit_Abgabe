import { useState, useRef } from 'react'
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
  const imageRef = useRef(null)

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
      saved: false // Tag is pending until user clicks plus button
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
                className={`relative rounded-lg overflow-hidden ${currentLayerIndex === 1 ? 'cursor-crosshair' : 'cursor-default'}`}
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
                {tags.map(tag => (
                  <Tag
                    key={tag.id}
                    tag={tag}
                    isActive={activeTagId === tag.id}
                    onTextChange={handleTagTextChange}
                    onSave={handleSaveTag}
                    onDelete={handleDeleteTag}
                    onClick={handleTagClick}
                    imageRef={imageRef}
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
                onLayerIndexChange={setCurrentLayerIndex}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

