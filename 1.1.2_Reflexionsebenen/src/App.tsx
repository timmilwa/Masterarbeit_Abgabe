
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Settings, Send, Sparkles, Zap, Heart, Scale, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { GoogleGenerativeAI } from '@google/generative-ai'

type Category = 'Funktion' | 'Emotion' | 'Werte'

const GEMINI_MODELS = [
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const

type GeminiModel = typeof GEMINI_MODELS[number]['value']

const DEFAULT_MODE_INSTRUCTIONS: Record<Category, string> = {
  'Funktion': 'Konzentriere dich auf die funktionale Ebene: Was macht dieser Gegenstand? Wie funktioniert er? Welchen Zweck erfüllt er?',
  'Emotion': 'Konzentriere dich auf die emotionale Ebene: Welche Gefühle weckt dieser Gegenstand? Welche Erinnerungen sind damit verbunden? Wie fühlt sich der Benutzer in Bezug darauf?',
  'Werte': 'Konzentriere dich auf die Werteebene: Welche Werte repräsentiert dieser Gegenstand? Was bedeutet er für den Benutzer? Welche Prinzipien oder Überzeugungen sind damit verbunden?',
}

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  category?: Category
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
  const [activeTab, setActiveTab] = useState<Category>('Funktion')
  const [showSettings, setShowSettings] = useState(false)
  const [googleApiKey, setGoogleApiKey] = useState("")
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.5-flash')
  const [instructions, setInstructions] = useState<Record<Category, string>>({
    'Funktion': DEFAULT_MODE_INSTRUCTIONS['Funktion'],
    'Emotion': DEFAULT_MODE_INSTRUCTIONS['Emotion'],
    'Werte': DEFAULT_MODE_INSTRUCTIONS['Werte'],
  })
  const [reflectionObject, setReflectionObject] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const instructionsRefs = useRef<Record<Category, HTMLTextAreaElement | null>>({
    'Funktion': null,
    'Emotion': null,
    'Werte': null,
  })

  // Parse markdown file to extract instructions
  const parseMarkdownInstructions = (markdown: string): Record<Category, string> => {
    const result: Partial<Record<Category, string>> = {}
    const lines = markdown.split('\n')
    
    let currentCategory: Category | null = null
    let currentContent: string[] = []
    
    for (const line of lines) {
      // Check for category headers (## Funktion, ## Emotion, ## Werte)
      if (line.startsWith('## ')) {
        // Save previous category if exists
        if (currentCategory && currentContent.length > 0) {
          result[currentCategory] = currentContent.join('\n').trim()
        }
        
        const categoryText = line.substring(3).trim()
        if (categoryText === 'Funktion') {
          currentCategory = 'Funktion'
        } else if (categoryText === 'Emotion') {
          currentCategory = 'Emotion'
        } else if (categoryText === 'Werte') {
          currentCategory = 'Werte'
        } else {
          currentCategory = null
        }
        currentContent = []
      } else if (currentCategory && line.trim() && !line.startsWith('#')) {
        // Add non-header lines to current category content
        currentContent.push(line)
      }
    }
    
    // Save last category
    if (currentCategory && currentContent.length > 0) {
      result[currentCategory] = currentContent.join('\n').trim()
    }
    
    // Fill in defaults for any missing categories
    return {
      'Funktion': result['Funktion'] || DEFAULT_MODE_INSTRUCTIONS['Funktion'],
      'Emotion': result['Emotion'] || DEFAULT_MODE_INSTRUCTIONS['Emotion'],
      'Werte': result['Werte'] || DEFAULT_MODE_INSTRUCTIONS['Werte'],
    }
  }

  // Load instructions from default markdown file
  const loadDefaultInstructions = useCallback(async () => {
    try {
      const response = await fetch('/instructions.md')
      if (!response.ok) {
        console.warn('Could not load default instructions.md, using defaults')
        return
      }
      const markdown = await response.text()
      const parsed = parseMarkdownInstructions(markdown)
      setInstructions(parsed)
    } catch (error) {
      console.error('Error loading instructions:', error)
    }
  }, [])

  // Load default instructions on mount
  useEffect(() => {
    loadDefaultInstructions()
  }, [loadDefaultInstructions])

  // Auto-resize textarea to fit content
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // Adjust heights when settings open or instructions change
  useEffect(() => {
    if (showSettings) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        Object.values(instructionsRefs.current).forEach(adjustTextareaHeight)
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
        // Ask a reflection question based on the current mode
        const modeInstructions = instructions[activeTab]
        const basePrompt = `Du bist ein Reflexionsassistent, der Menschen hilft, über Gegenstände nachzudenken. Der Benutzer möchte über "${userMessage}" reflektieren. 
        
${modeInstructions}

WICHTIG: Stelle NUR EINE offene, nachdenkliche Frage (keine Aussagen, keine Mehrzahl von Fragen). Die Frage sollte den Benutzer dazu anregt, tief über diesen Aspekt des Gegenstandes nachzudenken. Die Frage muss auf Deutsch sein, kurz und prägnant (maximal 15 Wörter).`

        const aiResponse = await callGeminiAPI(basePrompt)
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          role: 'ai', 
          content: aiResponse.trim(),
          category: activeTab 
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

        const modeInstructions = instructions[activeTab]
        const basePrompt = `Du bist ein Reflexionsassistent, der Menschen hilft, über Gegenstände nachzudenken. Der Benutzer reflektiert über "${reflectionObject}".

${modeInstructions}

Gesprächsverlauf:
${conversationHistory}

Neueste Benutzerantwort: ${userMessage}

WICHTIG: Stelle NUR EINE offene, nachdenkliche Frage (keine Aussagen, keine Mehrzahl von Fragen). Die Frage sollte den Benutzer tiefer in sein Nachdenken führen. Die Frage muss auf Deutsch sein, kurz und prägnant (maximal 15 Wörter).`

        const aiResponse = await callGeminiAPI(basePrompt)
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          role: 'ai', 
          content: aiResponse.trim(),
          category: activeTab 
        }])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten. Bitte überprüfe deine API Key in den Einstellungen."
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: errorMessage,
        category: activeTab 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = async (tab: Category) => {
    setActiveTab(tab)
    
    // Only generate AI message if object is already set
    if (!reflectionObject) return

    setIsLoading(true)
    try {
      const modeInstructions = instructions[tab]
      const basePrompt = `Du bist ein Reflexionsassistent, der Menschen hilft, über Gegenstände nachzudenken. Der Benutzer reflektiert über "${reflectionObject}".

${modeInstructions}

WICHTIG: Stelle NUR EINE offene, nachdenkliche Frage (keine Aussagen, keine Mehrzahl von Fragen). Die Frage sollte den Benutzer dazu anregt, tief über diesen neuen Aspekt des Gegenstandes nachzudenken. Die Frage muss auf Deutsch sein, kurz und prägnant (maximal 15 Wörter).`

      const aiResponse = await callGeminiAPI(basePrompt)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: aiResponse.trim(),
        category: tab
      }])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten. Bitte überprüfe deine API Key in den Einstellungen."
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: errorMessage,
        category: tab
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'Funktion', icon: Zap },
    { id: 'Emotion', icon: Heart },
    { id: 'Werte', icon: Scale },
  ] as const

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
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Modus-spezifische Anweisungen</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadDefaultInstructions}
                  className="h-8 px-2 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              {tabs.map((tab) => (
                <div key={tab.id} className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <tab.icon className="h-3 w-3" />
                    {tab.id}
                  </label>
                  <div>
                    <textarea
                      ref={(el) => {
                        instructionsRefs.current[tab.id] = el
                        adjustTextareaHeight(el)
                      }}
                      value={instructions[tab.id]}
                      onChange={(e) => {
                        setInstructions(prev => ({ ...prev, [tab.id]: e.target.value }))
                        adjustTextareaHeight(e.target)
                      }}
                      placeholder={`Anweisungen für ${tab.id} Modus...`}
                      className={cn(
                        "flex w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm shadow-sm text-foreground resize-none overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                      )}
                      style={{ minHeight: '2.5rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Segmented Switch */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center p-1 bg-muted/80 backdrop-blur-md rounded-xl border border-border/40 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-all duration-300 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.id}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-28 pb-40 scroll-smooth">
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
                    {msg.category && <span>{msg.category}</span>}
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
