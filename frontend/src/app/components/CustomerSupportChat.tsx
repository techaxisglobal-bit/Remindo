import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PREDEFINED_QUESTIONS = [
  "How to set the reminder?",
  "How do I create a special reminder?",
  "How do I set a repeating reminder?",
  "How do I change my password?",
  "How do I switch to Dark Mode?"
];

export function CustomerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi there! I am your RemindDo Customer Service Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (msgOverride?: string | React.MouseEvent) => {
    const textToSend = typeof msgOverride === 'string' ? msgOverride : input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = textToSend.trim();
    if (typeof msgOverride !== 'string') setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed with status ${response.status}: Please restart your backend server using 'npm start' so the new chat API can load.`);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              setIsLoading(false);
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastMsg = newMsgs[newMsgs.length - 1];
                  lastMsg.content += data.text;
                  return newMsgs;
                });
              } else if (data.error) {
                console.error("AI Error:", data.error);
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = "Sorry, I encountered an error connecting to the AI provider. Please check your API key.";
                  return newMsgs;
                });
                setIsLoading(false);
              }
            } catch (e) {
              console.error("Failed to parse SSE data", e);
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => {
        const newMsgs = [...prev];
        const isNetworkErr = e.message === 'Failed to fetch' || e.message.includes('NetworkError');
        newMsgs[newMsgs.length - 1].content = isNetworkErr
          ? "Network Error: Please restart the backend server (Ctrl+C then `npm start`)."
          : `Error: ${e.message}`;
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-[#e0b596] text-white rounded-full shadow-2xl hover:bg-[#d4a37f] hover:-translate-y-1 transition-all z-40 ${isOpen ? 'hidden' : 'block'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-50 h-[600px] max-h-[calc(100vh-5rem)]"
          >
            <div className="p-4 bg-[#e0b596] text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white/20 flex items-center justify-center rounded-md text-white font-black text-xs tracking-tighter">
                  RD
                </div>
                <h3 className="font-bold text-sm">RemindDo Support</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-[#1a1a1a]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300' : 'bg-[#e0b596]/20 text-[#e0b596]'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <span className="text-[10px] font-black tracking-tighter">RD</span>}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-gray-100 rounded-tr-sm' : 'bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#333] flex flex-col gap-3">
              <div className="flex flex-col gap-2 pb-1">
                <button
                  onClick={() => setShowQuestions(prev => !prev)}
                  className="flex items-center justify-between w-full px-1 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-[#e0b596] transition-colors"
                >
                  <span>Quick Questions</span>
                  {showQuestions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                <AnimatePresence initial={false}>
                  {showQuestions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden flex flex-col gap-2"
                    >
                      {PREDEFINED_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(q)}
                          disabled={isLoading}
                          className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 text-[12px] font-medium rounded-xl transition-colors border border-transparent hover:border-[#e0b596]/30 disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask for help..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:ring-1 focus:ring-[#e0b596]/50 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 w-8 h-8 flex items-center justify-center bg-[#e0b596] hover:bg-[#d4a37f] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
