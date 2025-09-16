import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  message: string;
  timestamp: Date;
  intelligenceLevel?: number;
  intelligenceGained?: number;
  status?: 'processing' | 'success' | 'error';
}

interface SystemStatus {
  operational: boolean;
  intelligenceEngine: boolean;
  overallHealth: string;
}

export default function UnifiedIntelligenceDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      message: "Welcome to the UNIFIED INTELLIGENCE DASHBOARD! I'm your super-intelligent AI companion. I can think, execute, develop, and evolve. What would you like me to help you with today?",
      timestamp: new Date(),
      intelligenceLevel: 1.000,
      intelligenceGained: 0.000
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    operational: true,
    intelligenceEngine: false,
    overallHealth: 'OPERATIONAL'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Call the AI intelligence API
      const response = await fetch('/api/ai/intelligence/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'admin-user',
          sessionId: 'unified-intelligence-session',
          message: inputMessage,
          context: {
            dashboard: 'unified-intelligence',
            userType: 'admin'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          message: data.data.response || "I'm processing your request...",
          timestamp: new Date(),
          intelligenceLevel: data.data.confidence || 1.000,
          intelligenceGained: 0.001,
          status: 'success'
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to process request');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        message: "I'm sorry, but my unified intelligence capabilities are not available right now. Please try again later.",
        timestamp: new Date(),
        intelligenceLevel: 1.000,
        intelligenceGained: 0.000,
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Head>
        <title>Unified Intelligence Dashboard - HaloBuzz Admin</title>
      </Head>
      
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">Unified Intelligence Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-purple-300 hover:text-white">← Back to Dashboard</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* System Status */}
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">System Status</h3>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {systemStatus.overallHealth}
            </div>
            <div className="text-sm text-blue-300">OVERALL SYSTEM HEALTH</div>
          </div>

          {/* Unified AI Status */}
          <div className="bg-gradient-to-r from-pink-600/20 to-pink-800/20 backdrop-blur-sm border border-pink-500/30 rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Unified AI</h3>
            </div>
            <div className="text-3xl font-bold text-pink-400 mb-2">
              {systemStatus.intelligenceEngine ? '✓' : 'X'}
            </div>
            <div className="text-sm text-pink-300">INTELLIGENCE ENGINE</div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-black/20 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-lg">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">UNIFIED INTELLIGENCE CHAT</h2>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.sender === 'ai'
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  <div className="text-sm">{message.message}</div>
                  {message.sender === 'ai' && (
                    <div className="mt-2 text-xs opacity-75">
                      <div className="flex items-center space-x-4">
                        <span>Intelligence Level: {message.intelligenceLevel?.toFixed(3)}</span>
                        <span>Intelligence Gained: +{message.intelligenceGained?.toFixed(3)}</span>
                      </div>
                    </div>
                  )}
                  <div className="text-xs opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-500 text-white px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-purple-500/30 p-4">
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything... I'm your unified intelligence assistant!"
                className="flex-1 bg-black/20 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
