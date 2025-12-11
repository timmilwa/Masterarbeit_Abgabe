import { ChatInterface } from './components/ChatInterface';

function App() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 md:p-8 font-sans antialiased text-foreground">
      <div className="w-full max-w-4xl h-[85vh] md:h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/50 ring-1 ring-black/5">
        <ChatInterface />
      </div>
    </div>
  );
}

export default App;
