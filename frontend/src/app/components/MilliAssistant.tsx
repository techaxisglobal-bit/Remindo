import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/app/api';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, User, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MilliAssistantProps {
  onAddTask: (task: any) => void;
  userName?: string;
}

type VoiceState = 'inactive' | 'waiting-for-wake' | 'waiting-for-command' | 'processing';

export function MilliAssistant({ onAddTask, userName }: MilliAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Milli, your AI reminder assistant. Tell me what to remind you about, like 'Remind me tomorrow at 9 AM to call Mom'." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'denied' | 'unsupported' | 'no-speech' | 'prompt'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('inactive');
  
  const restartCountRef = useRef(0);
  const lastRestartTimeRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceStateRef = useRef<VoiceState>('inactive');
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((result) => {
          if (result.state === 'granted') {
            setIsListening(true);
          } else if (result.state === 'prompt') {
            setMicStatus('prompt');
          } else if (result.state === 'denied') {
            setMicStatus('denied');
          }
          
          result.onchange = () => {
            if (result.state === 'granted') {
              setIsListening(true);
              setMicStatus('idle');
            } else if (result.state === 'denied') {
              setIsListening(false);
              setMicStatus('denied');
            }
          };
        })
        .catch((e) => console.warn('Permissions API not supported', e));
    } else {
      // Fallback for browsers without permissions API
      setIsListening(true); // Attempt to start to trigger prompt
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, voiceState]);

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

  const speakText = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      isSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (onEnd) onEnd();
        }, 500);
      };
      utterance.onerror = () => {
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (onEnd) onEnd();
        }, 500);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  };

  const processCommand = async (text: string, isVoice: boolean) => {
    if (!text.trim() || isLoading) return;
    
    if (isVoice) {
      setVoiceState('processing');
      voiceStateRef.current = 'processing';
    }
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const response = await fetchWithAuth('/api/milli', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          currentDate: new Date().toISOString(),
          history: messagesRef.current
        })
      });

      if (response.status === 'clarify') {
        setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
        if (isVoice) {
          speakText(response.message, () => setVoiceState('waiting-for-command'));
        }
      } else if (response.status === 'success' && response.task) {
        const newTask = {
          title: response.task.title,
          date: response.task.date,
          time: response.task.time,
          isAllDay: response.task.isAllDay || false
        };
        
        onAddTask(newTask);
        const confirmMsg = response.message || `I've created a reminder for "${response.task.title}" on ${response.task.date} at ${response.task.time}.`;
        setMessages(prev => [...prev, { role: 'assistant', content: confirmMsg }]);
        if (isVoice) {
          speakText(confirmMsg, () => setVoiceState('waiting-for-wake'));
        }
      } else {
        const errMsg = "I'm sorry, I couldn't understand that. Could you try rephrasing?";
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
        if (isVoice) {
          speakText(errMsg, () => setVoiceState('waiting-for-command'));
        }
      }
    } catch (e: any) {
      console.error(e);
      let errMsg = `Error: ${e.message}`;
      if (errMsg.includes('Token is not valid') || errMsg.includes('No token') || errMsg.includes('jwt expired') || errMsg.includes('unauthorized')) {
        errMsg = "Please sign in again so Milli can create reminders for you.";
      } else if (errMsg.includes('Missing GEMINI_API_KEY') || errMsg.includes('Milli AI is not configured') || errMsg.includes('Failed to process AI request')) {
        errMsg = "I'm having trouble connecting to my brain right now. Please try again later.";
      } else {
        errMsg = "I couldn't process that right now. Please try again.";
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      if (isVoice) {
        speakText(errMsg, () => setVoiceState('waiting-for-wake'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGreeting = () => {
    setVoiceState('processing');
    voiceStateRef.current = 'processing';
    const greetingText = `Hey ${userName || 'there'}, I'm Milli, your personal assistant. How can I help you?`;
    setMessages(prev => [...prev, { role: 'assistant', content: greetingText }]);
    speakText(greetingText, () => {
      setVoiceState('waiting-for-command');
      voiceStateRef.current = 'waiting-for-command';
    });
  };

  useEffect(() => {
    if (!isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setMicStatus('idle');
      setVoiceState('inactive');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      setIsListening(false);
      setVoiceState('inactive');
      toast.error('Speech recognition is not supported in this browser.');
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
      setVoiceState(prev => prev === 'inactive' ? 'waiting-for-wake' : prev);
    };

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current) return;
      
      restartCountRef.current = 0;
      
      const currentVoiceState = voiceStateRef.current;
      if (currentVoiceState === 'processing' || currentVoiceState === 'inactive') return;

      let latestFinal = '';
      let latestInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          latestFinal += event.results[i][0].transcript + ' ';
        } else {
          latestInterim += event.results[i][0].transcript + ' ';
        }
      }

      const finalNormalized = latestFinal.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").replace(/\s{2,}/g," ").trim();
      const interimNormalized = latestInterim.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").replace(/\s{2,}/g," ").trim();
      const combinedNormalized = (finalNormalized + ' ' + interimNormalized).trim();

      if (!combinedNormalized) return;
      
      console.log('Milli heard (combined):', combinedNormalized, '| Final:', finalNormalized);

      const wakePhrases = [
        'hey milli', 'hi milli', 'hello milli',
        'hey millie', 'hi millie', 'hello millie',
        'hey milly', 'hi milly', 'hello milly',
        'hey mili', 'hi mili', 'hello mili',
        'milli', 'millie', 'milly', 'mili'
      ];

      if (currentVoiceState === 'waiting-for-wake') {
         let foundInFinal = wakePhrases.find(p => finalNormalized.includes(p));
         let foundInCombined = wakePhrases.find(p => combinedNormalized.includes(p));

         if (foundInFinal) {
            setIsOpen(true);
            const remainder = finalNormalized.substring(finalNormalized.indexOf(foundInFinal) + foundInFinal.length).trim();
            if (remainder.length > 5) {
               processCommand(remainder, true);
            } else {
               triggerGreeting();
            }
         } else if (foundInCombined) {
            const remainder = combinedNormalized.substring(combinedNormalized.indexOf(foundInCombined) + foundInCombined.length).trim();
            if (remainder.length <= 5) {
               setIsOpen(true);
               triggerGreeting();
               try { recognition.stop(); } catch(e){}
            }
         }
      } else if (currentVoiceState === 'waiting-for-command') {
         if (latestFinal.trim().length > 0) {
            processCommand(latestFinal.trim(), true);
         }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied' || event.error === 'service-not-allowed') {
        isDenied = true;
        setMicStatus('denied');
        setIsListening(false);
        setVoiceState('inactive');
      } else if (event.error === 'no-speech') {
        setMicStatus('no-speech');
      }
    };

    recognition.onend = () => {
      if (!isDenied && !isUnmounted && isListening) {
        const now = Date.now();
        if (now - lastRestartTimeRef.current < 1000) {
          restartCountRef.current += 1;
        } else {
          restartCountRef.current = 0;
        }
        lastRestartTimeRef.current = now;

        if (restartCountRef.current < 3) {
          setTimeout(() => {
            try {
              if (!isUnmounted && isListening) recognition.start();
            } catch (e) {}
          }, 300);
        } else {
          console.warn('Stopped speech recognition to prevent endless restart loops.');
          setIsListening(false);
          setMicStatus('idle');
          setVoiceState('inactive');
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }

    return () => {
      isUnmounted = true;
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [userName, isListening]);

  const toggleVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    setIsListening(prev => !prev);
  };

  const handleSend = () => {
    const textToSend = input.trim();
    setInput('');
    processCommand(textToSend, false);
  };
  
  const getVoiceStatusMessage = () => {
    if (micStatus === 'denied') return "Microphone permission denied.";
    if (micStatus === 'unsupported') return "Voice recognition not supported.";
    if (micStatus === 'no-speech') return "No speech detected. Listening...";
    
    switch (voiceState) {
      case 'waiting-for-wake': return "Say \"Hey Milli\" to get started";
      case 'waiting-for-command': return "Listening for your command...";
      case 'processing': return "Processing...";
      default: return "";
    }
  };

  return (
    <>
      <div className={`fixed bottom-[calc(env(safe-area-inset-bottom,16px)+150px)] lg:bottom-[100px] right-6 z-40 ${isOpen ? 'hidden' : 'flex'} flex-col gap-3 items-center`}>

        <button
          onClick={() => setIsOpen(true)}
          className="p-4 bg-[#8b5cf6] text-white rounded-full shadow-2xl hover:bg-[#7c3aed] hover:-translate-y-1 transition-all relative"
        >
          <Sparkles className="w-6 h-6" />
          {isListening && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white dark:border-[#1f1f1f]"></span>
            </span>
          )}
          {micStatus === 'denied' && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 relative inline-flex rounded-full bg-red-500 border-2 border-white dark:border-[#1f1f1f]" title="Microphone permission denied"></span>
          )}
        </button>
      </div>

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
              <div className="flex items-center gap-2">
                {micStatus === 'prompt' && (
                  <button
                    onClick={toggleVoice}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-full transition-colors flex items-center gap-1 font-medium"
                  >
                    <Mic className="w-3 h-3" /> Enable Voice
                  </button>
                )}
                {isListening && (
                  <div title="Milli is listening for 'Hey Milli'" className="p-1.5 rounded-full bg-white/20 text-white flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </div>
                )}
                <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
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
            
            {isListening && voiceState !== 'inactive' && (
              <div className="px-4 py-2 bg-purple-50 dark:bg-[#8b5cf6]/10 border-t border-[#8b5cf6]/20 text-[#8b5cf6] flex items-center gap-2 text-xs font-medium animate-in slide-in-from-bottom-2">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>{getVoiceStatusMessage()}</span>
              </div>
            )}

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
