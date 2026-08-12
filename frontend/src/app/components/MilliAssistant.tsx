import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/app/api';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, User, Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MilliAssistantProps {
  onAddTask: (task: any) => void;
  userName?: string;
}

export function MilliAssistant({ onAddTask, userName }: MilliAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Milli, your AI reminder assistant. Tell me what to remind you about, like 'Remind me tomorrow at 9 AM to call Mom'." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<'listening' | 'denied' | 'unsupported'>('unsupported');
  const isGreeting = useRef(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      return;
    }

    let isDenied = false;
    let isUnmounted = false;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setMicStatus('listening');
    };

    recognition.onresult = (event: any) => {
      if (isGreeting.current) return;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        
        if (transcript.includes('hey milli') || transcript.includes('hi milli') || transcript.includes('hello milli')) {
          isGreeting.current = true;
          setIsOpen(true);
          
          const greetingText = `Hey ${userName || 'there'}, I'm Milli, your personal assistant. How can I help you?`;
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: greetingText 
          }]);

          if ('speechSynthesis' in window) {
             const utterance = new SpeechSynthesisUtterance(greetingText);
             window.speechSynthesis.speak(utterance);
          }

          setTimeout(() => {
            isGreeting.current = false;
          }, 5000);
          
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isDenied = true;
        setMicStatus('denied');
      }
    };

    recognition.onend = () => {
      if (!isDenied && !isUnmounted) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      // Ignore
    }

    return () => {
      isUnmounted = true;
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [userName]);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});
    if (token) headers.set('x-auth-token', token);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.msg || 'API Request Failed');
    }
    return response.json();
  };

  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      const timezoneOffset = new Date().getTimezoneOffset();
      
      const response = await fetchWithAuth('/api/milli', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          currentDate: new Date().toISOString(),
          history: messages
        })
      });

      if (response.status === 'clarify') {
        setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
      } else if (response.status === 'success' && response.task) {
        // AI parsed the task successfully, let's create it via our existing API
        const newTask = await fetchWithAuth('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: response.task.title,
            date: response.task.date,
            time: response.task.time,
            isAllDay: response.task.isAllDay || false
          })
        });
        
        onAddTask(newTask);
        toast.success('Reminder created!');
        setMessages(prev => [...prev, { role: 'assistant', content: response.message || `I've created a reminder for "${response.task.title}" on ${response.task.date} at ${response.task.time}.` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't understand that. Could you try rephrasing?" }]);
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,16px)+80px)] lg:bottom-6 right-6 p-4 bg-[#8b5cf6] text-white rounded-full shadow-2xl hover:bg-[#7c3aed] hover:-translate-y-1 transition-all z-40 ${isOpen ? 'hidden' : 'block'}`}
      >
        <Sparkles className="w-6 h-6" />
        {micStatus === 'listening' && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white dark:border-[#1f1f1f]"></span>
          </span>
        )}
        {micStatus === 'denied' && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 relative inline-flex rounded-full bg-red-500 border-2 border-white dark:border-[#1f1f1f]" title="Microphone permission denied"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom,16px)+80px)] lg:bottom-6 right-6 w-80 md:w-96 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-50 h-[600px] max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-5rem)]"
          >
            <div className="p-4 bg-[#8b5cf6] text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 flex items-center justify-center rounded-full text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Milli AI</h3>
                  <p className="text-[10px] text-white/80 leading-none mt-0.5">Your Smart Assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-[#1a1a1a]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300' : 'bg-[#8b5cf6]/20 text-[#8b5cf6]'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#8b5cf6] text-white rounded-tr-sm shadow-sm' : 'bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex gap-2 max-w-[85%] mr-auto">
                   <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-[#8b5cf6]/20 text-[#8b5cf6]">
                     <Sparkles className="w-4 h-4" />
                   </div>
                   <div className="p-3 bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                     <span className="flex gap-1">
                       <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" />
                       <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" />
                       <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" />
                     </span>
                   </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#333] flex flex-col gap-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type a reminder..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                  className="w-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]/50 text-sm disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 w-8 h-8 flex items-center justify-center bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
