import { ChatInterface } from './components/ChatInterface';

function App() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 md:p-8 font-sans antialiased text-foreground">
      <div className="w-full max-w-4xl h-[85vh] md:h-[90vh] bg-gray-100 rounded-3xl overflow-hidden border border-white/50">
        <ChatInterface />
      </div>
    </div>
  );
}

export default App;
