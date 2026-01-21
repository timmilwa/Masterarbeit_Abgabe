/**
 * Gemini API Service
 * Handles all interactions with Google Gemini API
 */

/**
 * Converts an image file to base64 string
 * @param {File} imageFile - The image file to convert
 * @returns {Promise<string>} Base64 encoded image string
 */
export async function convertImageToBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result.split(',')[1] // Remove data:image/...;base64, prefix
      resolve(base64String)
    }
    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })
}

/**
 * Validates a Gemini API key by making a lightweight API call
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export async function validateApiKey(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return false
  }

  try {
    // Use a simple text generation request to validate the key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'test'
            }]
          }]
        })
      }
    )

    // Check response status
    if (response.ok) {
      // If we get a 200 OK, the key is definitely valid
      const data = await response.json().catch(() => null)
      console.log('API key validation: Success', data ? 'Response received' : 'No response data')
      return true
    }
    
    // Get error details for debugging
    let errorData = {}
    try {
      errorData = await response.json()
    } catch (e) {
      // If we can't parse JSON, try to get text
      const text = await response.text().catch(() => '')
      errorData = { message: text, raw: text }
    }
    
    const errorMessage = JSON.stringify(errorData).toLowerCase()
    console.log('API key validation response:', response.status, errorData)
    
    // 400 Bad Request - could be valid key with bad request, or invalid key
    if (response.status === 400) {
      // Only consider it invalid if error explicitly mentions API key issues
      if (errorMessage.includes('invalid api key') || 
          errorMessage.includes('api key not valid') ||
          errorMessage.includes('api key is invalid') ||
          (errorMessage.includes('api key') && errorMessage.includes('invalid'))) {
        console.error('API key validation failed - invalid key:', errorData)
        return false
      }
      // For other 400 errors, assume key might be valid (could be request format issue)
      console.warn('API key validation - 400 error but key might be valid:', errorData)
      return true
    }
    
    // 401 Unauthorized - definitely invalid key
    if (response.status === 401) {
      console.error('API key validation failed - 401 Unauthorized:', errorData)
      return false
    }
    
    // 403 Forbidden - could be invalid key or permission issue
    if (response.status === 403) {
      // Check if it's specifically about the API key
      if (errorMessage.includes('api key') || errorMessage.includes('permission')) {
        console.error('API key validation failed - 403 Forbidden:', errorData)
        return false
      }
      // Might be a permission issue with the model, but key is valid
      console.warn('API key validation - 403 but key might be valid:', errorData)
      return true
    }
    
    // 429 Too Many Requests - key is valid but rate limited
    if (response.status === 429) {
      console.warn('API key validation - Rate limited, but key appears valid')
      return true
    }
    
    // Other status codes - log for debugging
    console.warn('API key validation - Unexpected status:', response.status, errorData)
    // Be more lenient - if it's not clearly an auth error, assume key might be valid
    return response.status < 500 // Assume valid unless server error
  } catch (error) {
    // Network errors or other exceptions
    console.error('API key validation error (network/exception):', error)
    // Don't fail validation on network errors - might be temporary
    // Return false only if it's clearly a validation issue
    return false
  }
}

/**
 * Generates a title for an image using Gemini Vision API
 * @param {File} imageFile - The image file to analyze
 * @param {string} apiKey - The Gemini API key
 * @param {string} model - The model to use (e.g., 'gemini-2.0-flash-exp')
 * @param {Object} customInstructions - Custom instructions object
 * @returns {Promise<string>} Generated title or empty string on error
 */
export async function generateImageTitle(imageFile, apiKey, model = 'gemini-2.0-flash-exp', customInstructions = {}) {
  if (!apiKey || !imageFile) {
    return ''
  }

  try {
    // Convert image to base64
    const base64Image = await convertImageToBase64(imageFile)
    
    // Determine MIME type
    const mimeType = imageFile.type || 'image/jpeg'

    // Build prompt with custom instructions
    let prompt = ''
    
    // Add title-specific instructions
    if (customInstructions.titleGeneration && customInstructions.titleGeneration.trim()) {
      prompt += `${customInstructions.titleGeneration.trim()}\n\n`
    }
    
    // Base prompt
    prompt += 'Analyze this image and provide a short, descriptive title for what is shown. Return only the title, no explanation or additional text.'

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }]
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error:', response.status, errorData)
      return ''
    }

    const data = await response.json()
    
    // Extract the generated text from the response
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        const title = candidate.content.parts[0].text.trim()
        if (title) {
          return title
        }
      }
      // Check if there's a finish reason that indicates an issue
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('Title generation finished with reason:', candidate.finishReason)
      }
    }

    console.warn('No title generated from response:', data)
    return ''
  } catch (error) {
    console.error('Error generating image title:', error)
    return ''
  }
}

