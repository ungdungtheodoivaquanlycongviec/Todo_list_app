"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUIState } from '../../contexts/UIStateContext';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';

interface Message {
  name: string;
  message: string;
}

const CHATBOT_API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:5000';

interface ChatbotWidgetProps {
  hidden?: boolean;
}

export default function ChatbotWidget({ hidden = false }: ChatbotWidgetProps) {
  const { user } = useAuth();
  const { isTaskDetailOpen } = useUIState();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chatbox opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close chatbox when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        chatboxRef.current &&
        toggleButtonRef.current &&
        !chatboxRef.current.contains(event.target as Node) &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = { name: 'User', message: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = getToken();
      const response = await fetch(`${CHATBOT_API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          token: token // Send JWT token for authentication
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();
      const botMessage: Message = { name: 'Bot', message: data.answer || 'Xin lỗi, tôi không thể trả lời câu hỏi này.' };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        name: 'Bot',
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      // Check if user is admin or super_admin
      const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

      // Add welcome message when opening for the first time
      let welcomeText = `Xin chào ${user?.name || 'bạn'}! Tôi là trợ lý ảo của bạn.`;

      if (isAdmin) {
        welcomeText += ` Tôi có thể giúp bạn với các câu hỏi về quản trị hệ thống, quản lý người dùng, và nhiều điều khác. Bạn cần giúp gì không?`;
      } else {
        welcomeText += ` Tôi có thể giúp bạn kiểm tra tasks, hỏi về lịch làm việc và nhiều điều khác. Bạn cần giúp gì không?`;
      }

      const welcomeMessage: Message = {
        name: 'Bot',
        message: welcomeText
      };
      setMessages([welcomeMessage]);
    }
  };

  // Show chatbot for all authenticated users (including admin and super_admin)
  // Admin and super_admin can use chatbot
  // Hide when: not authenticated, explicitly hidden (chat view), or task detail is open
  if (!user || hidden || isTaskDetailOpen) {
    return null;
  }

  return (
    <>
      {/* Sidebar Peek Toggle Button - Fixed to bottom-right edge */}
      <button
        ref={toggleButtonRef}
        onClick={toggleChat}
        className="fixed right-0 bottom-16 z-50 bg-gradient-to-b from-sky-400 to-blue-600 text-white px-2.5 py-4 rounded-l-xl shadow-lg hover:shadow-xl hover:px-3 transition-all duration-300 flex flex-col items-center justify-center gap-1"
        aria-label="Open AI Assistant"
      >
        {/* Four-point star / Sparkle icon */}
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
        <span className="font-bold text-sm tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>AI</span>
      </button>

      {/* Floating Chatbox Window */}
      <div
        ref={chatboxRef}
        className={`fixed bottom-16 right-12 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 transition-all duration-300 ease-in-out ${isOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-white/80">Tôi có thể giúp gì cho bạn?</p>
            </div>
          </div>
          <button
            onClick={toggleChat}
            className="hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.name === 'User' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.name === 'User'
                  ? 'bg-blue-500 text-white rounded-tr-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg rounded-tl-none px-4 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || loading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


