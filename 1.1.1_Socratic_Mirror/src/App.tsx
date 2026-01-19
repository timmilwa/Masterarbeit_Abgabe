
import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, Send, Sparkles, Zap, Heart, Scale } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = 'Funktion' | 'Emotion' | 'Werte'

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
      content: "Hello. I am your minimalist AI assistant. How can I help you design something beautiful today?"
    },
    {
      id: '2',
      role: 'user',
      content: "I need a clean interface for a chat application. It should strictly follow a minimalist design system."
    },
    {
      id: '3',
      role: 'ai',
      content: "I can certainly help with that. We will focus on whitespace, typography, and subtle interactions. The palette will be grounded in off-whites and fast blacks."
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [activeTab, setActiveTab] = useState<Category>('Funktion')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [customInstructions, setCustomInstructions] = useState("")
  const settingsRef = useRef<HTMLDivElement>(null)

  const handleSend = () => {
    if (!inputValue.trim()) return
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputValue }])
    setInputValue("")
    // Simulating AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: "That sounds excellent. Let's proceed.", category: activeTab }])
    }, 1000)
  }

  const handleTabChange = (tab: Category) => {
    setActiveTab(tab)
    // Generate AI message for the new category
    const responses: Record<Category, string> = {
      'Funktion': "Focusing on functionality. How does this serve the user's primary goal?",
      'Emotion': "Exploring the emotional resonance. How should the user feel at this moment?",
      'Werte': "Aligning with core values. What principles are we upholding?"
    }
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'ai',
      content: responses[tab],
      category: tab
    }])
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
          <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl border border-border/40 shadow-xl shadow-black/10 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Custom Instructions</label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Enter custom instructions for the AI..."
                rows={4}
                className={cn(
                  "flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                )}
              />
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
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground/50 text-foreground"
          />

          <Button
            onClick={handleSend}
            size="icon"
            className={cn(
              "h-10 w-10 rounded-xl transition-all duration-300",
              inputValue ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground opacity-50 shadow-none hover:bg-muted"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App
