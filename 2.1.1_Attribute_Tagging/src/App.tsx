import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, X, Pin, MessageSquare, ArrowUp, Settings, Check, XCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import "./App.css"

interface Tag {
  id: string
  x: number // percentage
  y: number // percentage
  messageId?: string
}

interface Message {
  id: string
  text: string
  isUser: boolean
  tagId?: string
}

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [pendingTag, setPendingTag] = useState<{ x: number; y: number } | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash")
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setTags([])
        setMessages([])
        setPendingTag(null)
        setSelectedTagId(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!image || !imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // If there's text in the input, create a tag and message
    if (inputText.trim()) {
      const tagId = `tag-${Date.now()}`
      const messageId = `msg-${Date.now()}`
      
      const newTag: Tag = {
        id: tagId,
        x,
        y,
        messageId,
      }

      const newMessage: Message = {
        id: messageId,
        text: inputText.trim(),
        isUser: true,
        tagId,
      }

      setTags((prev) => [...prev, newTag])
      setMessages((prev) => [...prev, newMessage])
      
      // Add AI response (demo mode)
      setTimeout(() => {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          text: "I understand you're referring to this area of the image.",
          isUser: false,
        }
        setMessages((prev) => [...prev, aiMessage])
      }, 500)

      setInputText("")
      setSelectedTagId(tagId)
    } else {
      // Just show pending tag location
      setPendingTag({ x, y })
    }
  }

  const handleSendMessage = () => {
    if (!inputText.trim()) return

    // If there's a pending tag, create tag and message
    if (pendingTag) {
      const tagId = `tag-${Date.now()}`
      const messageId = `msg-${Date.now()}`
      
      const newTag: Tag = {
        id: tagId,
        x: pendingTag.x,
        y: pendingTag.y,
        messageId,
      }

      const newMessage: Message = {
        id: messageId,
        text: inputText.trim(),
        isUser: true,
        tagId,
      }

      setTags((prev) => [...prev, newTag])
      setMessages((prev) => [...prev, newMessage])
      setPendingTag(null)
      setSelectedTagId(tagId)
    } else {
      // Regular message without tag
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        text: inputText.trim(),
        isUser: true,
      }
      setMessages((prev) => [...prev, newMessage])
    }

    // Add AI response (demo mode)
    setTimeout(() => {
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: pendingTag 
          ? "I understand you're referring to this area of the image."
          : "How can I help you with this image?",
        isUser: false,
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 500)

    setInputText("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const removeTag = (tagId: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== tagId))
    setMessages((prev) => prev.filter((msg) => msg.tagId !== tagId))
    if (selectedTagId === tagId) {
      setSelectedTagId(null)
    }
  }

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSettings])

  // Load saved API key and model from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem("apiKey")
    const savedModel = localStorage.getItem("selectedModel")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, [])

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyValid(false)
      return
    }

    setIsValidating(true)
    setApiKeyValid(null)

    try {
      // Validate API key based on selected model
      if (selectedModel.startsWith("gemini")) {
        // For Gemini API, check if key starts with expected format
        // You can make an actual API call here to validate
        const isValid = apiKey.trim().length > 0 && /^[A-Za-z0-9_-]+$/.test(apiKey.trim())
        setApiKeyValid(isValid)
        
        if (isValid) {
          localStorage.setItem("apiKey", apiKey.trim())
          localStorage.setItem("selectedModel", selectedModel)
        }
      } else if (selectedModel.startsWith("gpt") || selectedModel.startsWith("claude")) {
        // For OpenAI/Anthropic, check format
        const isValid = apiKey.trim().length > 0
        setApiKeyValid(isValid)
        
        if (isValid) {
          localStorage.setItem("apiKey", apiKey.trim())
          localStorage.setItem("selectedModel", selectedModel)
        }
      } else {
        setApiKeyValid(apiKey.trim().length > 0)
        if (apiKey.trim().length > 0) {
          localStorage.setItem("apiKey", apiKey.trim())
          localStorage.setItem("selectedModel", selectedModel)
        }
      }
    } catch (error) {
      setApiKeyValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    // Re-validate API key when model changes
    if (apiKey.trim()) {
      validateApiKey()
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden p-4 gap-4 bg-gray-100">
      {/* Left side - Image area (60%) */}
      <div className="flex-[0.6] flex flex-col border border-border rounded-lg bg-muted/30 shadow-sm">
        <div className="p-4 border-b border-border bg-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Image</h2>
            <div className="flex items-center gap-2">
              {image && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setImage(null)
                    setTags([])
                    setMessages([])
                    setPendingTag(null)
                    setSelectedTagId(null)
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div
          ref={imageContainerRef}
          className="flex-1 relative overflow-auto bg-background flex items-center justify-center cursor-crosshair rounded-b-lg"
          onClick={handleImageClick}
        >
          {image ? (
            <>
              <img
                src={image}
                alt="Uploaded"
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
              
              {/* Tags */}
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                    selectedTagId === tag.id ? "z-20" : "z-10"
                  }`}
                  style={{
                    left: `${tag.x}%`,
                    top: `${tag.y}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTagId(tag.id === selectedTagId ? null : tag.id)
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedTagId === tag.id
                        ? "border-blue-500 bg-blue-500/20 scale-125"
                        : "border-blue-500 bg-white"
                    } transition-all duration-200`}
                  />
                  {selectedTagId === tag.id && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-background border border-border rounded-md px-2 py-1 shadow-lg text-xs">
                      <Pin size={12} className="inline mr-1" />
                      Tagged
                    </div>
                  )}
                </div>
              ))}

              {/* Pending tag indicator */}
              {pendingTag && (
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: `${pendingTag.x}%`,
                    top: `${pendingTag.y}%`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-blue-500 bg-blue-500/10 animate-pulse" />
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-background border border-border rounded-md px-2 py-1 shadow-lg text-xs text-muted-foreground">
                    Click to pin message
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Upload size={48} className="opacity-50" />
              <p className="text-sm">Upload an image to get started</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Choose Image
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Chat area (40%) */}
      <div className="flex-[0.4] flex flex-col border border-border rounded-lg bg-background relative shadow-sm">
        <div className="p-4 border-b border-border relative">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center gap-2">
              <MessageSquare size={16} />
              Reflexion Chat
            </h2>
            <div className="relative" ref={settingsRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8"
              >
                <Settings size={16} />
              </Button>
              
              {showSettings && (
                <div className="absolute right-0 top-10 z-50 w-80 bg-background border border-border rounded-lg shadow-lg p-4">
                  <h3 className="text-sm font-semibold mb-3">Settings</h3>
                  
                  {/* Model Selector */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      AI Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </select>
                  </div>

                  {/* API Key Input */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      API Key
                    </label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value)
                          setApiKeyValid(null)
                        }}
                        placeholder="Enter your API key"
                        className="pr-8"
                      />
                      {apiKeyValid !== null && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {apiKeyValid ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <XCircle size={16} className="text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {apiKeyValid === false && apiKey.trim() && (
                      <p className="text-xs text-red-500 mt-1">Invalid API key</p>
                    )}
                    {apiKeyValid === true && (
                      <p className="text-xs text-green-500 mt-1">API key is valid</p>
                    )}
                  </div>

                  {/* Validate Button */}
                  <Button
                    onClick={validateApiKey}
                    disabled={isValidating || !apiKey.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {isValidating ? "Validating..." : "Validate API Key"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Start a conversation about the image
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                    message.isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.tagId && (
                    <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
                      <Pin size={10} />
                      <span>Pinned to image</span>
                    </div>
                  )}
                  <p>{message.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Input area */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {pendingTag && (
            <div className="mb-2 px-3 py-2 bg-accent rounded-md text-xs text-foreground flex items-center gap-2">
              <Pin size={12} />
              <span>Your message will be pinned to the selected location on the image</span>
            </div>
          )}
          {selectedTagId && !pendingTag && (
            <div className="mb-2 px-3 py-2 bg-accent rounded-md text-xs text-foreground flex items-center gap-2">
              <Pin size={12} />
              <span>You are viewing a tagged message. Click on the image to create a new tag.</span>
            </div>
          )}
          <div className="relative bg-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                pendingTag
                  ? "Type a message to pin here..."
                  : "Type a message or click on image to tag..."
              }
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputText.trim()}
              className="shrink-0"
              size="icon"
            >
              <ArrowUp size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App




