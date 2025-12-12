import { useRef, useEffect, useState } from 'react'
import ImageCard from './ImageCard'
import { useCanvasContext } from './Canvas'

function ReflectionCards({
  imageId,
  imagePosition, // World Space coordinates
  imageSize, // Screen pixels
  tags = [],
  currentQuestionIndex,
  onQuestionIndexChange,
  onLayerIndexChange,
  activeTagId,
  onDataLayerResponse,
  onValuesLayerResponse,
  onConsequencesQuestionGenerated,
  onValuesQuestionGenerated,
  aiGeneratedTitle,
  aiMode,
  isGeneratingTitle,
  apiKey,
  selectedModel,
  aiInstructions
}) {
  const canvasContext = useCanvasContext()
  const { transform } = canvasContext
  const cardsRef = useRef(null)
  const [cardsPosition, setCardsPosition] = useState({ x: 0, y: 0 })

  // Calculate position for cards (to the right of image)
  useEffect(() => {
    if (imagePosition && imageSize) {
      // Convert imageSize from screen pixels to World Space
      const imageWidthWorld = imageSize.width / transform.scale
      const gapWorld = 20 / transform.scale // Gap in World Space
      
      // Position cards to the right of the image with a gap
      const cardsX = imagePosition.x + (imageWidthWorld / 2) + gapWorld
      const cardsY = imagePosition.y // Align top with image center
      
      setCardsPosition({ x: cardsX, y: cardsY })
    }
  }, [imagePosition, imageSize, transform.scale])

  return (
    <div
      ref={cardsRef}
      className="reflection-cards absolute pointer-events-auto"
      style={{
        left: `${cardsPosition.x}px`,
        top: `${cardsPosition.y}px`,
        transform: 'translateY(-50%)',
        zIndex: 20,
        width: '384px' // lg:w-96 = 384px
      }}
    >
      <ImageCard
        tags={tags}
        currentQuestionIndex={currentQuestionIndex}
        onQuestionIndexChange={onQuestionIndexChange}
        onLayerIndexChange={onLayerIndexChange}
        activeTagId={activeTagId}
        onDataLayerResponse={onDataLayerResponse}
        onValuesLayerResponse={onValuesLayerResponse}
        onConsequencesQuestionGenerated={onConsequencesQuestionGenerated}
        onValuesQuestionGenerated={onValuesQuestionGenerated}
        aiGeneratedTitle={aiGeneratedTitle}
        aiMode={aiMode}
        isGeneratingTitle={isGeneratingTitle}
        apiKey={apiKey}
        selectedModel={selectedModel}
        aiInstructions={aiInstructions}
      />
    </div>
  )
}

export default ReflectionCards