/**
 * Generates an open-ended reflective question for the Functional Layer
 * @param {string} apiKey - The Gemini API key
 * @param {string} model - The model to use (e.g., 'gemini-2.0-flash-exp')
 * @param {Object} context - Context object containing:
 *   - imageTitle: AI-generated title of the image
 *   - userFocus: User input from first card
 *   - existingTags: Array of existing tag texts
 *   - coveredAspects: Array of aspects already covered
 *   - questionHistory: Array of previous questions asked
 *   - customInstructions: Custom instructions object
 * @returns {Promise<string>} Generated question or empty string on error
 */
export async function generateFunctionalQuestion(apiKey, model = 'gemini-2.0-flash-exp', context = {}) {
  if (!apiKey) {
    return ''
  }

  const { imageTitle = '', userFocus = '', existingTags = [], coveredAspects = [], questionHistory = [], customInstructions = {} } = context

  try {
    // Build context string
    let contextString = `The user is analyzing an interface/object titled: "${imageTitle}".`
    
    if (userFocus) {
      contextString += ` The user wants to focus on: "${userFocus}".`
    }
    
    if (existingTags.length > 0) {
      const tagTexts = existingTags.slice(0, 10).join(', ') // Limit to avoid token limits
      contextString += ` The user has already reflected on: ${tagTexts}.`
    }
    
    if (coveredAspects.length > 0) {
      contextString += ` Already covered aspects: ${coveredAspects.join(', ')}.`
    }
    
    if (questionHistory.length > 0) {
      const recentQuestions = questionHistory.slice(-3).join(' | ')
      contextString += ` Recent questions asked: ${recentQuestions}.`
    }

    // Build the prompt with custom instructions
    let prompt = ''
    
    // Base role description
    prompt += `You are a reflective partner helping users analyze functional aspects of interfaces and digital objects. Your role is to ask open-ended questions that encourage reflection, not to provide solutions.\n\n`
    
    // Add context
    prompt += `${contextString}\n\n`
    
    // Add question-specific instructions
    if (customInstructions.functionalQuestions && customInstructions.functionalQuestions.trim()) {
      prompt += `${customInstructions.functionalQuestions.trim()}\n\n`
    }
    
    // Base guidelines
    prompt += `Generate a single open-ended question that helps the user reflect on a functional aspect of this interface. Focus on aspects like:
- Interactivity and user actions
- Layout and spatial organization
- Visual hierarchy and information structure
- Navigation and wayfinding
- Information architecture
- User flow and task completion
- Visual organization and grouping

Important guidelines:
- Ask about a DIFFERENT aspect than those already covered (${coveredAspects.length > 0 ? coveredAspects.join(', ') : 'none yet'})
- Make it open-ended to encourage exploration and reflection
- Avoid asking about aspects the user has already reflected on
- Keep it concise (1-2 sentences)
- Return ONLY the question, no explanation or additional text`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error generating question:', response.status, errorData)
      return ''
    }

    const data = await response.json()
    
    // Extract the generated question
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        const question = candidate.content.parts[0].text.trim()
        if (question) {
          return question
        }
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('Question generation finished with reason:', candidate.finishReason)
      }
    }

    console.warn('No question generated from response:', data)
    return ''
  } catch (error) {
    console.error('Error generating functional question:', error)
    return ''
  }
}

/**
 * Generates a consequences question for the Consequences Layer (based on Means-End Chain theory)
 * @param {string} apiKey - The Gemini API key
 * @param {string} model - The model to use (e.g., 'gemini-2.0-flash-exp')
 * @param {Object} context - Context object containing:
 *   - imageTitle: AI-generated title of the image
 *   - userFocus: User input from first card
 *   - functionalAnswer: Selected pin's functional answer (attribute/feature)
 *   - question1Answer: Answer to Question 1 (only for Question 2)
 *   - customInstructions: Custom instructions object
 * @param {number} questionNumber - 1 for functional consequences, 2 for emotional consequences
 * @returns {Promise<string>} Generated question or empty string on error
 */
