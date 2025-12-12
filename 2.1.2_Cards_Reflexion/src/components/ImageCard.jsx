import { useState, useEffect, useRef } from 'react'
import { Pencil, Pin, CircleQuestionMark, CircleCheck, CircleDotDashed, ArrowUp, Loader2 } from 'lucide-react'
import Button from './Button'
import Input from './Input'
import { generateFunctionalQuestion, generateConsequencesQuestion, generateValuesQuestion } from '../services/geminiService'

// Define the four different cards with different content
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
    headline: 'Consequences',
    content: 'This is the Consequences card displaying data structures and storage.'
  },
  { 
    headline: 'Values',
    content: 'This is the Values card displaying values and principles.'
  }
]

// Demo questions for the "Next Question" functionality
const demoQuestions = [
  'lorem ipsum',
  'How does the weather data get fetched and displayed?',
  'What are the main functional components of this application?'
]

function ImageCard({ tags = [], currentQuestionIndex = 0, onQuestionIndexChange, onLayerIndexChange, activeTagId = null, onDataLayerResponse, onValuesLayerResponse, onConsequencesQuestionGenerated, onValuesQuestionGenerated, aiGeneratedTitle = '', aiMode = false, isGeneratingTitle = false, apiKey = '', selectedModel = 'gemini-2.0-flash-exp', aiInstructions = {} }) {
  const [layers, setLayers] = useState(initialLayers)
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isGoingForward, setIsGoingForward] = useState(true)
  const [exitingCardIndex, setExitingCardIndex] = useState(null)
  const [weatherInput, setWeatherInput] = useState('')
  const [editingHeadlineIndex, setEditingHeadlineIndex] = useState(null)
  const [editingHeadlineValue, setEditingHeadlineValue] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [lastActiveTagId, setLastActiveTagId] = useState(null)
  const [currentDataLayerQuestion, setCurrentDataLayerQuestion] = useState(0) // 0 = question 1, 1 = question 2, 2 = completed
  const [currentValuesLayerQuestion, setCurrentValuesLayerQuestion] = useState(0) // 0 = question, 1 = completed
  const chatMessagesEndRef = useRef(null)
  const cardContainerRef = useRef(null)
  const [navButtonsTop, setNavButtonsTop] = useState(500)
  
  // AI-generated questions state for Functional Layer
  const [functionalQuestions, setFunctionalQuestions] = useState([])
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  const [coveredAspects, setCoveredAspects] = useState([])
  const [questionHistory, setQuestionHistory] = useState([])
  
  // Loading states for Consequences and Values questions
  const [isGeneratingConsequencesQuestion, setIsGeneratingConsequencesQuestion] = useState(false)
  const [isGeneratingValuesQuestion, setIsGeneratingValuesQuestion] = useState(false)
  
  // Configurable questions for Consequences
  const dataLayerQuestions = [
    'Question 1 for Consequences',
    'Question 2 for Consequences'
  ]
  
  // Configurable question for Values
  const valuesLayerQuestion = 'Question for Values'

  // Sync layer index with parent
  useEffect(() => {
    if (onLayerIndexChange) {
      onLayerIndexChange(currentLayerIndex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayerIndex]) // Only depend on currentLayerIndex to avoid unnecessary re-renders

  // Handle chat messages when pin is selected/deselected
  useEffect(() => {
    if (currentLayerIndex === 2) { // Consequences
      if (activeTagId) {
        // Pin is selected
        if (activeTagId !== lastActiveTagId) {
          // Different pin selected - check existing responses and initialize chat
          const activeTag = tags.find(tag => tag.id === activeTagId)
          const responses = activeTag?.dataLayerResponses
          const functionalAnswer = activeTag?.text || ''
          
          // Generate questions if in AI mode and questions don't exist
          if (aiMode && apiKey && functionalAnswer) {
            // Generate Question 1 if missing
            if (!responses || !responses.question1) {
              setIsGeneratingConsequencesQuestion(true)
              setCurrentDataLayerQuestion(0)
              setChatMessages([])
              
              const generateQ1 = async () => {
                try {
                  const context = {
                    imageTitle: aiGeneratedTitle || 'the interface',
                    userFocus: weatherInput || '',
                    functionalAnswer: functionalAnswer,
                    question1Answer: '',
                    customInstructions: aiInstructions
                  }
                  
                  const question1 = await generateConsequencesQuestion(apiKey, selectedModel, context, 1)
                  
                  if (question1) {
                    // Store question in tag responses
                    if (onConsequencesQuestionGenerated) {
                      onConsequencesQuestionGenerated(activeTagId, 1, question1)
                    }
                    setChatMessages([{ type: 'ai', text: question1 }])
                  } else {
                    // Fallback to static question
                    setChatMessages([{ type: 'ai', text: dataLayerQuestions[0] }])
                  }
                } catch (error) {
                  console.error('Error generating consequences question 1:', error)
                  setChatMessages([{ type: 'ai', text: dataLayerQuestions[0] }])
                } finally {
                  setIsGeneratingConsequencesQuestion(false)
                }
              }
              
              generateQ1()
            } 
            // Generate Question 2 if Question 1 is answered but Question 2 is missing
            else if (responses.answer1 && (!responses.question2)) {
              setIsGeneratingConsequencesQuestion(true)
              setCurrentDataLayerQuestion(1)
              setChatMessages([
                { type: 'ai', text: responses.question1 },
                { type: 'user', text: responses.answer1 }
              ])
              
              const generateQ2 = async () => {
                try {
                  const context = {
                    imageTitle: aiGeneratedTitle || 'the interface',
                    userFocus: weatherInput || '',
                    functionalAnswer: functionalAnswer,
                    question1Answer: responses.answer1,
                    customInstructions: aiInstructions
                  }
                  
                  const question2 = await generateConsequencesQuestion(apiKey, selectedModel, context, 2)
                  
                  if (question2) {
                    // Store question in tag responses
                    if (onConsequencesQuestionGenerated) {
                      onConsequencesQuestionGenerated(activeTagId, 2, question2)
                    }
                    setChatMessages(prev => [...prev, { type: 'ai', text: question2 }])
                  } else {
                    // Fallback to static question
                    setChatMessages(prev => [...prev, { type: 'ai', text: dataLayerQuestions[1] }])
                  }
                } catch (error) {
                  console.error('Error generating consequences question 2:', error)
                  setChatMessages(prev => [...prev, { type: 'ai', text: dataLayerQuestions[1] }])
                } finally {
                  setIsGeneratingConsequencesQuestion(false)
                }
              }
              
              generateQ2()
            }
            // Show existing questions if they exist
            else if (responses && responses.question1) {
              if (!responses || !responses.answer1) {
                // Show question 1
                setCurrentDataLayerQuestion(0)
                const question1 = responses.question1 || dataLayerQuestions[0]
                setChatMessages([{ type: 'ai', text: question1 }])
              } else if (!responses.answer2) {
                // Show question 2
                setCurrentDataLayerQuestion(1)
                const question1 = responses.question1 || dataLayerQuestions[0]
                const question2 = responses.question2 || dataLayerQuestions[1]
                setChatMessages([
                  { type: 'ai', text: question1 },
                  { type: 'user', text: responses.answer1 },
                  { type: 'ai', text: question2 }
                ])
              } else {
                // Completed - show all messages
                setCurrentDataLayerQuestion(2)
                const question1 = responses.question1 || dataLayerQuestions[0]
                const question2 = responses.question2 || dataLayerQuestions[1]
                setChatMessages([
                  { type: 'ai', text: question1 },
                  { type: 'user', text: responses.answer1 },
                  { type: 'ai', text: question2 },
                  { type: 'user', text: responses.answer2 }
                ])
              }
            }
          } else {
            // Demo mode or no AI - use static questions
            if (!responses || !responses.completed) {
              // Not completed - determine which question to show
              if (!responses || !responses.answer1) {
                // Show question 1
                setCurrentDataLayerQuestion(0)
                const question1 = responses?.question1 || dataLayerQuestions[0]
                setChatMessages([{ type: 'ai', text: question1 }])
              } else if (!responses.answer2) {
                // Show question 2
                setCurrentDataLayerQuestion(1)
                const question1 = responses.question1 || dataLayerQuestions[0]
                const question2 = responses.question2 || dataLayerQuestions[1]
                setChatMessages([
                  { type: 'ai', text: question1 },
                  { type: 'user', text: responses.answer1 },
                  { type: 'ai', text: question2 }
                ])
              }
            } else {
              // Completed - show all messages and completion state
              setCurrentDataLayerQuestion(2)
              const question1 = responses.question1 || dataLayerQuestions[0]
              const question2 = responses.question2 || dataLayerQuestions[1]
              setChatMessages([
                { type: 'ai', text: question1 },
                { type: 'user', text: responses.answer1 },
                { type: 'ai', text: question2 },
                { type: 'user', text: responses.answer2 }
              ])
            }
          }
          
          setChatInput('')
          setLastActiveTagId(activeTagId)
        }
        // If same pin, keep existing messages and state
      } else {
        // No pin selected - clear messages
        setChatMessages([])
        setChatInput('')
        setLastActiveTagId(null)
        setCurrentDataLayerQuestion(0)
        setIsGeneratingConsequencesQuestion(false)
      }
    } else if (currentLayerIndex === 3) { // Values
      if (activeTagId) {
        // Pin is selected
        if (activeTagId !== lastActiveTagId) {
          // Different pin selected - check existing responses and initialize chat
          const activeTag = tags.find(tag => tag.id === activeTagId)
          const responses = activeTag?.valuesLayerResponses
          const dataResponses = activeTag?.dataLayerResponses
          const functionalAnswer = activeTag?.text || ''
          
          // Generate question if in AI mode and question doesn't exist
          if (aiMode && apiKey && functionalAnswer && dataResponses?.completed) {
            if (!responses || !responses.question) {
              setIsGeneratingValuesQuestion(true)
              setCurrentValuesLayerQuestion(0)
              setChatMessages([])
              
              const generateValuesQ = async () => {
                try {
                  const context = {
                    imageTitle: aiGeneratedTitle || 'the interface',
                    userFocus: weatherInput || '',
                    functionalAnswer: functionalAnswer,
                    consequencesAnswer1: dataResponses.answer1 || '',
                    consequencesAnswer2: dataResponses.answer2 || '',
                    customInstructions: aiInstructions
                  }
                  
                  const question = await generateValuesQuestion(apiKey, selectedModel, context)
                  
                  if (question) {
                    // Store question in tag responses
                    if (onValuesQuestionGenerated) {
                      onValuesQuestionGenerated(activeTagId, question)
                    }
                    setChatMessages([{ type: 'ai', text: question }])
                  } else {
                    // Fallback to static question
                    setChatMessages([{ type: 'ai', text: valuesLayerQuestion }])
                  }
                } catch (error) {
                  console.error('Error generating values question:', error)
                  setChatMessages([{ type: 'ai', text: valuesLayerQuestion }])
                } finally {
                  setIsGeneratingValuesQuestion(false)
                }
              }
              
              generateValuesQ()
            } else {
              // Show existing question
              if (!responses.completed) {
                // Not completed - show question
                setCurrentValuesLayerQuestion(0)
                const question = responses.question || valuesLayerQuestion
                setChatMessages([{ type: 'ai', text: question }])
              } else {
                // Completed - show all messages and completion state
                setCurrentValuesLayerQuestion(1)
                const question = responses.question || valuesLayerQuestion
                setChatMessages([
                  { type: 'ai', text: question },
                  { type: 'user', text: responses.answer }
                ])
              }
            }
          } else {
            // Demo mode or consequences not completed - use static question
            if (!responses || !responses.completed) {
              // Not completed - show question
              setCurrentValuesLayerQuestion(0)
              const question = responses?.question || valuesLayerQuestion
              setChatMessages([{ type: 'ai', text: question }])
            } else {
              // Completed - show all messages and completion state
              setCurrentValuesLayerQuestion(1)
              const question = responses.question || valuesLayerQuestion
              setChatMessages([
                { type: 'ai', text: question },
                { type: 'user', text: responses.answer }
              ])
            }
          }
          
          setChatInput('')
          setLastActiveTagId(activeTagId)
        }
        // If same pin, keep existing messages and state
      } else {
        // No pin selected - clear messages
        setChatMessages([])
        setChatInput('')
        setLastActiveTagId(null)
        setCurrentValuesLayerQuestion(0)
        setIsGeneratingValuesQuestion(false)
      }
    } else {
      // Not on Consequences or Values layer - reset state
      setChatMessages([])
      setChatInput('')
      setLastActiveTagId(null)
      setCurrentDataLayerQuestion(0)
      setCurrentValuesLayerQuestion(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTagId, currentLayerIndex, tags])

  // Generate first question when entering Functional Layer in AI mode
  useEffect(() => {
    if (currentLayerIndex === 1 && aiMode && apiKey && functionalQuestions.length === 0 && !isGeneratingQuestion) {
      setIsGeneratingQuestion(true)
      
      const generateFirstQuestion = async () => {
        try {
          const existingTags = tags
            .filter(tag => tag.saved && tag.text && tag.text.trim() !== '')
            .map(tag => tag.text.trim())
            .slice(0, 10)

          const context = {
            imageTitle: aiGeneratedTitle || 'the interface',
            userFocus: weatherInput || '',
            existingTags: existingTags,
            coveredAspects: [],
            questionHistory: [],
            customInstructions: aiInstructions
          }

          const firstQuestion = await generateFunctionalQuestion(apiKey, selectedModel, context)
          
          if (firstQuestion) {
            setFunctionalQuestions([firstQuestion])
            setQuestionHistory([firstQuestion])
            // Set question index to 0 to show the first question
            if (onQuestionIndexChange) {
              onQuestionIndexChange(0)
            }
          }
        } catch (error) {
          console.error('Error generating first question:', error)
        } finally {
          setIsGeneratingQuestion(false)
        }
      }

      generateFirstQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayerIndex, aiMode, apiKey])

  // Reset functional questions when leaving Functional Layer or switching modes
  useEffect(() => {
    if (currentLayerIndex !== 1) {
      setFunctionalQuestions([])
      setCoveredAspects([])
      setQuestionHistory([])
    }
  }, [currentLayerIndex])

  // ResizeObserver to monitor card container size changes
  useEffect(() => {
    if (!cardContainerRef.current) return
    
    // Initial calculation
    calculateNavButtonsPosition()
    
    const observer = new ResizeObserver(() => {
      calculateNavButtonsPosition()
    })
    
    observer.observe(cardContainerRef.current)
    
    return () => observer.disconnect()
  }, [])

  // Recalculate position when layer changes
  useEffect(() => {
    // Small delay to allow card transition to complete
    setTimeout(() => {
      calculateNavButtonsPosition()
    }, 250) // Slightly longer than transition duration
  }, [currentLayerIndex])

  const handleNext = () => {
    // Check if user can move to next layer based on validation rules
    if (!canMoveToNextLayer()) {
      return // Prevent navigation if validation fails
    }
    
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
    // Use AI-generated title if available and in AI mode, otherwise use layer headline
    const currentTitle = index === 0 && aiMode && aiGeneratedTitle ? aiGeneratedTitle : layers[index].headline
    setEditingHeadlineValue(currentTitle)
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

  const handleNextQuestion = async () => {
    // If in demo mode, use static questions
    if (!aiMode || !apiKey) {
      const nextIndex = (currentQuestionIndex + 1) % demoQuestions.length
      if (onQuestionIndexChange) {
        onQuestionIndexChange(nextIndex)
      }
      return
    }

    // In AI mode, generate a new question
    setIsGeneratingQuestion(true)
    
    try {
      // Build context for question generation
      const existingTags = tags
        .filter(tag => tag.saved && tag.text && tag.text.trim() !== '')
        .map(tag => tag.text.trim())
        .slice(0, 10) // Limit to avoid token limits

      const context = {
        imageTitle: aiGeneratedTitle || 'the interface',
        userFocus: weatherInput || '',
        existingTags: existingTags,
        coveredAspects: coveredAspects,
        questionHistory: questionHistory.slice(-5), // Keep last 5 questions for context
        customInstructions: aiInstructions
      }

      const newQuestion = await generateFunctionalQuestion(apiKey, selectedModel, context)
      
      if (newQuestion) {
        // Add question to array
        const newIndex = functionalQuestions.length
        setFunctionalQuestions(prev => [...prev, newQuestion])
        setQuestionHistory(prev => [...prev, newQuestion])
        
        // Update question index
        if (onQuestionIndexChange) {
          onQuestionIndexChange(newIndex)
        }
      } else {
        // Fallback to demo question if generation fails
        console.warn('Failed to generate question, using demo question')
        const nextIndex = (currentQuestionIndex + 1) % demoQuestions.length
        if (onQuestionIndexChange) {
          onQuestionIndexChange(nextIndex)
        }
      }
    } catch (error) {
      console.error('Error generating question:', error)
      // Fallback to demo question
      const nextIndex = (currentQuestionIndex + 1) % demoQuestions.length
      if (onQuestionIndexChange) {
        onQuestionIndexChange(nextIndex)
      }
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  const handleSendMessage = async () => {
    if (chatInput.trim() && activeTagId && currentDataLayerQuestion < 2) {
      const answer = chatInput.trim()
      const questionIndex = currentDataLayerQuestion
      
      // Get the active tag to retrieve stored questions
      const activeTag = tags.find(tag => tag.id === activeTagId)
      const responses = activeTag?.dataLayerResponses
      
      // Use stored question if available, otherwise fallback to static
      const questionText = questionIndex === 0 
        ? (responses?.question1 || dataLayerQuestions[0])
        : (responses?.question2 || dataLayerQuestions[1])
      
      // Store the answer with question text
      if (onDataLayerResponse) {
        onDataLayerResponse(activeTagId, questionIndex, answer, questionText)
      }
      
      // Add user message to chat
      setChatMessages(prev => [...prev, { type: 'user', text: answer }])
      setChatInput('')
      
      // Advance to next question or complete
      if (currentDataLayerQuestion === 0) {
        // Move to question 2
        setCurrentDataLayerQuestion(1)
        
        // Check if Question 2 exists, if not generate it (in AI mode)
        const updatedTag = tags.find(tag => tag.id === activeTagId)
        const updatedResponses = updatedTag?.dataLayerResponses
        
        if (updatedResponses?.question2) {
          // Question 2 already exists, show it
          setChatMessages(prev => [...prev, { type: 'ai', text: updatedResponses.question2 }])
        } else if (aiMode && apiKey && activeTag?.text) {
          // Generate Question 2
          setIsGeneratingConsequencesQuestion(true)
          
          try {
            const context = {
              imageTitle: aiGeneratedTitle || 'the interface',
              userFocus: weatherInput || '',
              functionalAnswer: activeTag.text,
              question1Answer: answer,
              customInstructions: aiInstructions
            }
            
            const question2 = await generateConsequencesQuestion(apiKey, selectedModel, context, 2)
            
            if (question2) {
              // Store question in tag responses
              if (onConsequencesQuestionGenerated) {
                onConsequencesQuestionGenerated(activeTagId, 2, question2)
              }
              setChatMessages(prev => [...prev, { type: 'ai', text: question2 }])
            } else {
              // Fallback to static question
              setChatMessages(prev => [...prev, { type: 'ai', text: dataLayerQuestions[1] }])
            }
          } catch (error) {
            console.error('Error generating consequences question 2:', error)
            setChatMessages(prev => [...prev, { type: 'ai', text: dataLayerQuestions[1] }])
          } finally {
            setIsGeneratingConsequencesQuestion(false)
          }
        } else {
          // Demo mode - use static question
          setChatMessages(prev => [...prev, { type: 'ai', text: dataLayerQuestions[1] }])
        }
      } else if (currentDataLayerQuestion === 1) {
        // Mark as completed
        setCurrentDataLayerQuestion(2)
      }
    }
  }

  const handleValuesSendMessage = () => {
    if (chatInput.trim() && activeTagId && currentValuesLayerQuestion === 0) {
      const answer = chatInput.trim()
      
      // Get the active tag to retrieve stored question
      const activeTag = tags.find(tag => tag.id === activeTagId)
      const responses = activeTag?.valuesLayerResponses
      
      // Use stored question if available, otherwise fallback to static
      const questionText = responses?.question || valuesLayerQuestion
      
      // Store the answer with question text
      if (onValuesLayerResponse) {
        onValuesLayerResponse(activeTagId, answer, questionText)
      }
      
      // Add user message to chat
      setChatMessages(prev => [...prev, { type: 'user', text: answer }])
      setChatInput('')
      
      // Mark as completed
      setCurrentValuesLayerQuestion(1)
    }
  }

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  // Calculate tag count for current question (only saved tags)
  const tagCount = tags.filter(tag => tag.questionId === currentQuestionIndex && tag.saved).length

  const currentLayer = layers[currentLayerIndex]
  const previousLayer = currentLayerIndex > 0 ? layers[currentLayerIndex - 1] : null
  const isFirstLayer = currentLayerIndex === 0
  const isSecondLayer = currentLayerIndex === 1
  const isThirdLayer = currentLayerIndex === 2
  const isFourthLayer = currentLayerIndex === 3
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
    } else if (index === 2) {
      return {
        bg: 'bg-[#F8D866]',
        border: 'border-[#AA8302]',
        text: 'text-[#AA8302]'
      }
    } else {
      return {
        bg: 'bg-[#D4B5FF]',
        border: 'border-[#8B5CF6]',
        text: 'text-[#8B5CF6]'
      }
    }
  }

  // Helper function to get card height based on index
  const getCardHeight = (index) => {
    if (index === 0) return '150px'
    if (index === 1) return '209px'
    if (index === 2 || index === 3) return '270px'
    return '150px'
  }

  // Helper function to check if user can move to next layer
  const canMoveToNextLayer = () => {
    // Layer 0 (Weather-App) → Layer 1 (Functional Layer): No validation needed
    if (currentLayerIndex === 0) {
      return true
    }
    
    // Layer 1 (Functional Layer) → Layer 2 (Consequences): Require at least one saved pin
    if (currentLayerIndex === 1) {
      return tags.some(tag => tag.saved === true)
    }
    
    // Layer 2 (Consequences) → Layer 3 (Values): Require at least one pin with completed consequences
    if (currentLayerIndex === 2) {
      return tags.some(tag => tag.dataLayerResponses?.completed === true)
    }
    
    // Layer 3 (Values): No next layer, but return true to avoid issues
    if (currentLayerIndex === 3) {
      return true
    }
    
    return true
  }

  // Calculate navigation buttons position based on card container bottom + gap
  const calculateNavButtonsPosition = () => {
    if (cardContainerRef.current) {
      const rect = cardContainerRef.current.getBoundingClientRect()
      const gap = 14 // 14px gap
      setNavButtonsTop(rect.bottom + gap)
    }
  }

  return (
    <div className="space-y-2">
      {/* Card Stack Container */}
      <div ref={cardContainerRef} className="relative pb-6" style={{ minHeight: getCardHeight(currentLayerIndex), transition: 'min-height 0.4s ease-out, height 0.4s ease-out' }}>
        {/* Render all cards and position them based on their state */}
        {layers.length > 0 && layers.map((layer, index) => {
          const isActive = index === currentLayerIndex
          const isBackground = index === currentLayerIndex - 1
          const isExiting = index === exitingCardIndex
          const colors = getCardColors(index)
          
          // Render active card, background card, or exiting card
          // Always ensure the active card is rendered
          if (!isActive && !isBackground && !isExiting) return null
          
          // Get semi-transparent background for active card
          const getActiveBg = () => {
            if (index === 0) return 'bg-[#E0E0E0]/50'
            if (index === 1) return 'bg-[#BDDAFF]/50'
            if (index === 2) return 'bg-[#F8D866]/50'
            return 'bg-[#D4B5FF]/50'
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
                  minHeight: getCardHeight(index),
                  height: getCardHeight(index),
                  transition: 'transform 0.4s ease-out, opacity 0.4s ease-out, height 0.4s ease-out, min-height 0.4s ease-out'
                } : isActive ? {
                  top: '0',
                  left: '0',
                  transform: 'translateX(0) translateY(0) scale(1)',
                  width: '100%',
                  ...(index === 1 ? {
                    height: 'fit-content'
                  } : {
                    minHeight: getCardHeight(index),
                    height: getCardHeight(index)
                  }),
                  transition: 'transform 0.4s ease-out, top 0.4s ease-out, left 0.4s ease-out, height 0.4s ease-out, min-height 0.4s ease-out'
                } : {
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(-20px) scale(0.85)',
                  transformOrigin: 'center',
                  width: '100%',
                  minHeight: getCardHeight(index),
                  height: getCardHeight(index),
                  transition: 'transform 0.4s ease-out, top 0.4s ease-out, left 0.4s ease-out, height 0.4s ease-out, min-height 0.4s ease-out'
                })
              }}
            >
              <div className={`p-5 relative ${(index === 2 || index === 3) ? 'flex flex-col' : ''}`} style={(index === 2 || index === 3) ? { height: '100%', minHeight: 0 } : { height: 'fit-content' }}>
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
                          {index === 1 && isBackground && currentLayerIndex === 2 ? (
                            <div className="flex items-center gap-2">
                              {activeTagId ? (
                                <CircleCheck size={20} strokeWidth={2} className="text-[#007AFF] flex-shrink-0" />
                              ) : (
                                <CircleDotDashed size={20} strokeWidth={2} className="text-[#007AFF] flex-shrink-0" />
                              )}
                              <h3 className={`${isBackground ? 'text-[16px]' : 'text-[20px]'} font-medium`}>
                                {activeTagId ? 'Pin selected' : 'Select a pin on the artefact to get started'}
                              </h3>
                            </div>
                          ) : index === 2 && isBackground && currentLayerIndex === 3 ? (
                            <div className="flex items-center gap-2">
                              {activeTagId ? (
                                <CircleCheck size={20} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                              ) : (
                                <>
                                  <CircleDotDashed size={20} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                                  <CircleDotDashed size={20} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                                </>
                              )}
                              <h3 className={`${isBackground ? 'text-[16px]' : 'text-[20px]'} font-medium`}>
                                {activeTagId ? 'Pin selected' : 'Select a pin to get started'}
                              </h3>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <h3 className={`${isBackground ? 'text-[16px]' : 'text-[20px]'} font-medium`}>
                                  {index === 0 && aiMode && aiGeneratedTitle ? aiGeneratedTitle : layer.headline}
                                </h3>
                                {index === 0 && isGeneratingTitle && (
                                  <Loader2 size={16} className="text-gray-400 animate-spin" />
                                )}
                                {index === 0 && !isGeneratingTitle && (
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
                                {index === 2 && activeTagId && (
                                  <>
                                    {(() => {
                                      const activeTag = tags.find(tag => tag.id === activeTagId)
                                      const responses = activeTag?.dataLayerResponses
                                      const hasAnswer1 = responses?.answer1
                                      const hasAnswer2 = responses?.answer2
                                      
                                      return (
                                        <>
                                          {hasAnswer1 ? (
                                            <CircleCheck size={16} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                                          ) : (
                                            <CircleDotDashed size={16} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                                          )}
                                          {hasAnswer2 ? (
                                            <CircleCheck size={16} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                                          ) : (
                                            <CircleDotDashed size={16} strokeWidth={2} className="text-[#AA8302] flex-shrink-0" />
                                          )}
                                        </>
                                      )
                                    })()}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                    </>
                  )}
                </div>
                {index === 0 ? (
                  <div className={`${isBackground ? 'pt-10' : 'pt-12'}`}>
                    {isGeneratingTitle ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span>AI is analyzing the image...</span>
                      </div>
                    ) : (
                      <Input
                        value={weatherInput}
                        onChange={(e) => setWeatherInput(e.target.value)}
                        placeholder="Do you want to focus on a specific aspect? "
                        className={`${colors.text} border ${colors.border}`}
                      />
                    )}
                  </div>
                ) : index === 1 ? (
                  <div className={`flex flex-col ${isBackground ? 'pt-10' : 'pt-12'}`}>
                    {/* Chat bubble aligned to the left */}
                    <div className="flex items-start justify-start mb-4">
                      <div className="bg-white rounded-lg px-4 py-3 max-w-[80%]">
                        {isGeneratingQuestion ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={16} className="text-gray-400 animate-spin" />
                            <p className={`text-sm ${colors.text}`}>
                              Generating question...
                            </p>
                          </div>
                        ) : (
                          <p className={`text-sm ${colors.text}`}>
                            {aiMode && functionalQuestions.length > 0 && currentQuestionIndex < functionalQuestions.length
                              ? functionalQuestions[currentQuestionIndex]
                              : demoQuestions[currentQuestionIndex]}
                          </p>
                        )}
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
                        {tagCount === 0 ? (
                          <Button 
                            onClick={handleNextQuestion}
                            disabled={isGeneratingQuestion}
                            className="px-3 py-1 rounded-[9px] bg-transparent !text-[#007AFF] border-[1.5px] border-[#007AFF] hover:bg-[#007AFF]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Skip Question
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleNextQuestion}
                            disabled={isGeneratingQuestion}
                            className="px-3 py-1 rounded-[9px] !bg-[#007AFF] !text-white hover:!bg-[#007AFF]/90 border-[1.5px] border-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next Question
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : index === 2 ? (
                  <div className={`flex flex-col flex-1 min-h-0 ${isBackground ? 'pt-10' : 'pt-12'}`}>
                    {/* Chat Messages - Scrollable area */}
                    <div className="flex-1 overflow-y-auto mb-3 pr-1">
                      <div className="flex flex-col gap-3">
                        {isGeneratingConsequencesQuestion && chatMessages.length === 0 ? (
                          <div className="flex items-start justify-start">
                            <div className="bg-[#FDF5E6] rounded-lg px-4 py-3 max-w-[80%]">
                              <div className="flex items-center gap-2">
                                <Loader2 size={16} className="text-gray-400 animate-spin" />
                                <p className={`text-sm ${colors.text}`}>
                                  Generating question...
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : isGeneratingConsequencesQuestion && chatMessages.length > 0 ? (
                          <>
                            {chatMessages.map((message, msgIndex) => (
                              <div
                                key={msgIndex}
                                className={`flex items-start ${message.type === 'ai' ? 'justify-start' : 'justify-end'}`}
                              >
                                <div
                                  className={`rounded-lg px-4 py-3 max-w-[80%] ${
                                    message.type === 'ai'
                                      ? `bg-[#FDF5E6]`
                                      : `${colors.border} bg-[#AA8302]`
                                  }`}
                                >
                                  <p
                                    className={`text-sm ${
                                      message.type === 'ai' ? colors.text : 'text-white'
                                    }`}
                                  >
                                    {message.text}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-start justify-start">
                              <div className="bg-[#FDF5E6] rounded-lg px-4 py-3 max-w-[80%]">
                                <div className="flex items-center gap-2">
                                  <Loader2 size={16} className="text-gray-400 animate-spin" />
                                  <p className={`text-sm ${colors.text}`}>
                                    Generating question...
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          chatMessages.map((message, msgIndex) => (
                            <div
                              key={msgIndex}
                              className={`flex items-start ${message.type === 'ai' ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`rounded-lg px-4 py-3 max-w-[80%] ${
                                  message.type === 'ai'
                                    ? `bg-[#FDF5E6]`
                                    : `${colors.border} bg-[#AA8302]`
                                }`}
                              >
                                <p
                                  className={`text-sm ${
                                    message.type === 'ai' ? colors.text : 'text-white'
                                  }`}
                                >
                                  {message.text}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatMessagesEndRef} />
                      </div>
                    </div>
                    
                    {/* Input Field and Send Button or Completion Message - Fixed at bottom */}
                    <div className="mt-auto">
                      {currentDataLayerQuestion === 2 ? (
                        <div className="text-center py-3">
                          <p className={`text-sm ${colors.text}`}>
                            Choose another pin to continue
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Text"
                            disabled={!activeTagId || currentDataLayerQuestion === 2 || isGeneratingConsequencesQuestion}
                            className={`${colors.text} border ${colors.border} bg-[#FDF5E6] placeholder:text-[#AA8302]/60 flex-1 ${
                              !activeTagId || currentDataLayerQuestion === 2 || isGeneratingConsequencesQuestion ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && activeTagId && currentDataLayerQuestion < 2 && !isGeneratingConsequencesQuestion) {
                                handleSendMessage()
                              }
                            }}
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={!activeTagId || !chatInput.trim() || currentDataLayerQuestion === 2 || isGeneratingConsequencesQuestion}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors.border} bg-[#AA8302] hover:opacity-90 transition-opacity ${
                              !activeTagId || !chatInput.trim() || currentDataLayerQuestion === 2 || isGeneratingConsequencesQuestion ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            aria-label="Send message"
                          >
                            <ArrowUp size={18} className="text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : index === 3 ? (
                  <div className={`flex flex-col flex-1 min-h-0 ${isBackground ? 'pt-10' : 'pt-12'}`}>
                    {/* Chat Messages - Scrollable area */}
                    <div className="flex-1 overflow-y-auto mb-3 pr-1">
                      <div className="flex flex-col gap-3">
                        {isGeneratingValuesQuestion && chatMessages.length === 0 ? (
                          <div className="flex items-start justify-start">
                            <div className="bg-[#FDF5E6] rounded-lg px-4 py-3 max-w-[80%]">
                              <div className="flex items-center gap-2">
                                <Loader2 size={16} className="text-gray-400 animate-spin" />
                                <p className={`text-sm ${colors.text}`}>
                                  Generating question...
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          chatMessages.map((message, msgIndex) => (
                            <div
                              key={msgIndex}
                              className={`flex items-start ${message.type === 'ai' ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`rounded-lg px-4 py-3 max-w-[80%] ${
                                  message.type === 'ai'
                                    ? `bg-[#FDF5E6]`
                                    : `${colors.border} bg-[#8B5CF6]`
                                }`}
                              >
                                <p
                                  className={`text-sm ${
                                    message.type === 'ai' ? colors.text : 'text-white'
                                  }`}
                                >
                                  {message.text}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatMessagesEndRef} />
                      </div>
                    </div>
                    
                    {/* Input Field and Send Button or Completion Message - Fixed at bottom */}
                    <div className="mt-auto">
                      {currentValuesLayerQuestion === 1 ? (
                        <div className="text-center py-3">
                          <p className={`text-sm ${colors.text}`}>
                            Choose another pin to continue
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Text"
                            disabled={!activeTagId || currentValuesLayerQuestion === 1 || isGeneratingValuesQuestion}
                            className={`${colors.text} border ${colors.border} bg-[#FDF5E6] placeholder:text-[#8B5CF6]/60 flex-1 ${
                              !activeTagId || currentValuesLayerQuestion === 1 || isGeneratingValuesQuestion ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && activeTagId && currentValuesLayerQuestion === 0 && !isGeneratingValuesQuestion) {
                                handleValuesSendMessage()
                              }
                            }}
                          />
                          <button
                            onClick={handleValuesSendMessage}
                            disabled={!activeTagId || !chatInput.trim() || currentValuesLayerQuestion === 1 || isGeneratingValuesQuestion}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors.border} bg-[#8B5CF6] hover:opacity-90 transition-opacity ${
                              !activeTagId || !chatInput.trim() || currentValuesLayerQuestion === 1 || isGeneratingValuesQuestion ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            aria-label="Send message"
                          >
                            <ArrowUp size={18} className="text-white" />
                          </button>
                        </div>
                      )}
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
      <div className="flex justify-start items-center gap-2 ml-[10px] fixed z-30" style={{ top: `${navButtonsTop}px`, transition: 'top 0.1s ease-out' }}>
        <Button 
          onClick={handleNext} 
          disabled={!canMoveToNextLayer() || currentLayerIndex >= initialLayers.length - 1}
          className={`px-3 py-1 rounded-[9px] bg-black text-white hover:bg-black/90 ${
            !canMoveToNextLayer() || currentLayerIndex >= initialLayers.length - 1
              ? 'opacity-50 cursor-not-allowed hover:bg-black'
              : ''
          }`}
        >
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

