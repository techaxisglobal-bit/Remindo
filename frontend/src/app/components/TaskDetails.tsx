import { useState, useRef, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/app/api';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Tag,
  MapPin,
  Navigation,
  Sparkles,
  AlignLeft,
  Repeat,
  ChevronDown,
  ChevronRight,
  Info,
  CircleAlert,
  Check,
  Loader2
} from 'lucide-react';
import { Task } from '@/app/types';
import { format, parse, isSameDay, addMinutes, isBefore, subMinutes, eachDayOfInterval, endOfMonth, getDay } from 'date-fns';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';

interface TaskDetailsProps {
  task: Task;
  tasks: Task[];
  onClose: () => void;
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onCreateTask?: (task: Task) => void;
  initialEditMode?: boolean;
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

export function TaskDetails({
  task,
  tasks,
  onClose,
  onToggleComplete,
  onDeleteTask,
  onUpdateTask,
  onCreateTask,
  initialEditMode = false,
}: TaskDetailsProps) {

  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [localTask, setLocalTask] = useState<Task>(task);
  const [isResending, setIsResending] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    const fetchLatestTask = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
          headers: { 'x-auth-token': token || '' }
        });
        if (res.ok) {
          const updatedTask = await res.json();
          setLocalTask(updatedTask);
        }
      } catch (error) {
        // silently fail polling
      }
    };
    const intervalId = setInterval(fetchLatestTask, 3000);
    return () => clearInterval(intervalId);
  }, [task.id, isEditing]);

  // Helper to parse metadata
  const parsedMetadata = useMemo(() => {
    const desc = localTask.description || '';
    const match = desc.match(/<!-- metadata: (.+) -->/);
    if (match) {
      try { return JSON.parse(match[1]); } catch (e) { return null; }
    }
    return null;
  }, [task.description]);

  const initialEndTime = useMemo(() => {
    if (parsedMetadata?.endTime) return parsedMetadata.endTime;
    try {
      const start = parse(task.time || '12:00', 'HH:mm', new Date());
      return format(addMinutes(start, task.duration || 30), 'HH:mm');
    } catch (e) {
      return '12:30';
    }
  }, [task.time, task.duration, parsedMetadata]);

  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.date);
  const [startTime, setStartTime] = useState(task.time || '12:00');
  const [endDate, setEndDate] = useState(parsedMetadata?.endDate || task.date);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [description, setDescription] = useState(task.description ? task.description.replace(/<!-- metadata: .+ -->/, '').trim() : '');
  const [notifyBefore, setNotifyBefore] = useState<number[]>(() => {
    if (task.notifyBefore === undefined || task.notifyBefore === null) return [15];
    if (typeof task.notifyBefore === 'number') return [task.notifyBefore];
    if (typeof task.notifyBefore === 'string') {
      return (task.notifyBefore as string)
        .split(',')
        .map(x => parseInt(x.trim(), 10))
        .filter(x => !isNaN(x));
    }
    return [15];
  });

  const getNotifyBeforeLabel = (values: number[]) => {
    if (values.includes(0) || values.length === 0) {
      return 'No reminder';
    }
    return 'Notify before';
  };

  const handleToggleNotifyBefore = (value: number) => {
    if (value === 0) {
      setNotifyBefore([0]);
    } else {
      setNotifyBefore(prev => {
        const filtered = prev.filter(v => v !== 0);
        if (filtered.includes(value)) {
          const next = filtered.filter(v => v !== value);
          return next.length === 0 ? [0] : next;
        } else {
          return [...filtered, value];
        }
      });
    }
  };

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [showNotifyDropdown, setShowNotifyDropdown] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>(parsedMetadata?.selectedDays || []);
  const [isSpecial, setIsSpecial] = useState(parsedMetadata?.isSpecial || false);

  const NOTIFICATION_OPTIONS = [
    { value: 0, label: 'No reminder' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
  ];

  // Refined useEffect to only reset state when switching to edit mode or changing tasks
  useEffect(() => {
    if (isEditing) {
      setTitle(task.title);
      setStartDate(task.date);
      setStartTime(task.time || '12:00');
      setEndDate(parsedMetadata?.endDate || task.date);

      const calculatedEnd = parsedMetadata?.endTime || (() => {
        try {
          const start = parse(task.time || '12:00', 'HH:mm', new Date());
          return format(addMinutes(start, task.duration || 30), 'HH:mm');
        } catch (e) { return '12:30'; }
      })();
      setEndTime(calculatedEnd);

      setDescription(task.description ? task.description.replace(/<!-- metadata: .+ -->/, '').trim() : '');
      setSelectedDays(parsedMetadata?.selectedDays || []);
      setIsSpecial(parsedMetadata?.isSpecial || false);
      setNotifyBefore(() => {
        if (task.notifyBefore === undefined || task.notifyBefore === null) return [15];
        if (typeof task.notifyBefore === 'number') return [task.notifyBefore];
        if (typeof task.notifyBefore === 'string') {
          return (task.notifyBefore as string)
            .split(',')
            .map(x => parseInt(x.trim(), 10))
            .filter(x => !isNaN(x));
        }
        return [15];
      });
    }
    // We only want to re-run this when the task itself changes or we START editing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, isEditing]);

  const handleStartTimeChange = (newStartTime: string) => {
    const prevStart = parse(startTime, 'HH:mm', new Date());
    const prevEnd = parse(endTime, 'HH:mm', new Date());
    const duration = Math.max(30, (prevEnd.getTime() - prevStart.getTime()) / (1000 * 60));
    setStartTime(newStartTime);
    const nextStart = parse(newStartTime, 'HH:mm', new Date());
    setEndTime(format(addMinutes(nextStart, duration), 'HH:mm'));
  };

  const tasksForDayRaw = tasks.filter(t => t.date === startDate && t.id !== task.id);
  const allScheduleItems = [
    ...tasksForDayRaw,
    { ...task, title, time: startTime, date: startDate }
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col md:flex-row bg-white dark:bg-[#1b1b1b] text-gray-900 dark:text-[#f5f5f5] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-[#292929] max-w-2xl w-full mx-auto h-[85vh]"
      >
        <div className="flex-[1.5] flex flex-col p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {isEditing ? 'Edit Reminder' : 'Reminder Details'}
            </h2>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#292929] rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-5">
              <input
                type="text"
                placeholder="What's the plan?"
                className="w-full bg-transparent text-3xl font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 border-none p-0 selection:bg-[#e0b596]/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />

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
                              className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl z-[100] overflow-hidden"
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
                                          setSelectedDays(prev => prev.filter(d => d !== index));
                                        } else {
                                          const newDays = [...selectedDays, index].sort();
                                          if (newDays.length === 7) {
                                            setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
                                          } else {
                                            setSelectedDays(newDays);
                                          }
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
                            {getNotifyBeforeLabel(notifyBefore)}
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
                                {NOTIFICATION_OPTIONS.map((option) => {
                                  const isSelected = notifyBefore.includes(option.value);
                                  return (
                                    <div
                                      key={option.value}
                                      className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer group hover:bg-gray-100 dark:hover:bg-[#333] ${isSelected ? 'bg-[#e0b596]/10' : ''}`}
                                      onClick={() => handleToggleNotifyBefore(option.value)}
                                    >
                                      <span className={`text-[12px] font-bold ${isSelected ? 'text-[#e0b596]' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {option.label}
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
                    <div className="flex items-start gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm">
                      <AlignLeft className="w-3.5 h-3.5 text-[#e0b596] mt-1" />
                      <textarea
                        placeholder="Add notes..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-transparent text-[13px] font-bold focus:outline-none w-full min-h-[80px] resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 border-none p-0"
                      />
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
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold leading-tight">{localTask.title}</h1>
                <div className="flex items-center gap-2">

                  {isSpecial && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-none px-2 py-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Special
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* Start Row */}
                <div className="flex items-center gap-2">
                  <div className="flex-[1.8] flex items-center gap-2 bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#e0b596]" />
                    <span className="text-[13px] font-bold">{format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#e0b596]" />
                    <span className="text-[13px] font-bold">{format(parse(startTime, 'HH:mm', new Date()), 'hh:mm a')}</span>
                  </div>
                </div>

                {/* End Row */}
                <div className="flex items-center gap-2">
                  <div className="flex-[1.8] flex items-center gap-2 bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[13px] font-bold">{format(parse(endDate, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[13px] font-bold">{format(parse(endTime, 'HH:mm', new Date()), 'hh:mm a')}</span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {true && (
                  <motion.div
                    initial={{ height: 'auto', opacity: 1 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    <div className="flex items-start gap-2 bg-gray-50/50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm">
                      <AlignLeft className="w-4 h-4 text-[#e0b596] mt-0.5" />
                      <p className="text-[13px] font-bold whitespace-pre-wrap">{description || 'No notes'}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attendees Display */}
              {!isEditing && localTask.attendees && localTask.attendees.length > 0 && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-[#333]">
                  <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    Invited Attendees
                    <Badge className="bg-gray-100 text-gray-500 dark:bg-[#333] dark:text-gray-400 border-none">{localTask.attendees.length}</Badge>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {(localTask.attendees as any[]).map((attendee, idx) => {
                      const email = typeof attendee === 'string' ? attendee : attendee.email;
                      const status = typeof attendee === 'string' ? 'Pending' : attendee.status;
                      const attendeeId = typeof attendee === 'string' ? null : attendee.id;
                      
                      let statusBadge = null;
                      switch(status) {
                        case 'Accepted': statusBadge = <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none px-2 py-0.5 text-[10px]">🟢 Accepted</Badge>; break;
                        case 'Declined': statusBadge = <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none px-2 py-0.5 text-[10px]">🔴 Declined</Badge>; break;
                        case 'Expired': statusBadge = <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-none px-2 py-0.5 text-[10px]">⚪ Expired</Badge>; break;
                        default: statusBadge = <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-none px-2 py-0.5 text-[10px]">🟠 Pending</Badge>;
                      }

                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#252525] p-3 rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e0b596] to-[#c29675] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                              {email[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{email}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {statusBadge}
                                {status === 'Accepted' && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Check className="w-3 h-3"/> Shared</span>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:ml-auto self-end sm:self-auto">
                            {status !== 'Accepted' && (
                              <Button 
                                variant="ghost" 
                                className="h-8 px-3 text-[11px] font-bold text-[#e0b596] hover:bg-[#e0b596]/10 rounded-xl transition-colors" 
                                disabled={isResending === email}
                                onClick={async () => {
                                  setIsResending(email);
                                  try {
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`${API_BASE_URL}/api/tasks/${localTask.id}/resend`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'x-auth-token': token || '' },
                                      body: JSON.stringify({ email })
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                      toast.success('Invitation resent!');
                                      if (status === 'Declined' || status === 'Expired') {
                                        setLocalTask(prev => ({
                                          ...prev,
                                          attendees: prev.attendees?.map((a: any) => a.email === email ? { ...a, status: 'Pending' } : a)
                                        }));
                                      }
                                    } else {
                                      toast.error(data.msg || 'Failed to resend invitation');
                                    }
                                  } catch (e) {
                                    toast.error('Network error. Failed to resend.');
                                  } finally {
                                    setIsResending(null);
                                  }
                                }}
                              >
                                {isResending === email ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (status === 'Pending' ? 'Resend' : 'Generate New')}
                              </Button>
                            )}
                            {(status === 'Pending' || status === 'Expired') && attendeeId && (
                              <Button
                                variant="ghost"
                                className="h-8 px-3 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                                onClick={async () => {
                                  if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
                                  try {
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`${API_BASE_URL}/api/invitations/${attendeeId}`, {
                                      method: 'DELETE',
                                      headers: { 'x-auth-token': token || '' }
                                    });
                                    if (res.ok) {
                                      toast.success('Invitation cancelled');
                                      setLocalTask(prev => ({
                                        ...prev,
                                        attendees: prev.attendees?.filter((a: any) => a.id !== attendeeId)
                                      }));
                                    } else {
                                      toast.error('Failed to cancel invitation');
                                    }
                                  } catch (e) {
                                    toast.error('Network error');
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                            {status === 'Accepted' && (
                               <Button variant="ghost" className="h-8 px-3 text-[11px] font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors" disabled>
                                   View Recipient
                               </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex items-center justify-between mt-auto border-t border-gray-100 dark:border-[#292929]">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-gray-400 text-sm font-bold hover:text-gray-600 dark:hover:text-white h-auto py-4 px-2">
                  Cancel
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => { onDeleteTask(task.id); onClose(); }}
                    className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-bold h-auto py-4 px-4 rounded-xl"
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={() => {
                      const start = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                      const end = parse(`${endDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

                      const now = new Date();
                      if (isBefore(start, subMinutes(now, 1))) {
                        toast.error('Cannot create tasks in the past');
                        return;
                      }

                      const finalDuration = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
                      const metaData = JSON.stringify({ duration: finalDuration, selectedDays, endDate, endTime, isSpecial });
                      const finalDescription = description.trim() ? `${description.trim()}\n\n<!-- metadata: ${metaData} -->` : `<!-- metadata: ${metaData} -->`;
                      
                      const updatedTask = {
                        ...localTask,
                        title,
                        description: finalDescription,
                        date: startDate,
                        time: startTime,
                        duration: finalDuration,
                        category: localTask.category || 'general',
                        location: localTask.location || '',
                        isSpecial,
                        notifyBefore: notifyBefore.join(',')
                      };
                      
                      onUpdateTask(updatedTask);

                      if (selectedDays.length > 0 && onCreateTask) {
                        const startRange = parse(startDate, 'yyyy-MM-dd', new Date());
                        const endRange = endOfMonth(startRange);
                        const allDays = eachDayOfInterval({ start: startRange, end: endRange });

                        for (const day of allDays) {
                          const dayIndex = getDay(day);
                          const dayStr = format(day, 'yyyy-MM-dd');
                          
                          // Avoid duplicate creation for the currently edited date
                          if (selectedDays.includes(dayIndex) && dayStr !== startDate) {
                            // Check if a task with same title and date exists to prevent double creation? 
                            // Since tasks are independent, we just spawn them.
                            const newStart = parse(`${dayStr} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                            const newEnd = parse(`${dayStr} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
                            const newDuration = Math.max(0, (newEnd.getTime() - newStart.getTime()) / (1000 * 60));
                            const newMeta = JSON.stringify({ duration: newDuration, selectedDays, endDate: dayStr, endTime, isSpecial });
                            const newDesc = description.trim() ? `${description.trim()}\n\n<!-- metadata: ${newMeta} -->` : `<!-- metadata: ${newMeta} -->`;
                            
                            onCreateTask({
                              ...updatedTask,
                              id: (Date.now() + Math.random()).toString(),
                              date: dayStr,
                              description: newDesc,
                              duration: newDuration,
                            });
                          }
                        }
                      }

                      toast.success('Changes saved');
                      setIsEditing(false);
                      onClose();
                    }}
                    className="bg-[#e0b596] hover:bg-[#d4a37f] text-white text-sm font-bold px-8 py-4 h-auto rounded-2xl shadow-lg transition-all"
                  >
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => { onDeleteTask(task.id); onClose(); }}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-bold h-auto py-4 px-4 rounded-xl"
                >
                  Delete
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { if (!task.completed) { onToggleComplete(task.id); onClose(); } }}
                    className={`text-sm font-bold border-2 rounded-2xl h-auto py-4 px-6 transition-all ${task.completed ? 'text-green-500 border-green-500 cursor-default bg-green-50/50' : 'text-gray-400 border-gray-200 hover:border-[#e0b596]'}`}
                  >
                    {task.completed ? 'Completed' : 'Mark Done'}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-[#e0b596] hover:bg-[#d4a37f] text-white text-sm font-bold px-8 py-4 h-auto rounded-2xl shadow-lg transition-all"
                  >
                    Edit Task
                  </Button>
                </div>
              </>
            )}
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
                {allScheduleItems.map((t) => (
                  <div key={t.id} className="relative">
                    <div className={`absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1b1b1b] border-2 ${t.id === task.id ? 'border-[#e0b596] scale-125 ring-4 ring-[#e0b596]/10' : 'border-gray-300'}`} />
                    <div className="space-y-1">
                      <span className={`text-xs font-bold uppercase tracking-tighter ${t.id === task.id ? 'text-[#e0b596]' : 'text-gray-400'}`}>
                        {t.time ? format(parse(t.time, 'HH:mm', new Date()), 'h:mm a') : '--'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-base font-semibold leading-tight ${t.id === task.id ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'
                          } ${t.completed ? 'line-through opacity-50' : ''}`}>
                          {t.title}
                        </p>
                        {!t.completed && isBefore(parse(`${t.date} ${t.time || '00:00'}`, 'yyyy-MM-dd HH:mm', new Date()), new Date()) && (
                          <CircleAlert className="w-3.5 h-3.5 text-amber-500/80" />
                        )}
                      </div>
                    </div>
                  </div>
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
      </motion.div>
    </motion.div>
  );
}