export async function generateConsequencesQuestion(apiKey, model = 'gemini-2.0-flash-exp', context = {}, questionNumber = 1) {
  if (!apiKey) {
    return ''
  }

  const { imageTitle = '', userFocus = '', functionalAnswer = '', question1Answer = '', customInstructions = {} } = context

  try {
    // Build context string
    let contextString = `The user is analyzing an interface/object titled: "${imageTitle}".`
    
    if (userFocus) {
      contextString += ` The user wants to focus on: "${userFocus}".`
    }
    
    contextString += ` The user has identified a functional attribute/feature: "${functionalAnswer}".`
    
    if (questionNumber === 2 && question1Answer) {
      contextString += ` The user described the functional consequence: "${question1Answer}".`
    }

    // Build the prompt with custom instructions
    let prompt = ''
    
    // Base role description
    prompt += `You are a reflective partner helping users explore consequences of product features using Means-End Chain theory. Your role is to ask open-ended questions that encourage reflection, not to provide solutions.\n\n`
    
    // Add context
    prompt += `${contextString}\n\n`
    
    // Add custom instructions based on question number
    const instructionKey = questionNumber === 1 ? 'consequencesQuestion1' : 'consequencesQuestion2'
    if (customInstructions[instructionKey] && customInstructions[instructionKey].trim()) {
      prompt += `${customInstructions[instructionKey].trim()}\n\n`
    }
    
    // Question-specific guidelines based on MEC theory
    if (questionNumber === 1) {
      // Functional Consequences
      prompt += `Generate a single open-ended question (1-2 sentences) that helps the user reflect on the FUNCTIONAL CONSEQUENCES of this feature.
      
Focus on practical outcomes: What does this feature help the user do? What practical outcomes result from this attribute? What can the user accomplish with this feature?

Important guidelines:
- Ask about functional/practical consequences, not emotional ones
- Make it open-ended to encourage exploration and reflection
- Keep it concise (1-2 sentences)
- Return ONLY the question, no explanation or additional text`
    } else {
      // Emotional Consequences
      prompt += `Generate a single open-ended question (1-2 sentences) that helps the user reflect on the EMOTIONAL CONSEQUENCES of the functional consequence they described.
      
Focus on emotional/feeling aspects: How does this functional consequence make the user feel? What emotional or psychosocial outcomes result from this practical benefit?

Important guidelines:
- Build upon the functional consequence the user described
- Ask about emotional/psychosocial consequences, not practical ones
- Make it open-ended to encourage exploration and reflection
- Keep it concise (1-2 sentences)
- Return ONLY the question, no explanation or additional text`
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error generating consequences question:', response.status, errorData)
      return ''
    }

    const data = await response.json()
    
    // Extract the generated question
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        const question = candidate.content.parts[0].text.trim()
        if (question) {
          return question
        }
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('Consequences question generation finished with reason:', candidate.finishReason)
      }
    }

    console.warn('No consequences question generated from response:', data)
    return ''
  } catch (error) {
    console.error('Error generating consequences question:', error)
    return ''
  }
}

/**
 * Generates a values question for the Values Layer (based on Means-End Chain theory)
 * @param {string} apiKey - The Gemini API key
 * @param {string} model - The model to use (e.g., 'gemini-2.0-flash-exp')
 * @param {Object} context - Context object containing:
 *   - imageTitle: AI-generated title of the image
 *   - userFocus: User input from first card
 *   - functionalAnswer: Selected pin's functional answer (attribute)
 *   - consequencesAnswer1: Answer to Consequences Question 1 (functional consequence)
 *   - consequencesAnswer2: Answer to Consequences Question 2 (emotional consequence)
 *   - customInstructions: Custom instructions object
 * @returns {Promise<string>} Generated question or empty string on error
 */
export async function generateValuesQuestion(apiKey, model = 'gemini-2.0-flash-exp', context = {}) {
  if (!apiKey) {
    return ''
  }

  const { imageTitle = '', userFocus = '', functionalAnswer = '', consequencesAnswer1 = '', consequencesAnswer2 = '', customInstructions = {} } = context

  try {
    // Build context string
    let contextString = `The user is analyzing an interface/object titled: "${imageTitle}".`
    
    if (userFocus) {
      contextString += ` The user wants to focus on: "${userFocus}".`
    }
    
    contextString += ` The user identified a functional attribute: "${functionalAnswer}".`
    contextString += ` The functional consequence: "${consequencesAnswer1}".`
    contextString += ` The emotional consequence: "${consequencesAnswer2}".`

    // Build the prompt with custom instructions
    let prompt = ''
    
    // Base role description
    prompt += `You are a reflective partner helping users explore deeper values and life goals using Means-End Chain theory. Your role is to ask open-ended questions that encourage reflection on subconscious motivations, not to provide solutions.\n\n`
    
    // Add context
    prompt += `${contextString}\n\n`
    
    // Add custom instructions
    if (customInstructions.valuesQuestion && customInstructions.valuesQuestion.trim()) {
      prompt += `${customInstructions.valuesQuestion.trim()}\n\n`
    }
    
    // Values question guidelines based on MEC theory
    prompt += `Generate a single open-ended question (1-2 sentences) that helps the user reflect on the VALUES and LIFE GOALS that stand behind these features and consequences.

Focus on ultimate goals/values: What deeper values or goals does this fulfill? What subconscious motivations stand behind these features and consequences? What ultimate life goals or principles are being served?

Important guidelines:
- Explore deeper, often subconscious values and life goals
- Connect to the full chain: attribute → functional consequence → emotional consequence → values
- Make it open-ended to encourage deep reflection
- Keep it concise (1-2 sentences)
- Return ONLY the question, no explanation or additional text`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error generating values question:', response.status, errorData)
      return ''
    }

    const data = await response.json()
    
    // Extract the generated question
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        const question = candidate.content.parts[0].text.trim()
        if (question) {
          return question
        }
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('Values question generation finished with reason:', candidate.finishReason)
      }
    }

    console.warn('No values question generated from response:', data)
    return ''
  } catch (error) {
    console.error('Error generating values question:', error)
    return ''
  }
}

