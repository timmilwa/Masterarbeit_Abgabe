
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Settings, Send, Sparkles, Mic, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODELS = [
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const

type GeminiModel = typeof GEMINI_MODELS[number]['value']

const DEFAULT_INSTRUCTIONS = 'Du bist ein Reflexionsassistent, der Menschen hilft, über Gegenstände nachzudenken. Stelle offene, nachdenkliche Fragen, die den Benutzer dazu anregen, tief über den Gegenstand nachzudenken.'

// Web Speech API types (not in all TS libs)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}
const SpeechRecognitionAPI = typeof window !== 'undefined' && (
  (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
) as (new () => SpeechRecognitionInstance) | false

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Was möchtest du reflektieren? Bitte beschreibe den Gegenstand, über den du nachdenken möchtest."
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [googleApiKey, setGoogleApiKey] = useState("")
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.5-flash')
  const [instructions, setInstructions] = useState<string>(DEFAULT_INSTRUCTIONS)
  const [reflectionObject, setReflectionObject] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const instructionsRef = useRef<HTMLTextAreaElement | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Auto-resize textarea to fit content
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // Load instructions from markdown file
  const loadInstructionsFromFile = async () => {
    try {
      const response = await fetch('/instructions.md?t=' + Date.now())
      if (response.ok) {
        const text = await response.text()
        setInstructions(text.trim())
        return true
      }
    } catch (error) {
      console.error('Error loading instructions.md:', error)
    }
    return false
  }

  // Load instructions from markdown file on mount
  useEffect(() => {
    loadInstructionsFromFile().then((loaded) => {
      if (!loaded) {
        // Fall back to default if file not found
        setInstructions(DEFAULT_INSTRUCTIONS)
      }
    })
  }, [])

  // Adjust heights when settings open or instructions change
  useEffect(() => {
    if (showSettings) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        adjustTextareaHeight(instructionsRef.current)
      }, 0)
    }
  }, [showSettings, instructions, adjustTextareaHeight])

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    if (!googleApiKey) {
      throw new Error("Google API Key fehlt. Bitte in den Einstellungen eingeben.")
    }

    try {
      const genAI = new GoogleGenerativeAI(googleApiKey)
      const model = genAI.getGenerativeModel({ model: selectedModel })
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      throw error
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const userMessage = inputValue.trim()
    const userMessageId = Date.now().toString()
    
    // Add user message
    setMessages(prev => [...prev, { id: userMessageId, role: 'user', content: userMessage }])
    setInputValue("")
    setIsLoading(true)

    try {
      // If no reflection object is set yet, this is the first answer - set the object
      if (!reflectionObject) {
        setReflectionObject(userMessage)
        // Ask a reflection question
        const basePrompt = `Der Benutzer möchte über "${userMessage}" reflektieren. 
        
${instructions}

WICHTIG: Stelle NUR EINE offene, nachdenkliche Frage (keine Aussagen, keine Mehrzahl von Fragen). Die Frage sollte den Benutzer dazu anregt, tief über diesen Gegenstand nachzudenken. Die Frage muss auf Deutsch sein, kurz und prägnant (maximal 15 Wörter).`

        const aiResponse = await callGeminiAPI(basePrompt)
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          role: 'ai', 
          content: aiResponse.trim()
        }])
      } else {
        // Continue the conversation with context
        const conversationHistory = messages.map(msg => {
          if (msg.role === 'user') {
            return `Benutzer: ${msg.content}`
          } else {
            return `Assistent: ${msg.content}`
          }
        }).join('\n')

        const basePrompt = `Der Benutzer reflektiert über "${reflectionObject}".

${instructions}

Gesprächsverlauf:
${conversationHistory}

Neueste Benutzerantwort: ${userMessage}

WICHTIG: Stelle NUR EINE offene, nachdenkliche Frage (keine Aussagen, keine Mehrzahl von Fragen). Die Frage sollte den Benutzer tiefer in sein Nachdenken führen. Die Frage muss auf Deutsch sein, kurz und prägnant (maximal 15 Wörter).`

        const aiResponse = await callGeminiAPI(basePrompt)
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          role: 'ai', 
          content: aiResponse.trim()
        }])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten. Bitte überprüfe deine API Key in den Einstellungen."
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }


  // Voice-to-text: set up Speech Recognition
  useEffect(() => {
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'de-DE'

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let toAppend = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          toAppend += transcript
        }
      }
      if (toAppend) {
        setInputValue((prev) => (prev + toAppend).trim())
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    return () => {
      try {
        recognition.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  const toggleVoiceInput = () => {
    if (!SpeechRecognitionAPI || !recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('Speech recognition start failed:', err)
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground font-sans relative overflow-hidden selection:bg-selection selection:text-white">
      {/* Title */}
      <div className="absolute top-6 left-6 z-20">
        <h1 className="text-xl font-medium text-foreground">Socratic Mirror</h1>
      </div>

      {/* Settings Button */}
      <div className="absolute top-6 right-6 z-30" ref={settingsRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="absolute top-12 right-0 w-96 bg-white rounded-2xl border border-border/40 shadow-xl shadow-black/10 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Google API Key</label>
              <Input
                type="password"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="Enter your Google API key"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Benötigt für die Verwendung der Gemini AI
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Model</label>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                className="w-full"
              >
                {GEMINI_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Wähle das Gemini-Modell für die Konversation
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Anweisungen</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadInstructionsFromFile}
                  className="h-7 text-xs"
                >
                  Aus Datei laden
                </Button>
              </div>
              <textarea
                ref={(el) => {
                  instructionsRef.current = el
                  adjustTextareaHeight(el)
                }}
                value={instructions}
                onChange={(e) => {
                  setInstructions(e.target.value)
                  adjustTextareaHeight(e.target)
                }}
                placeholder="Anweisungen für den Reflexionsassistenten..."
                className={cn(
                  "flex w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm shadow-sm text-foreground resize-none overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                )}
                style={{ minHeight: '2.5rem' }}
              />
              <p className="text-xs text-muted-foreground">
                Bearbeite die Anweisungen hier oder direkt in der Datei <code className="text-xs bg-muted px-1 py-0.5 rounded">public/instructions.md</code>. Klicke auf "Aus Datei laden" um die Datei neu zu laden.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-24 pb-40 scroll-smooth">
        <div className="mx-auto max-w-2xl space-y-8">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-5 py-3 text-base leading-relaxed shadow-sm ring-1 ring-inset",
                msg.role === 'user'
                  ? "bg-primary text-primary-foreground ring-primary/10"
                  : "bg-white text-foreground ring-border"
              )}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 text-secondary-foreground/60" />
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Floating Input Area */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <div className="group relative flex items-center gap-2 rounded-2xl border border-border/40 bg-white p-2 shadow-xl shadow-black/5 ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-primary/10 hover:shadow-2xl hover:shadow-black/10">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={reflectionObject ? "Deine Antwort..." : "Beschreibe den Gegenstand..."}
            disabled={isLoading}
            className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground/50 text-foreground disabled:opacity-50"
          />

          <Button
            type="button"
            onClick={toggleVoiceInput}
            size="icon"
            disabled={!SpeechRecognitionAPI || isLoading}
            title={isListening ? "Spracheingabe beenden" : "Spracheingabe starten"}
            className={cn(
              "h-10 w-10 rounded-xl transition-all duration-300",
              isListening
                ? "bg-red-500 text-white shadow-md animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {isListening ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button
            onClick={handleSend}
            size="icon"
            disabled={!inputValue || isLoading}
            className={cn(
              "h-10 w-10 rounded-xl transition-all duration-300",
              inputValue && !isLoading ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground opacity-50 shadow-none hover:bg-muted"
            )}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App
