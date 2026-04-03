import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { format, parse, isSameDay, addMinutes, max, isBefore, subMinutes, startOfDay, startOfWeek, addDays, eachDayOfInterval, endOfMonth, getDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Repeat,
  X,
  ChevronDown,
  ChevronRight,
  Info,
  CircleAlert,
  Sparkles,
  Check,
  Mic,
  MicOff,
  Loader2
} from 'lucide-react';
import { Switch } from '@/app/components/ui/switch';
import { Task } from '@/app/types';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';

interface CreateReminderProps {
  tasks: Task[];
  onCreateTask: (task: Task) => void;
  initialDate?: string;
  initialTime?: string;
  initialDuration?: number;
  onClose?: () => void;
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsedDate = parse(value, 'yyyy-MM-dd', new Date());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setShow(!show)}
        className={`w-full text-left text-[13px] font-bold focus:outline-none whitespace-nowrap transition-colors bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl flex items-center justify-between group border border-gray-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all
          ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-[#e0b596]/30 hover:text-[#e0b596]'}`}
      >
        <span>{format(parsedDate, 'dd-MM-yyyy')}</span>
        <CalendarIcon className={`w-3.5 h-3.5 transition-colors ${disabled ? 'text-gray-300' : 'text-gray-400 group-hover:text-[#e0b596]'}`} />
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute top-full left-0 mt-1.5 p-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-[1rem] shadow-2xl z-50 min-w-max"
          >
            <DayPicker
              mode="single"
              selected={parsedDate}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, 'yyyy-MM-dd'));
                  setShow(false);
                }
              }}
              disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
              modifiers={{ today: new Date() }}
              modifiersStyles={{
                today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                selected: { backgroundColor: '#e0b596', color: 'white' }
              }}
              className="!m-0 text-[12px] p-2 [&_.rdp-button]:h-6 [&_.rdp-button]:w-6 [&_.rdp-head_cell]:h-6 [&_.rdp-head_cell]:w-6 [&_.rdp-head_cell]:text-[10px] [&_.rdp-caption_label]:text-[13px] [&_.rdp-day]:text-[12px] [&_.rdp-day]:text-gray-900 dark:[&_.rdp-day]:text-gray-100 [&_.rdp-caption_label]:text-gray-900 dark:[&_.rdp-caption_label]:text-gray-100"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLDivElement>(null);
  const pRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  const ITEM_HEIGHT = 28;

  useEffect(() => {
    if (show && !isScrollingRef.current) {
      setTimeout(() => {
        const currentTime = parse(value, 'HH:mm', new Date());
        const h = parseInt(format(currentTime, 'h'));
        const m = parseInt(format(currentTime, 'mm'));
        const p = format(currentTime, 'a');

        if (hRef.current) hRef.current.scrollTop = (h - 1) * ITEM_HEIGHT;
        if (mRef.current) mRef.current.scrollTop = m * ITEM_HEIGHT;
        if (pRef.current) pRef.current.scrollTop = (p === 'AM' ? 0 : 1) * ITEM_HEIGHT;
      }, 50);
    }
  }, [show]);

  const updateTime = (h: string, m: string, p: string) => {
    const formattedHour = h.padStart(1, '0');
    const formattedMinute = m.padStart(2, '0');
    try {
      const parsed = parse(`${formattedHour}:${formattedMinute} ${p}`, 'h:mm a', new Date());
      onChange(format(parsed, 'HH:mm'));
    } catch (e) { }
  };

  const handleScroll = (type: 'h' | 'm' | 'p') => {
    const targetRef = type === 'h' ? hRef : (type === 'm' ? mRef : pRef);
    if (!targetRef.current) return;

    isScrollingRef.current = true;
    const scrollPos = targetRef.current.scrollTop;
    const index = Math.round(scrollPos / ITEM_HEIGHT);

    const currentTime = parse(value, 'HH:mm', new Date());
    const hVal = format(currentTime, 'h');
    const mVal = format(currentTime, 'mm');
    const pVal = format(currentTime, 'a');

    if (type === 'h') {
      const newH = (index + 1).toString();
      if (newH !== hVal && index >= 0 && index < 12) {
        updateTime(newH, mVal, pVal);
      }
    } else if (type === 'm') {
      const newM = index.toString().padStart(2, '0');
      if (newM !== mVal && index >= 0 && index < 60) {
        updateTime(hVal, newM, pVal);
      }
    } else {
      const newP = index === 0 ? 'AM' : 'PM';
      if (newP !== pVal && (index === 0 || index === 1)) {
        updateTime(hVal, mVal, newP);
      }
    }

    setTimeout(() => { isScrollingRef.current = false; }, 200);
  };

  const currentTime = parse(value, 'HH:mm', new Date());
  const hVal = format(currentTime, 'h');
  const mVal = format(currentTime, 'mm');
  const pVal = format(currentTime, 'a');

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setShow(!show)}
        className={`w-full text-left text-[13px] font-bold focus:outline-none whitespace-nowrap bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl flex items-center justify-between group border border-gray-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all
          ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-[#e0b596]/30 hover:text-[#e0b596]'}`}
      >
        <span>{format(currentTime, 'hh:mm a')}</span>
        <Clock className={`w-3.5 h-3.5 transition-colors ${disabled ? 'text-gray-300' : 'text-gray-400 group-hover:text-[#e0b596]'}`} />
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute top-full left-0 mt-1.5 p-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-[1rem] shadow-2xl z-50 flex flex-col gap-1.5 w-[120px]"
          >
            <div className="flex items-center justify-center h-28 relative bg-gray-50 dark:bg-black/20 rounded-lg overflow-hidden border border-gray-100 dark:border-white/5">
              {/* Highlight Overlay */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[28px] bg-[#e0b596]/10 border-y border-[#e0b596]/20 pointer-events-none rounded-sm" />

              <div className="flex flex-1 items-center justify-center relative h-full">
                {/* Hours */}
                <div
                  ref={hRef}
                  onScroll={() => handleScroll('h')}
                  className="w-8 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[42px] touch-pan-y"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <div
                      key={h}
                      className={`h-[28px] flex items-center justify-center snap-center text-[11px] font-bold transition-all ${hVal === h.toString() ? 'text-[#e0b596]' : 'text-black dark:text-white opacity-40'}`}
                    >
                      {h.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>

                <div className="text-[#e0b596] font-bold opacity-30 select-none text-[10px] px-0.5">:</div>

                {/* Minutes */}
                <div
                  ref={mRef}
                  onScroll={() => handleScroll('m')}
                  className="w-8 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[42px] touch-pan-y"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map(m => (
                    <div
                      key={m}
                      className={`h-[28px] flex items-center justify-center snap-center text-[11px] font-bold transition-all ${mVal === m.toString().padStart(2, '0') ? 'text-[#e0b596]' : 'text-black dark:text-white opacity-40'}`}
                    >
                      {m.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>

                <div className="w-1" />

                {/* AM/PM Scrollable */}
                <div
                  ref={pRef}
                  onScroll={() => handleScroll('p')}
                  className="w-8 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[42px] touch-pan-y"
                >
                  {['AM', 'PM'].map(p => (
                    <div
                      key={p}
                      className={`h-[28px] flex items-center justify-center snap-center text-[9px] font-black transition-all ${pVal === p ? 'text-[#e0b596]' : 'text-black dark:text-white opacity-40'}`}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShow(false)}
              className="w-full h-7 bg-[#e0b596] hover:bg-[#d4a37f] text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition-all"
            >
              Set Time
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CreateReminder({
  tasks,
  onCreateTask,
  initialDate,
  initialTime,
  initialDuration = 30,
  onClose
}: CreateReminderProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(() => {
    if (initialTime) return initialTime;
    return format(new Date(), 'HH:mm');
  });

  const [endDate, setEndDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(() => {
    const start = parse(initialTime || format(new Date(), 'HH:mm'), 'HH:mm', new Date());
    return format(addMinutes(start, initialDuration), 'HH:mm');
  });

  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isSpecial, setIsSpecial] = useState(false);
  const [notifyBefore, setNotifyBefore] = useState(5); // Default 5 min
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [showNotifyDropdown, setShowNotifyDropdown] = useState(false);

  const NOTIFICATION_OPTIONS = [
    { value: 0, label: 'No reminder' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
  ];

  // --- Voice Assistant State ---
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setVoiceText(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech error', event.error);
          setIsListening(false);
          setIsProcessing(false);
        };

        recognitionRef.current.onend = () => {
          // If browser automatically stops listening, ensure UI syncs
          setIsListening(false);
        };
      }
    }
    return () => {
      if (recognitionRef.current) {
         try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  const parseVoiceCommand = (text: string) => {
    try {
      let newTitle = text;
      const lowerText = text.toLowerCase();
      
      // 1. Regex Extractor for ANY Time (e.g. 5:30 pm, 14:00, 8am)
      const timeRegex = /\b(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm|a\.m\.|p\.m\.)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/i;
      const timeMatch = lowerText.match(timeRegex);
      
      if (timeMatch) {
        const fullTimeStr = timeMatch[0];
        let hours = 0;
        let minutes = 0;
        
        if (timeMatch[4] !== undefined) {
          hours = parseInt(timeMatch[4]);
          minutes = parseInt(timeMatch[5]);
        } else {
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3].replace(/\./g, '').toLowerCase();
          
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
        }
        
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        handleStartTimeChange(formattedTime);
        
        const timeCleanRegex = new RegExp(`(?:at\\s+)?${fullTimeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        newTitle = newTitle.replace(timeCleanRegex, '').trim();
      } else {
        handleStartTimeChange(format(new Date(), 'HH:mm'));
      }
      
      // 2. Extractor for Dates (today, tomorrow, next week, monday-sunday)
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = new Date();
      let targetDate = new Date();
      let dateFound = false;
      let dateStrToRemove = '';

      if (lowerText.includes('tomorrow')) {
        targetDate = addDays(today, 1);
        dateFound = true;
        dateStrToRemove = 'tomorrow';
      } else if (lowerText.includes('today') || lowerText.includes('tonight')) {
        targetDate = today;
        dateFound = true;
        dateStrToRemove = lowerText.includes('tonight') ? 'tonight' : 'today';
      } else if (lowerText.match(/\bnext\s+(week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)) {
        const match = lowerText.match(/\bnext\s+(week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
        if (match) {
           dateStrToRemove = match[0];
           dateFound = true;
           const token = match[1].toLowerCase();
           if (token === 'week') targetDate = addDays(today, 7);
           else if (token === 'month') targetDate = addDays(today, 30);
           else if (token === 'year') targetDate = addDays(today, 365);
           else {
               const dayIndex = daysOfWeek.indexOf(token);
               const currentDay = today.getDay();
               let diff = dayIndex - currentDay;
               if (diff <= 0) diff += 7;
               targetDate = addDays(today, diff + 7);
           }
        }
      } else {
        for (let day of daysOfWeek) {
          const match = lowerText.match(new RegExp(`\\b(?:on\\s+|this\\s+)?${day}\\b`, 'i'));
          if (match) {
             dateStrToRemove = match[0];
             dateFound = true;
             const dayIndex = daysOfWeek.indexOf(day);
             const currentDay = today.getDay();
             let diff = dayIndex - currentDay;
             if (diff <= 0) diff += 7;
             targetDate = addDays(today, diff);
             break;
          }
        }
      }

      if (dateFound) {
        const formattedDate = format(targetDate, 'yyyy-MM-dd');
        setStartDate(formattedDate);
        setEndDate(formattedDate);
        newTitle = newTitle.replace(new RegExp(dateStrToRemove, 'i'), '').trim();
      } else {
        const formattedDate = format(today, 'yyyy-MM-dd');
        setStartDate(formattedDate);
        setEndDate(formattedDate);
      }
      
      // Clean up intent prefix for title
      if (lowerText.startsWith('remind me to ')) {
        newTitle = newTitle.substring('remind me to '.length);
      } else if (lowerText.startsWith('remind me ')) {
        newTitle = newTitle.substring('remind me '.length);
      }
      newTitle = newTitle.trim();
      
      // Prepare description and clean up "remind me"
      let finalDesc = text.trim();
      if (finalDesc.toLowerCase().startsWith('remind me to ')) {
        finalDesc = finalDesc.substring('remind me to '.length);
      } else if (finalDesc.toLowerCase().startsWith('remind me ')) {
        finalDesc = finalDesc.substring('remind me '.length);
      }
      if (finalDesc) {
        finalDesc = finalDesc.charAt(0).toUpperCase() + finalDesc.slice(1);
      }
      
      if (newTitle) {
        const cleanWords = newTitle.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
        const allStopWords = ['a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'to', 'of', 'in', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'about', 'into', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'and', 'but', 'or', 'nor', 'so', 'yet', 'if', 'because', 'although', 'unless', 'since', 'that', 'this', 'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'shall', 'should', 'will', 'would', 'may', 'might', 'must', 'very', 'too', 'really', 'quite', 'just', 'only', 'some', 'any', 'all', 'every', 'remind', 'me', 'please', 'something'];
        const keywords = cleanWords.filter(w => w && !allStopWords.includes(w.toLowerCase()));
        
        let finalTitle = "";
        if (keywords.length > 0) {
          finalTitle = keywords.reduce((a, b) => a.length >= b.length ? a : b, "");
        } else {
          finalTitle = cleanWords[0] || "Reminder";
        }
        
        finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
        setTitle(finalTitle);
        setDescription(finalDesc);
      } else {
        setDescription(finalDesc);
      }
    } catch (err) {
      console.error('Parser error:', err);
      // Fallback cleanly
      setTitle('Reminder');
      setDescription(text);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setIsProcessing(true);
      setTimeout(() => {
        if (voiceText) parseVoiceCommand(voiceText);
        setIsProcessing(false);
        setVoiceText('');
      }, 1200);
    } else {
      setVoiceText('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        toast.error("Speech recognition not available or already listening.");
      }
    }
  };

  // Auto-stop after 4 seconds of silence
  useEffect(() => {
    if (isListening && voiceText.trim() !== '') {
      const timer = setTimeout(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
        setIsProcessing(true);
        setTimeout(() => {
          parseVoiceCommand(voiceText);
          setIsProcessing(false);
          setVoiceText('');
        }, 1200);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceText, isListening]);

  // Sync End Time when Start Time changes
  const handleStartTimeChange = (newStartTime: string) => {
    const prevStart = parse(startTime, 'HH:mm', new Date());
    const prevEnd = parse(endTime, 'HH:mm', new Date());
    const duration = Math.max(30, (prevEnd.getTime() - prevStart.getTime()) / (1000 * 60));

    setStartTime(newStartTime);
    const nextStart = parse(newStartTime, 'HH:mm', new Date());
    setEndTime(format(addMinutes(nextStart, duration), 'HH:mm'));
  };

  const tasksForDay = tasks.filter(t => t.date === startDate);

  const allScheduleItems = [
    ...tasksForDay.map(t => ({ ...t, isPreview: false })),
    { id: 'preview-now', time: startTime, title: title, isPreview: true, completed: false, date: startDate, location: '' }
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    const startRange = parse(startDate, 'yyyy-MM-dd', new Date());
    const endRange = endOfMonth(startRange);

    const createSingleTask = (dateStr: string) => {
      const start = parse(`${dateStr} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const end = parse(`${dateStr} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

      const finalDuration = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
      const metaData = JSON.stringify({ location, duration: finalDuration, selectedDays, isSpecial });
      const finalDescription = description.trim() ? `${description.trim()}\n\n<!-- metadata: ${metaData} -->` : `<!-- metadata: ${metaData} -->`;

      const newTask: Task = {
        id: (Date.now() + Math.random()).toString(),
        title,
        description: finalDescription,
        date: dateStr,
        time: startTime,
        category: 'work',
        completed: false,
        createdAt: new Date().toISOString(),
        duration: finalDuration,
        location: location,
        isSpecial: isSpecial,
        notifyBefore: notifyBefore,
      };

      onCreateTask(newTask);
    };

    if (selectedDays.length === 0) {
      // Does not repeat - Create for startDate only
      createSingleTask(startDate);
      toast.success('Event scheduled');
    } else {
      // Create for all matching days from startDate to end of month
      const allDays = eachDayOfInterval({ start: startRange, end: endRange });
      let count = 0;

      for (const day of allDays) {
        const dayIndex = getDay(day); // 0 (Sun) to 6 (Sat)
        if (selectedDays.includes(dayIndex)) {
          createSingleTask(format(day, 'yyyy-MM-dd'));
          count++;
        }
      }
      toast.success(`${count} events scheduled for the month`);
    }

    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-[#1b1b1b] text-gray-900 dark:text-[#f5f5f5] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-[#292929] max-w-2xl w-full mx-auto h-full relative">
      
      <AnimatePresence>
        {(isListening || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-[#1b1b1b]/95 backdrop-blur-sm rounded-[2rem]"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(224,181,150,0.4)] transition-all ${isListening ? 'bg-[#e0b596] animate-pulse' : 'bg-[#e0b596]/50'}`}>
               {isProcessing ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Mic className="w-10 h-10 text-white" />}
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              {isProcessing ? 'Processing...' : 'Listening...'}
            </h3>
            
            <p className="text-lg text-gray-500 dark:text-gray-400 text-center max-w-[80%] min-h-[60px] italic font-medium leading-relaxed">
              {voiceText || (isListening ? 'Speak now, e.g. "Remind me to submit assignment tomorrow at 5 PM"' : '')}
            </p>

             <Button 
               onClick={toggleVoice}
               variant="ghost" 
               className="mt-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-[#333] hover:bg-gray-200 dark:hover:bg-[#444] rounded-full px-8 py-2 font-bold transition-colors"
             >
               {isProcessing ? 'Cancel' : 'Stop Listening'}
             </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-[1.5] flex flex-col p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Reminder</h2>
          <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#292929] rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="What's the plan?"
              className="w-full bg-transparent text-3xl font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 border-none p-0 pr-12 selection:bg-[#e0b596]/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <button 
              type="button"
              onClick={toggleVoice}
              title="Speak task title"
              className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'text-white bg-[#e0b596] shadow-md scale-105 animate-pulse' : 'text-gray-300 dark:text-gray-600 hover:text-[#e0b596] hover:bg-[#e0b596]/10 hover:scale-105'}`}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          </div>

          <div className="relative group bg-gray-50/80 dark:bg-[#252525]/80 p-3.5 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm focus-within:border-[#e0b596]/40 focus-within:ring-1 focus-within:ring-[#e0b596]/10 transition-all">
            <textarea
              placeholder="Add detailed description, steps, or notes..."
              className="w-full bg-transparent text-[14px] font-medium leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 border-none p-0 min-h-[70px] resize-none pr-10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button 
              type="button"
              onClick={toggleVoice}
              title="Speak description"
              className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${isListening ? 'text-white bg-[#e0b596] shadow-md scale-105 animate-pulse' : 'text-gray-400 dark:text-gray-500 hover:text-[#e0b596] hover:bg-[#e0b596]/10 hover:scale-105'}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-2">
            {/* Start Row */}
            <div className="flex items-center gap-2">
              <DatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setEndDate(val);
                }}
              />
              <TimePicker value={startTime} onChange={handleStartTimeChange} />
            </div>

            {/* End Row */}
            <div className="flex items-center gap-2">
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                disabled={true}
              />
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm">
            <MapPin className="w-4 h-4 text-[#e0b596]" />
            <input
              type="text"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent text-[13px] font-bold focus:outline-none w-full placeholder:text-gray-400 dark:placeholder:text-gray-600 border-none p-0"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-[#e0b596] transition-colors"
          >
            {showMoreOptions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            More options
          </button>

          <AnimatePresence>
            {showMoreOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRepeatDropdown(!showRepeatDropdown)}
                    className="flex items-center justify-between w-full bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm hover:border-[#e0b596]/30 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat className="w-3.5 h-3.5 text-[#e0b596]" />
                      <span className="text-[13px] font-bold">
                        {selectedDays.length === 0
                          ? 'Does not repeat'
                          : selectedDays.length === 7
                            ? 'Every day'
                            : `${selectedDays.length} days week`}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showRepeatDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showRepeatDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowRepeatDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.98 }}
                          className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl z-[100] overflow-hidden"
                        >
                          <div className="p-2 space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {/* Does not repeat option */}
                            <div
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#333] transition-colors cursor-pointer group"
                              onClick={() => {
                                setSelectedDays([]);
                                setShowRepeatDropdown(false);
                              }}
                            >
                              <span className={`text-[12px] font-bold transition-colors ${selectedDays.length === 0 ? 'text-[#e0b596]' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200'}`}>
                                Does not repeat
                              </span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedDays.length === 0 ? 'bg-[#e0b596] border-[#e0b596]' : 'border-gray-300 dark:border-gray-600'}`}>
                                {selectedDays.length === 0 && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>

                            {/* Every day option */}
                            <div
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#333] transition-colors cursor-pointer group"
                              onClick={() => {
                                if (selectedDays.length === 7) setSelectedDays([]);
                                else setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
                                setShowRepeatDropdown(false);
                              }}
                            >
                              <span className={`text-[12px] font-bold transition-colors ${selectedDays.length === 7 ? 'text-[#e0b596]' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200'}`}>
                                Every day
                              </span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedDays.length === 7 ? 'bg-[#e0b596] border-[#e0b596]' : 'border-gray-300 dark:border-gray-600'}`}>
                                {selectedDays.length === 7 && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-[#333] my-1 mx-2" />

                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                              const isSelected = selectedDays.includes(index);
                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#333] transition-colors cursor-pointer group"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDays(selectedDays.filter(d => d !== index));
                                    } else {
                                      setSelectedDays([...selectedDays, index].sort());
                                    }
                                  }}
                                >
                                  <span className={`text-[12px] font-bold transition-colors ${isSelected ? 'text-[#e0b596]' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200'}`}>
                                    {day}
                                  </span>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-[#e0b596] border-[#e0b596]' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifyDropdown(!showNotifyDropdown)}
                    className="flex items-center justify-between w-full bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm hover:border-[#e0b596]/30 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#e0b596]" />
                      <span className="text-[13px] font-bold">
                        {NOTIFICATION_OPTIONS.find(opt => opt.value === notifyBefore)?.label || 'Notification'}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showNotifyDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showNotifyDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifyDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.98 }}
                          className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl z-[100] overflow-hidden"
                        >
                          <div className="p-2 space-y-1">
                            {NOTIFICATION_OPTIONS.map((option) => (
                              <div
                                key={option.value}
                                className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer group hover:bg-gray-100 dark:hover:bg-[#333] ${notifyBefore === option.value ? 'bg-[#e0b596]/10' : ''}`}
                                onClick={() => {
                                  setNotifyBefore(option.value);
                                  setShowNotifyDropdown(false);
                                }}
                              >
                                <span className={`text-[12px] font-bold ${notifyBefore === option.value ? 'text-[#e0b596]' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {option.label}
                                </span>
                                {notifyBefore === option.value && <Check className="w-3.5 h-3.5 text-[#e0b596]" />}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm group hover:border-[#e0b596]/30 transition-all cursor-pointer" onClick={() => setIsSpecial(!isSpecial)}>
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-3.5 h-3.5 transition-colors ${isSpecial ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className="text-[13px] font-bold">Mark as special</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSpecial}
                    onChange={(e) => setIsSpecial(e.target.checked)}
                    className="w-4 h-4 accent-[#e0b596] cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-2 flex items-center justify-between mt-4">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 text-[13px] font-bold hover:text-gray-600 dark:hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#e0b596] hover:bg-[#d4a37f] text-white text-[13px] font-bold px-10 py-5 h-auto rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Create Task
          </Button>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-[240px] bg-gray-50 dark:bg-[#232323] border-l border-gray-200 dark:border-[#292929] flex-col">
        <div className="p-5 border-b border-gray-200 dark:border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">Schedule</h3>
            <span className="text-[10px] bg-[#e0b596]/10 text-[#e0b596] px-2 py-1 rounded-full font-bold">
              {format(parse(startDate, 'yyyy-MM-dd', new Date()), 'MMM d')}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white dark:hover:bg-[#333] rounded-md transition-colors text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {allScheduleItems.length > 0 ? (
            <div className="relative pl-5 border-l-2 border-gray-200 dark:border-[#333] space-y-8">
              {allScheduleItems.map((item) => (
                item.isPreview ? (
                  <div key="preview-now" className="relative">
                    <div className="absolute -left-[25px] top-[5px] w-3.5 h-3.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-xs font-bold text-red-500 uppercase tracking-tighter">Now</span>
                  </div>
                ) : (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1b1b1b] border-2 border-[#e0b596]" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-[#e0b596] uppercase tracking-tighter">
                        {item.time ? format(parse(item.time, 'HH:mm', new Date()), 'h:mm a') : '--'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-base font-semibold leading-tight text-gray-800 dark:text-gray-200 ${(item as any).completed ? 'line-through opacity-50' : ''}`}>
                          {item.title}
                        </p>
                        {!(item as any).completed && isBefore(parse(`${(item as any).date} ${item.time || '00:00'}`, 'yyyy-MM-dd HH:mm', new Date()), new Date()) && (
                          <CircleAlert className="w-3.5 h-3.5 text-amber-500/80" />
                        )}
                      </div>
                      {(item as any).location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {(item as any).location}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="w-14 h-14 bg-gray-200 dark:bg-[#333] rounded-2xl flex items-center justify-center">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-400">No events scheduled<br />for this day.</p>
            </div>
          )}
        </div>

      </div>

      <style>{`
        /* Overrides if any */
      `}</style>
    </div>
  );
}
