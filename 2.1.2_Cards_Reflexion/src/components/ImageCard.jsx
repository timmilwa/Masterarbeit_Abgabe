import { useState, useEffect } from 'react'
import { Pencil, HelpCircle } from 'lucide-react'
import Button from './Button'
import Input from './Input'

// Demo mode: Generate a simple headline (in real app, this would use AI)
const generateHeadline = (layerIndex) => {
  const demoHeadlines = [
    ['Weather-App'],
    ['Weather-App', 'Functional Layer'],
    ['Weather-App', 'Functional Layer', 'Data Layer'],
    ['Weather-App', 'Functional Layer', 'Data Layer', 'Presentation Layer']
  ]
  return demoHeadlines[Math.min(layerIndex, demoHeadlines.length - 1)] || ['Weather-App']
}

function ImageCard() {
  const [layers, setLayers] = useState([
    { headline: 'Weather-App', textInput: '', headlineInput: 'Weather-App', isEditingHeadline: false }
  ])
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0)
  const [newlyCreatedLayerIndex, setNewlyCreatedLayerIndex] = useState(null)

  // Generate initial headline on mount (demo mode)
  useEffect(() => {
    const initialHeadlines = generateHeadline(0)
    setLayers([{
      headline: initialHeadlines[0],
      textInput: '',
      headlineInput: initialHeadlines[0],
      isEditingHeadline: false
    }])
  }, [])

  const handleEditClick = (layerIndex) => {
    setLayers(prev => prev.map((layer, idx) => {
      if (idx === layerIndex) {
        if (layer.isEditingHeadline) {
          return { ...layer, headline: layer.headlineInput, isEditingHeadline: false }
        } else {
          return { ...layer, isEditingHeadline: true }
        }
      }
      return layer
    }))
  }

  const handleHeadlineChange = (layerIndex, value) => {
    setLayers(prev => prev.map((layer, idx) => {
      if (idx === layerIndex) {
        return { ...layer, headlineInput: value }
      }
      return layer
    }))
  }

  const handleTextInputChange = (layerIndex, value) => {
    setLayers(prev => prev.map((layer, idx) => {
      if (idx === layerIndex) {
        return { ...layer, textInput: value }
      }
      return layer
    }))
  }

  const handleNext = () => {
    if (currentLayerIndex < layers.length - 1) {
      // Go to next existing layer
      setNewlyCreatedLayerIndex(null)
      setCurrentLayerIndex(prev => prev + 1)
    } else {
      // Create new layer
      const newHeadlines = generateHeadline(layers.length)
      const newHeadline = newHeadlines[layers.length] || `Layer ${layers.length + 1}`
      const newIndex = layers.length
      
      // Add new layer first
      setLayers(prev => [...prev, {
        headline: newHeadline,
        textInput: '',
        headlineInput: newHeadline,
        isEditingHeadline: false
      }])
      
      // Mark this layer as newly created for animation
      setNewlyCreatedLayerIndex(newIndex)
      
      // Switch to new layer after a brief delay to trigger animation
      setTimeout(() => {
        setCurrentLayerIndex(newIndex)
        // Clear animation flag after animation completes
        setTimeout(() => {
          setNewlyCreatedLayerIndex(null)
        }, 400)
      }, 10)
    }
  }

  const handlePrevious = () => {
    if (currentLayerIndex > 0) {
      setNewlyCreatedLayerIndex(null)
      setCurrentLayerIndex(prev => prev - 1)
    }
  }

  const currentLayer = layers[currentLayerIndex]
  const previousLayer = currentLayerIndex > 0 ? layers[currentLayerIndex - 1] : null
  const isFirstLayer = currentLayerIndex === 0

  return (
    <div className="space-y-4">
      {/* Card Stack Container */}
      <div className="relative min-h-[200px]">
        {/* Previous Layer (Background Card) - Only visible if there's a previous layer */}
        {previousLayer && (
          <div 
            className="absolute top-[-20px] left-0 bg-[#E0E0E0] border border-[#A0A0A0] rounded-2xl p-4 z-0"
            style={{ 
              transform: 'translateY(-10px) scale(0.85)',
              transformOrigin: 'top center',
              width: '92%',
              left: '4%'
            }}
          >
            <h3 className="text-sm font-medium text-[#A0A0A0]">
              {previousLayer.headline}
            </h3>
          </div>
        )}

        {/* Current Layer (Active Card) */}
        <div 
          key={newlyCreatedLayerIndex === currentLayerIndex ? `card-new-${currentLayerIndex}` : `card-${currentLayerIndex}`}
          className={`relative rounded-2xl p-6 space-y-4 z-10 ${
            isFirstLayer 
              ? 'bg-[#E0E0E0] border border-[#A0A0A0]' 
              : `bg-[#BDDAFF] border-[3px] border-[#007AFF] ${newlyCreatedLayerIndex === currentLayerIndex ? 'animate-slide-up' : ''}`
          }`}
        >
          {/* Headline Section */}
          <div className="flex items-center gap-1 -mt-2">
            {currentLayer.isEditingHeadline ? (
              <input
                type="text"
                value={currentLayer.headlineInput}
                onChange={(e) => handleHeadlineChange(currentLayerIndex, e.target.value)}
                onBlur={() => handleEditClick(currentLayerIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditClick(currentLayerIndex)
                  }
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[3px] ${
                  isFirstLayer
                    ? 'bg-gray-200 text-[#929292] focus:ring-[#929292]/50'
                    : 'bg-white/50 text-[#007AFF] focus:ring-[#007AFF]/50'
                }`}
                autoFocus
              />
            ) : (
              <h3 className={`text-[20px] font-medium ${
                isFirstLayer ? 'text-[#929292]' : 'text-[#007AFF]'
              }`}>
                {currentLayer.headline}
              </h3>
            )}
            <button
              onClick={() => handleEditClick(currentLayerIndex)}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200 focus-visible:ring-[3px] focus-visible:outline-none ${
                isFirstLayer
                  ? 'hover:bg-accent focus-visible:ring-[#929292]/50'
                  : 'hover:bg-white/30 focus-visible:ring-[#007AFF]/50'
              }`}
              aria-label="Edit headline"
            >
              <Pencil className={`w-4 h-4 ${isFirstLayer ? 'text-[#929292]' : 'text-[#007AFF]'}`} />
            </button>
            {!isFirstLayer && (
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/30 transition-all duration-200 focus-visible:ring-[#007AFF]/50 focus-visible:ring-[3px] focus-visible:outline-none"
                aria-label="Help"
              >
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Input Field */}
          <div>
            <Input
              placeholder="Do you want to focus on a specific aspect?"
              value={currentLayer.textInput}
              onChange={(e) => handleTextInputChange(currentLayerIndex, e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-start items-center ml-[10px]">
        <Button onClick={handleNext} className="py-1 rounded-lg bg-black text-white hover:bg-black/90">
          Next Layer
        </Button>
        {currentLayerIndex > 0 && (
          <>
            <div className="w-16"></div>
            <Button 
              onClick={handlePrevious} 
              variant="ghost" 
              className="py-1 rounded-lg text-black hover:bg-transparent"
            >
              Previous Layer
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageCard

