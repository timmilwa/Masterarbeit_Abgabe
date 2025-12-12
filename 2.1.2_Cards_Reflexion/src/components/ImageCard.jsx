import { useState, useEffect } from 'react'
import { Pencil, Pin, CircleQuestionMark } from 'lucide-react'
import Button from './Button'
import Input from './Input'

// Define the three different cards with different content
const initialLayers = [
  { 
    headline: 'Weather-App',
    content: 'This is the Weather-App card with weather information and forecasts.'
  },
  { 
    headline: 'Functional Layer',
    content: 'This is the Functional Layer card showing functional components and logic.'
  },
  { 
    headline: 'Data Layer',
    content: 'This is the Data Layer card displaying data structures and storage.'
  }
]

// Demo questions for the "Next Question" functionality
const demoQuestions = [
  'This is a Comment from an AI',
  'How does the weather data get fetched and displayed?',
  'What are the main functional components of this application?'
]

function ImageCard({ tags = [], currentQuestionIndex = 0, onQuestionIndexChange, onLayerIndexChange }) {
  const [layers, setLayers] = useState(initialLayers)
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isGoingForward, setIsGoingForward] = useState(true)
  const [exitingCardIndex, setExitingCardIndex] = useState(null)
  const [weatherInput, setWeatherInput] = useState('')
  const [editingHeadlineIndex, setEditingHeadlineIndex] = useState(null)
  const [editingHeadlineValue, setEditingHeadlineValue] = useState('')

  // Sync initial layer index with parent
  useEffect(() => {
    if (onLayerIndexChange) {
      onLayerIndexChange(currentLayerIndex)
    }
  }, []) // Only on mount

  const handleNext = () => {
    if (currentLayerIndex < initialLayers.length - 1) {
      setIsTransitioning(true)
      setIsGoingForward(true)
      setAnimationKey(prev => prev + 1)
      // Update index after a brief delay to allow transition to start
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const newIndex = currentLayerIndex + 1
          setCurrentLayerIndex(newIndex)
          if (onLayerIndexChange) {
            onLayerIndexChange(newIndex)
          }
          setTimeout(() => setIsTransitioning(false), 400)
        })
      })
    }
  }

  const handlePrevious = () => {
    if (currentLayerIndex > 0) {
      setIsTransitioning(true)
      setIsGoingForward(false)
      // Track the card that's exiting
      setExitingCardIndex(currentLayerIndex)
      setAnimationKey(prev => prev + 1)
      // Update index after a brief delay to allow transition to start
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const newIndex = currentLayerIndex - 1
          setCurrentLayerIndex(newIndex)
          if (onLayerIndexChange) {
            onLayerIndexChange(newIndex)
          }
          setTimeout(() => {
            setIsTransitioning(false)
            setExitingCardIndex(null)
          }, 400)
        })
      })
    }
  }

  const handleEditHeadline = (index) => {
    setEditingHeadlineIndex(index)
    setEditingHeadlineValue(layers[index].headline)
  }

  const handleSaveHeadline = (index) => {
    const updatedLayers = [...layers]
    updatedLayers[index].headline = editingHeadlineValue
    setLayers(updatedLayers)
    setEditingHeadlineIndex(null)
    setEditingHeadlineValue('')
  }

  const handleCancelEdit = () => {
    setEditingHeadlineIndex(null)
    setEditingHeadlineValue('')
  }

  const handleNextQuestion = () => {
    const nextIndex = (currentQuestionIndex + 1) % demoQuestions.length
    if (onQuestionIndexChange) {
      onQuestionIndexChange(nextIndex)
    }
  }

  // Calculate tag count for current question (only saved tags)
  const tagCount = tags.filter(tag => tag.questionId === currentQuestionIndex && tag.saved).length

  const currentLayer = layers[currentLayerIndex]
  const previousLayer = currentLayerIndex > 0 ? layers[currentLayerIndex - 1] : null
  const isFirstLayer = currentLayerIndex === 0
  const isSecondLayer = currentLayerIndex === 1
  const isThirdLayer = currentLayerIndex === 2
  const previousIsFirstLayer = previousLayer && currentLayerIndex === 1
  const previousIsSecondLayer = previousLayer && currentLayerIndex === 2

  // Helper function to get card colors
  const getCardColors = (index) => {
    if (index === 0) {
      return {
        bg: 'bg-[#E0E0E0]',
        border: 'border-[#A0A0A0]',
        text: 'text-[#929292]'
      }
    } else if (index === 1) {
      return {
        bg: 'bg-[#BDDAFF]',
        border: 'border-[#007AFF]',
        text: 'text-[#007AFF]'
      }
    } else {
      return {
        bg: 'bg-[#F8D866]',
        border: 'border-[#AA8302]',
        text: 'text-[#AA8302]'
      }
    }
  }

  return (
    <div className="space-y-2">
      {/* Card Stack Container */}
      <div className="relative min-h-[200px] pb-20">
        {/* Render all cards and position them based on their state */}
        {layers.map((layer, index) => {
          const isActive = index === currentLayerIndex
          const isBackground = index === currentLayerIndex - 1
          const isExiting = index === exitingCardIndex
          const colors = getCardColors(index)
          
          // Render active card, background card, or exiting card
          if (!isActive && !isBackground && !isExiting) return null
          
          // Get semi-transparent background for active card
          const getActiveBg = () => {
            if (index === 0) return 'bg-[#E0E0E0]/50'
            if (index === 1) return 'bg-[#BDDAFF]/50'
            return 'bg-[#F8D866]/50'
          }

          return (
            <div
              key={`card-${index}`}
              className={`absolute ${isActive ? getActiveBg() : colors.bg} border-[3px] ${colors.border} rounded-2xl ${isActive ? 'z-10 backdrop-blur-md' : isExiting ? 'z-20' : 'z-0'} ${
                isActive && !isFirstLayer && isGoingForward && animationKey > 0 ? 'animate-slide-up' : ''
              }`}
              style={{
                ...(isExiting ? {
                  top: '0',
                  left: '0',
                  transform: 'translateY(100%)',
                  opacity: 0,
                  width: '100%',
                  minHeight: '150px',
                  transition: 'transform 0.4s ease-out, opacity 0.4s ease-out'
                } : isActive ? {
                  top: '0',
                  left: '0',
                  transform: 'translateX(0) translateY(0) scale(1)',
                  width: '100%',
                  minHeight: '150px',
                  transition: 'transform 0.4s ease-out, top 0.4s ease-out, left 0.4s ease-out'
                } : {
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(-20px) scale(0.85)',
                  transformOrigin: 'center',
                  width: '100%',
                  minHeight: '150px',
                  transition: 'transform 0.4s ease-out, top 0.4s ease-out, left 0.4s ease-out'
                })
              }}
            >
              <div className="p-5 relative">
                <div className={`absolute z-10 flex items-center gap-3 ${colors.text}`}
                style={{
                  ...(isBackground ? {
                    top: '8px',
                    left: '16px',
                    transition: 'top 0.4s ease-out, left 0.4s ease-out'
                  } : {
                    top: '16px',
                    left: '16px',
                    transition: 'top 0.4s ease-out, left 0.4s ease-out'
                  })
                }}>
                  {index === 0 && editingHeadlineIndex === index ? (
                    <>
                      <Input
                        value={editingHeadlineValue}
                        onChange={(e) => setEditingHeadlineValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveHeadline(index)
                          } else if (e.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        className={`${colors.text} border ${colors.border} text-[20px] font-medium`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveHeadline(index)}
                        className="p-1 hover:opacity-70 transition-opacity"
                        aria-label="Save headline"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:opacity-70 transition-opacity"
                        aria-label="Cancel editing"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className={`${isBackground ? 'text-[16px]' : 'text-[20px]'} font-medium`}>
                        {layer.headline}
                      </h3>
                      {index === 0 && (
                        <button
                          onClick={() => handleEditHeadline(index)}
                          className={`p-1 hover:opacity-70 transition-opacity duration-[400ms] ease-out ${!isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          aria-label="Edit headline"
                          style={{
                            transition: 'opacity 400ms ease-out'
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {index === 1 && (
                        <CircleQuestionMark size={20} className="text-[#007AFF]" />
                      )}
                    </>
                  )}
                </div>
                {index === 0 ? (
                  <div className={`${isBackground ? 'pt-10' : 'pt-12'}`}>
                    <Input
                      value={weatherInput}
                      onChange={(e) => setWeatherInput(e.target.value)}
                      placeholder="Do you want to focus on a specific aspect? "
                      className={`${colors.text} border ${colors.border}`}
                    />
                  </div>
                ) : index === 1 ? (
                  <div className={`flex flex-col ${isBackground ? 'pt-10' : 'pt-12'}`}>
                    {/* Chat bubble aligned to the left */}
                    <div className="flex items-start justify-start mb-4">
                      <div className="bg-white rounded-lg px-4 py-3 max-w-[80%]">
                        <p className={`text-sm ${colors.text}`}>
                          {demoQuestions[currentQuestionIndex]}
                        </p>
                      </div>
                    </div>
                    
                    {/* Bottom section with text and button */}
                    <div className="flex items-center justify-between mt-2">
                      {/* Text with icon in bottom left */}
                      <div className="flex items-center gap-2">
                        <Pin size={16} className={colors.text} />
                        <p className={`text-sm ${colors.text}`}>
                          {tagCount === 0 
                            ? 'Click on the pic to answer'
                            : `${tagCount} tagged ${tagCount === 1 ? 'answer' : 'answers'}`
                          }
                        </p>
                      </div>
                      
                      {/* Button in bottom right */}
                      <div className="ml-4">
                        <Button 
                          onClick={handleNextQuestion}
                          className="px-3 py-1 rounded-[9px] !bg-[#007AFF] !text-white hover:!bg-[#007AFF]/90 border-0"
                        >
                          Next Question
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${colors.text} ${isBackground ? 'pt-10' : 'pt-12'}`}>
                    {layer.content}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-start items-center gap-2 mt-4 ml-[10px] relative z-30">
        <Button onClick={handleNext} className="px-3 py-1 rounded-[9px] bg-black text-white hover:bg-black/90">
          Next Layer
        </Button>
        {currentLayerIndex > 0 && (
          <Button 
            onClick={handlePrevious} 
            variant="ghost" 
            className="px-3 py-1 rounded-xl text-black"
          >
            Previous Layer
          </Button>
        )}
      </div>
    </div>
  )
}

export default ImageCard

