import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader, Moon, Sun, Heart, Lock, Unlock, ChevronRight, ChevronLeft, Ribbon, Globe, Database, FileText } from 'lucide-react';

import './App.css';
import MarkdownRenderer from './components/MarkdownRenderer';

// Prompt Templates for Different Levels
const PROMPT_TEMPLATES = {
  1: `You are a CEO at the leadership Level 1 (Foundational Leadership). 
Evaluate the team's argument focusing on:
- Resilience and adaptability
- Trust-building communication
- Team collaboration potential
Provide constructive feedback that encourages growth and learning.`,

  2: `You are a CEO at the leadership Level 2 (Strategic and Decisive Leadership). 
Evaluate the team's argument considering:
- Alignment with company's short and long-term goals
- Data-driven decision making
- Strategic market positioning
- Stakeholder perspectives and potential impact`,

  3: `You are a CEO at the leadership Level 3 (Adaptive and Innovative Leadership). 
Critically analyze the team's argument by examining:
- Continuous learning and improvement
- Resilience during uncertainty
- Innovative problem-solving approaches
- Adaptability to changing business landscapes`,

  4: `You are a CEO at the leadership Level 4 (Visionary and Customer-Centric Leadership). 
Comprehensively assess the team's argument through the lens of:
- Disruptive and creative solutions
- Global cultural sensitivity
- Sustainability and social responsibility
- Customer-centric innovation
- Long-term brand and societal impact`
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  const [unlockedLevels, setUnlockedLevels] = useState({
    1: true,  // First level is always unlocked
    2: false,
    3: false,
    4: false
  });
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentPrompt, setCurrentPrompt] = useState(PROMPT_TEMPLATES[1]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [messages, isDarkMode]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
  
    const newMessage = { text: query, sender: 'user' };
    setMessages((prev) => [...prev, newMessage]);
    setQuery('');
    setIsLoading(true);
  
    try {
      const response = await fetch('https://ignite-backend-0uxt.onrender.com/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: `${currentPrompt}\n\nTeam Argument: ${query}`,
          level: currentLevel
        })
      });

      const data = await response.json();
  
      setMessages((prev) => [
        ...prev,
        { text: data.response, sender: 'bot' }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: 'Something went wrong. Please try again.', sender: 'bot' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePromptClick = (prompt, level) => {
    if (unlockedLevels[level]) {
      setCurrentPrompt(prompt);
      setCurrentLevel(level);
      setQuery('');
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    }
  };

  const handleLevelUnlock = (levelId) => {
    if (levelId > currentLevel) {
      // Only allow unlocking next sequential level
      const previousLevelUnlocked = Object.keys(unlockedLevels)
        .filter(key => parseInt(key) < levelId)
        .every(key => unlockedLevels[key]);

      if (previousLevelUnlocked) {
        setUnlockedLevels(prev => ({
          ...prev,
          [levelId]: true
        }));
        setCurrentLevel(levelId);
        setCurrentPrompt(PROMPT_TEMPLATES[levelId]);
      }
    } else {
      // If lower or same level, just switch
      setCurrentLevel(levelId);
      setCurrentPrompt(PROMPT_TEMPLATES[levelId]);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const PROMPT_SUGGESTIONS = [
    {
      id: 1,
      lockedIcon: <Lock className="w-6 h-6 text-blue-500" />,
      unlockedIcon: <Unlock className="w-6 h-6 text-blue-500" />,
      title: "Level 1",
      prompt: PROMPT_TEMPLATES[1]
    },
    {
      id: 2,
      lockedIcon: <Lock className="w-6 h-6 text-green-500" />,
      unlockedIcon: <Unlock className="w-6 h-6 text-green-500" />,
      title: "Level 2",
      prompt: PROMPT_TEMPLATES[2]
    },
    {
      id: 3,
      lockedIcon: <Lock className="w-6 h-6 text-purple-500" />,
      unlockedIcon: <Unlock className="w-6 h-6 text-purple-500" />,
      title: "Level 3",
      prompt: PROMPT_TEMPLATES[3]
    },
    {
      id: 4,
      lockedIcon: <Lock className="w-6 h-6 text-red-500" />,
      unlockedIcon: <Unlock className="w-6 h-6 text-red-500" />,
      title: "Level 4",
      prompt: PROMPT_TEMPLATES[4]
    }
  ];

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
                className={`prompt-suggestion-item 
                  ${unlockedLevels[suggestion.id] ? 'unlocked' : 'locked'}
                  ${currentLevel === suggestion.id ? 'active' : ''}`}
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
              <span className="status-pill">Level {currentLevel}</span>
              <span className="feature-pill">Leadership Simulation</span>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message-wrapper ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  {message.sender === 'bot' ? (
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

            {isLoading && (
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
                <h3>Start Your Leadership Challenge</h3>
                <p>Select a leadership level and submit your team's argument</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSearch} className="input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Level ${currentLevel} Team Argument`}
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
    </div>
  );
}