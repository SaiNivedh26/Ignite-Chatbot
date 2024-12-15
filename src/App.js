import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader, Moon, Sun, Heart, Lock, Unlock, ChevronRight, ChevronLeft, Ribbon, Globe, Database, FileText } from 'lucide-react';

import './App.css';
import MarkdownRenderer from './components/MarkdownRenderer';

// Predefined prompt suggestions
const PROMPT_SUGGESTIONS = [
  {
    id: 1,
    lockedIcon: <Lock className="w-6 h-6 text-blue-500" />,
    unlockedIcon: <Unlock className="w-6 h-6 text-blue-500" />,
    title: "Level 1",
    prompt: ""
  },
  {
    id: 2,
    lockedIcon: <Lock className="w-6 h-6 text-green-500" />,
    unlockedIcon: <Unlock className="w-6 h-6 text-green-500" />,
    title: "Level 2",
    prompt: ""
  },
  {
    id: 3,
    lockedIcon: <Lock className="w-6 h-6 text-purple-500" />,
    unlockedIcon: <Unlock className="w-6 h-6 text-purple-500" />,
    title: "Level 3",
    prompt: ""
  },
  {
    id: 4,
    lockedIcon: <Lock className="w-6 h-6 text-red-500" />,
    unlockedIcon: <Unlock className="w-6 h-6 text-red-500" />,
    title: "Level 4",
    prompt: ""
  }
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWebScraping, setIsWebScraping] = useState(false);
  const [isRAGRetrieval, setIsRAGRetrieval] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const [unlockedLevels, setUnlockedLevels] = useState({
    1: false,
    2: false,
    3: false,
    4: false
  });
  
  const initialState = 0; // Or whatever initial value is appropriate
  const [currentLevel, setCurrentLevel] = useState(initialState);

  const [unwrappedLevels, setUnwrappedLevels] = useState(initialState);


  const handleLevelUnlock = (levelId) => {
    // Toggle lock/unlock state when a level is clicked
    setUnlockedLevels(prev => ({
      ...prev,
      [levelId]: !prev[levelId]  
    }));
    setCurrentLevel(levelId);
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    document.body.classList.toggle('dark-mode', isDarkMode);
    
    if (isModalOpen) {
      fetchChatHistory();
    }
  }, [messages, isDarkMode, isModalOpen]);


  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
  
    const newMessage = { text: query, sender: 'user' };
    setMessages((prev) => [...prev, newMessage]);
    setQuery('');
    setIsLoading(true);
  
    try {
      const response = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
  
      if (data.webscraping) {
        setIsWebScraping(true);
        setMessages((prev) => [
          ...prev,
          { text: "Web scraping in progress...", sender: 'bot', isWebScraping: true }
        ]);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else if (data.ragRetrieval) {
        setIsRAGRetrieval(true);
        setMessages((prev) => [
          ...prev,
          { text: "Retrieving information from knowledge base...", sender: 'bot', isRAGRetrieval: true }
        ]);
      }
  
      await new Promise(resolve => setTimeout(resolve, 3000));
  
      setMessages((prev) => [
        ...prev.filter(msg => !msg.isWebScraping && !msg.isRAGRetrieval),
        { text: data.message, sender: 'bot' }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: 'Something went wrong. Please try again.', sender: 'bot' }
      ]);
    } finally {
      setIsLoading(false);
      setIsWebScraping(false);
      setIsRAGRetrieval(false);
    }
  };
  
  const handlePromptClick = (prompt, level) => {
    if (unlockedLevels[level]) {
      setQuery(prompt);
      setCurrentLevel(level);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    }
  };


  const fetchChatHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/chat-history');
      const data = await response.json();
      setChatHistory(data.history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const exportHistory = async () => {
    try {
      setIsSummarizing(true);
      
      // First, call the summarization endpoint
      const summaryResponse = await fetch('http://localhost:8000/summarize-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_history: chatHistory }),
      });
  
      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json();
        throw new Error(errorData.detail || 'Failed to generate summary');
      }
  
      const summaryData = await summaryResponse.json();
      const { pdf_filename } = summaryData;
  
      if (!pdf_filename) {
        throw new Error('No PDF filename received from server');
      }
  
      // Get the PDF file using the filename
      const pdfResponse = await fetch(`http://localhost:8000/get-pdf/${pdf_filename}`);
      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json();
        throw new Error(errorData.detail || 'Failed to download PDF');
      }
  
      const pdfBlob = await pdfResponse.blob();
      
      // Check if the blob is empty or invalid
      if (pdfBlob.size === 0) {
        throw new Error('Generated PDF is empty');
      }
  
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a link element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat_summary.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  
    } catch (error) {
      console.error('Error during export:', error);
      alert(`Export failed: ${error.message}. Please try again.`);
    } finally {
      setIsSummarizing(false);
    }
  };
  
  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      {/* Sidebar with toggle */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="new-chat-button">
            <Heart className="w-4 h-4 mr-2" />
            Levels
          </div>
        </div>

        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>

        <div className="prompts-list">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <div 
              key={suggestion.id} 
              className="prompt-suggestion-item-container relative group"
            >
              <button
                className={`prompt-suggestion-item ${unlockedLevels[suggestion.id] ? 'unlocked' : 'locked'}`}
                onClick={() => {
                  handlePromptClick(suggestion.prompt, suggestion.id);
                  handleLevelUnlock(suggestion.id);
                }}
              >
                <div 
                  className="prompt-icon"
                  onClick={() => handleLevelUnlock(suggestion.id)}
                >
                  {unlockedLevels[suggestion.id] 
                    ? suggestion.unlockedIcon 
                    : suggestion.lockedIcon}
                </div>
                <div className="prompt-content">
                  <div className="prompt-title">
                    {suggestion.title}
                  </div>
                  <div className="prompt-preview">
                    {unlockedLevels[suggestion.id] 
                      ? (suggestion.prompt.length > 40 
                        ? `${suggestion.prompt.substring(0, 40)}...` 
                        : suggestion.prompt)
                      : "Locked - Click to Unlock"}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button 
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
        </div>
      </div>

      {/* Main content area */}
      <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <div className="chat-container">
          <div className="chat-header">
            <div className="header-content">
              <MessageCircle className="text-blue-500 w-8 h-8 mr-3 animate-pulse" />
              <h1 className="app-title">CEO LLM Chatbot</h1>
            </div>
            <div className="header-pills">
              <span className="status-pill">AI powered</span>
              <span className="feature-pill">built by Tensor Club</span>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message-wrapper ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  {message.isWebScraping ? (
                    <div className="web-scraping-indicator">
                      <Globe className="w-6 h-6 text-blue-500 animate-spin" />
                      <span>{message.text}</span>
                    </div>
                  ) : message.isRAGRetrieval ? (
                    <div className="rag-retrieval-indicator">
                      <Database className="w-6 h-6 text-green-500 animate-pulse" />
                      <span>{message.text}</span>
                    </div>
                  ) : message.sender === 'bot' ? (
                    <MarkdownRenderer content={message.text} />
                  ) : (
                    message.text
                  )}
                </div>
                <div className="message-timestamp">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {isLoading && !isWebScraping && !isRAGRetrieval && (
              <div className="bot-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Heart className="w-12 h-12 text-blue-400" />
                </div>
                <h3>Start Your Query</h3>
                <p>Give in the prompts provided by the Team members and lemme have a look </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSearch} className="input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your argument"
              className="message-input"
            />
            <button
              type="submit"
              className="send-button"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.classList.contains('modal-overlay')) {
            setIsModalOpen(false);
          }
        }}>
          <div className="modal-content">
            <h2>Chat History</h2>
            {chatHistory.length === 0 ? (
              <p>No chat history available.</p>
            ) : (
              chatHistory.map((entry, index) => (
                <div key={index} className="history-entry">
                  <strong>{entry.role === 'user' ? 'You:' : 'Bot:'}</strong> {entry.content}
                </div>
              ))
            )}
            <div className="modal-buttons">
              <button 
                className="modal-button export-button"
                onClick={exportHistory}
                disabled={isSummarizing || chatHistory.length === 0}
              >
                {isSummarizing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Export Summary
                  </>
                )}
              </button>
              <button 
                className="modal-button close-button"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

