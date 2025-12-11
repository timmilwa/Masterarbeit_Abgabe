import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import ReflectionControls from './components/ReflectionControls';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import { generateResponse, generateSummaries } from './services/gemini';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [customInstructions, setCustomInstructions] = useState(localStorage.getItem('gemini_custom_instructions') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [reflectionObject, setReflectionObject] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null); // 'Funktion', 'Emotion', 'Werte'
  const [summaries, setSummaries] = useState({ function: '', emotion: '', values: '' });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('gemini_custom_instructions', customInstructions);
  }, [customInstructions]);

  // Initial Greet
  useEffect(() => {
    if (messages.length === 0) {
      if (!apiKey) {
        setMessages([{
          sender: 'bot',
          text: 'Hallo! Bitte füge zuerst deinen Google Gemini API Key in den Einstellungen hinzu, um zu starten.'
        }]);
        setIsSettingsOpen(true);
      } else {
        setMessages([{
          sender: 'bot',
          text: 'Hallo! Über welches Objekt möchtest du heute reflektieren?'
        }]);
      }
    }
  }, [apiKey, messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let prompt = input;
      let nextMessages = [...messages, userMsg];

      // Logic State Machine
      if (!reflectionObject) {
        // First turn: User defines object
        setReflectionObject(input);
        prompt = `Das Reflexionsobjekt ist: "${input}". Bestätige das kurz und bitte den Nutzer, eine Reflexionsebene (Funktion, Emotion, Werte) auszuwählen.`;
      } else if (currentLevel) {
        // Active reflection
        prompt = input; // Just pass user answer, context history handles the rest
      } else {
        // Object set but no level selected yet (user just chatting?)
        // We guide them back to selecting a level
        prompt = `Der Nutzer hat geschrieben: "${input}". Bitte ihn freundlich, eine der drei Ebenen (Funktion, Emotion, Werte) zu wählen, um die Reflexion zu vertiefen.`;
      }

      const botText = await generateResponse(
        apiKey,
        nextMessages.filter(m => m.sender !== 'bot' || m.text !== '...'), // simplified history mapping in service handles roles
        prompt,
        `Du bist ein reflektiver AI-Begleiter.
         Das aktuelle Objekt der Reflexion ist: ${reflectionObject || 'Noch nicht definiert'}.
         Die aktuelle Ebene ist: ${currentLevel || 'Keine Ausgewählt'}.
         Ziel: Stelle vertiefende Fragen basierend auf der ausgewählten Ebene.
         ${customInstructions}`
      );

      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);

      // Update summaries in background
      generateSummaries(apiKey, [...nextMessages, { sender: 'bot', text: botText }], summaries)
        .then(newSummaries => setSummaries(newSummaries))
        .catch(err => console.error("Summarization error:", err));
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: `Fehler: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLevelSelect = async (level) => {
    setCurrentLevel(level);
    setIsTyping(true);

    // Trigger immediate question from bot for this level
    try {
      const prompt = `Der Nutzer hat die Ebene "${level}" ausgewählt. Stelle nun eine reflektierende Frage zu "${reflectionObject}" basierend auf der Ebene "${level}".`;

      const botText = await generateResponse(
        apiKey,
        messages,
        prompt,
        `Du bist ein reflektiver AI-Begleiter.
         Das aktuelle Objekt der Reflexion ist: ${reflectionObject}.
         Die aktuelle Ebene ist: ${level}.
         Ziel: Stelle EINE präzise, tiefgehende Frage passend zur Ebene.
         ${customInstructions}`
      );

      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);

    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: `Fehler beim Wechseln der Ebene: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Layout sidebar={<Sidebar summaries={summaries} />}>
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <ReflectionControls
        currentLevel={currentLevel}
        onSelectLevel={handleLevelSelect}
        disabled={!reflectionObject || isTyping}
      />

      <ChatInterface
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isTyping={isTyping}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        customInstructions={customInstructions}
        setCustomInstructions={setCustomInstructions}
      />
    </Layout>
  );
}

export default App;
