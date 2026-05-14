import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isToday,
  isBefore,
  subMinutes,
  differenceInMinutes,
  addMinutes,
  startOfDay,
  setHours,
  setMinutes,
  isSameDay,
  parseISO,
  parse,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval
} from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import {
  Home,
  MapPin,
  Plus,
  Settings,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Briefcase,
  User,
  Clock,
  Video,
  ChevronDown,
  Keyboard,
  Sun,
  Moon,

  Search,
  CheckCircle,
  SlidersHorizontal,
  Sparkles,
  Hourglass,
  Check,
  Edit2,
  Trash2,
  CalendarDays,
  LayoutGrid,
  Rows3,
  Columns3,
  PanelLeft,
  Bell,
  BellOff
} from 'lucide-react';

import { Task } from '@/app/types';
import { TaskDetails } from '@/app/components/TaskDetails';
import { SettingsPanel } from '@/app/components/SettingsPanel';
import { CreateReminder } from '@/app/components/CreateReminder';
import { CustomerSupportChat } from '@/app/components/CustomerSupportChat';
import { ProfileMenu } from '@/app/components/ProfileMenu';

import { Calendar } from '@/app/components/ui/calendar';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { toast } from 'sonner';

interface DashboardProps {
  userEmail: string;
  userName: string;
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onUpdateUser: (newName: string) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}

type View = 'settings' | 'pending' | 'completed' | 'calendar';
type DragMode = 'none' | 'create' | 'move' | 'resize';

// Constants
const HOUR_HEIGHT = 60;
const GRID_START_HOUR = 0;
const COL_WIDTH_PERCENT = 100 / 7;
const SNAP_MINUTES = 30;

export function Dashboard({
  userEmail,
  userName,
  tasks,
  onAddTask,
  onDeleteTask,
  onToggleComplete,
  onUpdateTask,
  onUpdateUser,
  notificationsEnabled,
  onToggleNotifications,
}: DashboardProps) {
  const [activeView, setActiveView] = useState<View>('calendar');
  const isMobile = useIsMobile();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Live clock — updates every 30s so the red line stays accurate
  const [currentNow, setCurrentNow] = useState(new Date());
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [completedSearchDate, setCompletedSearchDate] = useState<Date | undefined>(undefined);
  const [showCompletedCalendar, setShowCompletedCalendar] = useState(false);
  const [pendingSearchDate, setPendingSearchDate] = useState<Date | undefined>(undefined);
  const [showPendingCalendar, setShowPendingCalendar] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showSecondarySidebar, setShowSecondarySidebar] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSpecialsOnly, setShowSpecialsOnly] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'schedule' | 'day'>('schedule');
  const [expandedScheduleDays, setExpandedScheduleDays] = useState<Record<string, boolean>>({});
  const [isMobileCalendarExpanded, setIsMobileCalendarExpanded] = useState(false);
  const [showMobileMiniCalendar, setShowMobileMiniCalendar] = useState(false);
  const [showSpecialCalendar, setShowSpecialCalendar] = useState(false);
  const [specialDateFilter, setSpecialDateFilter] = useState<Date | undefined>(undefined);

  // Teams-like Interaction State
  const containerRef = useRef<HTMLDivElement>(null);
  const dateStripRef = useRef<HTMLDivElement>(null);
  const expandedCalendarRef = useRef<HTMLDivElement>(null);
  const scheduleListRef = useRef<HTMLDivElement>(null);

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number, y: number, time: number, dayIndex: number, originalTime?: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number, time: number, dayIndex: number } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null); // For move/resize
  const wasDragging = useRef(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  // Create Modal State
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; date?: string; time?: string; duration?: number }>({
    isOpen: false
  });

  // Derived Dates
  // Derived Dates
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'workWeek' | 'month'>('week');

  // Effect to handle mobile default view
  useEffect(() => {
    if (isMobile) {
      setCalendarView('week');
    }
  }, [isMobile]);

  const viewOptions = [
    { id: 'day', label: 'Day', icon: Rows3 },
    { id: 'workWeek', label: 'Work week', icon: CalendarDays },
    { id: 'week', label: 'Week', icon: Columns3 },
    { id: 'month', label: 'Month', icon: LayoutGrid },
  ] as const;

  // Robust task sanitization to ensure isSpecial is detected even from metadata
  const sanitizedTasks = useMemo(() => {
    return tasks.map(t => {
      if (t.isSpecial) return t;
      // Try to recover from metadata if top-level is missing
      const match = t.description?.match(/<!-- metadata: (.+) -->/);
      if (match) {
        try {
          const meta = JSON.parse(match[1]);
          if (meta.isSpecial) return { ...t, isSpecial: true };
        } catch (e) { }
      }
      return t;
    });
  }, [tasks]);

  const currentViewData = viewOptions.find(v => v.id === calendarView) || viewOptions[2];

  const calendarDays = useMemo(() => {
    if (calendarView === 'day') return [currentDate];
    if (calendarView === 'month') {
      const startMonth = startOfMonth(currentDate);
      const endMonth = endOfMonth(currentDate);
      const start = startOfWeek(startMonth, { weekStartsOn: 1 });
      const end = endOfWeek(endMonth, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    if (calendarView === 'workWeek') return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate, calendarView]);

  // Header weeks for mobile scroll (6-month range grouped by 7 days: Sunday to Saturday)
  const horizontalScrollWeeks = useMemo(() => {
    const today = startOfDay(new Date());
    const rangeStart = subDays(today, 90);
    const start = startOfWeek(rangeStart, { weekStartsOn: 0 }); // Align to Sunday
    const end = addDays(start, 181); // 26 weeks total
    const allDays = eachDayOfInterval({ start, end });

    // Group into chunks of 7
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    return weeks;
  }, []);

  // Continuous days for the expanded mobile mini-calendar (Teams style)
  const continuousCalendarDays = useMemo(() => {
    // Show 2 weeks before and 10 weeks after the current date for a continuous feel
    const start = startOfWeek(subWeeks(currentDate, 2), { weekStartsOn: 1 });
    const end = endOfWeek(addWeeks(currentDate, 10), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Auto-scroll expanded calendar to selected date
  useEffect(() => {
    if (isMobileCalendarExpanded && expandedCalendarRef.current) {
      const container = expandedCalendarRef.current;
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const selectedDay = container.querySelector(`[data-date="${dateStr}"]`);
      if (selectedDay) {
        // Use a slight timeout to ensure height animation doesn't interfere with scroll position
        const timer = setTimeout(() => {
          selectedDay.scrollIntoView({ block: 'center', behavior: 'auto' });
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isMobileCalendarExpanded, currentDate]);

  const hasScrolledDateStrip = useRef(false);
  const prevExpandedRef = useRef(isMobileCalendarExpanded);

  // Auto-scroll to the week containing the selected date in strip view
  useEffect(() => {
    if (isMobile && dateStripRef.current && !isMobileCalendarExpanded) {
      const container = dateStripRef.current;
      const selectedDay = container.querySelector(`[data-date="${format(currentDate, 'yyyy-MM-dd')}"]`);
      const weekGroup = selectedDay?.closest('[data-week]');

      if (weekGroup) {
        const offset = (weekGroup as HTMLElement).offsetLeft;
        // Use 'auto' (jump) if:
        // 1. It's the very first time we scroll (app load)
        // 2. We just collapsed the calendar (prev was expanded, now is not)
        const behavior = (!hasScrolledDateStrip.current || prevExpandedRef.current) ? 'auto' : 'smooth';
        container.scrollTo({ left: offset, behavior });
        hasScrolledDateStrip.current = true;
      }
    }
    prevExpandedRef.current = isMobileCalendarExpanded;
  }, [currentDate, isMobile, isMobileCalendarExpanded]);

  const hasScrolledVertical = useRef(false);

  // Auto-scroll to current time indicator (red line) on mount or view change
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      // Scroll to current time if we are looking at today, otherwise scroll to 8 AM as a default starting point
      const isViewingToday = isSameDay(currentDate, now);
      const targetMinutes = isViewingToday
        ? (now.getHours() * 60 + now.getMinutes())
        : 8 * 60; // Default to 8 AM for other days

      const scrollPosition = Math.max(0, targetMinutes - 150); // Show a bit of context above

      // Delay slightly to ensure layout is complete
      const timer = setTimeout(() => {
        const behavior = hasScrolledVertical.current ? 'smooth' : 'auto';
        containerRef.current?.scrollTo({ top: scrollPosition, behavior });
        hasScrolledVertical.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeView, mobileViewMode, currentDate]);

  // Auto-scroll the vertical schedule list to the selected date
  useEffect(() => {
    if (isMobile && mobileViewMode === 'schedule' && scheduleListRef.current) {
      const container = scheduleListRef.current;
      const targetDateStr = format(currentDate, 'yyyy-MM-dd');

      const timer = setTimeout(() => {
        const targetElement = container.querySelector(`[data-schedule-date="${targetDateStr}"]`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300); // Slight delay to ensure list is rendered
      return () => clearTimeout(timer);
    }
  }, [isMobile, mobileViewMode, calendarView, currentDate]);

  // Keep legacy name for other internals if needed

  const weekDays = isMobile ? [currentDate] : calendarDays;
  const startDate = weekDays[0];


  // --- Helpers ---

  const parseTaskDate = (dateStr: string | undefined) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('T')) return parseISO(dateStr);
    const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
    return isNaN(parsed.getTime()) ? new Date(dateStr) : parsed;
  };

  const getMinutesFromY = (y: number) => {
    return Math.floor((y / HOUR_HEIGHT) * 60);
  };

  const getDayIndexFromX = (x: number, width: number, daysCount = 7) => {
    return Math.min(daysCount - 1, Math.max(0, Math.floor(x / (width / daysCount))));
  };

  const snapToGrid = (minutes: number) => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  };

  const snapToGridFloor = (minutes: number) => {
    return Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  };

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((activeView !== 'home' && activeView !== 'calendar') || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60; // Offset for time column
    const y = e.clientY - rect.top + containerRef.current.scrollTop; // Adjust for scroll

    if (x < 0) return; // Clicked on time column

    const dayIndex = getDayIndexFromX(x, rect.width - 60, weekDays.length);
    const time = getMinutesFromY(y);

    // Validate past time (with 1 min buffer)
    const clickedDate = addDays(startDate, dayIndex);
    const clickedDateTime = setMinutes(setHours(startOfDay(clickedDate), Math.floor(time / 60)), time % 60);

    if (isBefore(clickedDateTime, subMinutes(new Date(), 1))) {
      toast.error('Cannot create tasks in the past');
      return;
    }

    setDragStart({ x, y, time: snapToGridFloor(time), dayIndex });
    setDragCurrent({ x, y, time: snapToGridFloor(time), dayIndex });
    touchStartPos.current = { x: clientX, y: clientY };

    // On mobile, don't start the drag mode immediately to allow the browser to handle scrolls
    if (!isMobile) {
      setDragMode('create');
    } else {
      // On mobile, we'll set it in handlePointerMove if the movement is horizontal or after a threshold
      // For now, let's just let handlePointerMove handle it
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragMode === 'none' || !containerRef.current || !dragStart) return;

    // Auto scroll if near edges (simplified)
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const x = e.clientX - rect.left - 60;

    let time = getMinutesFromY(y);
    const dayIndex = getDayIndexFromX(x, rect.width - 60, weekDays.length);

    // Clamping for today
    const targetDate = addDays(startDate, dayIndex);
    if (isToday(targetDate)) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      // Clamp to current time + 5 min buffer to prevent "past" errors during drag
      time = Math.max(time, snapToGrid(currentMinutes));
    }

    if (!wasDragging.current) wasDragging.current = true;
    setDragCurrent({ x, y, time: snapToGrid(time), dayIndex });
  }, [dragMode, dragStart, weekDays, startDate]);

  if (!wasDragging.current && (dx > 5 || dy > 5)) {
    wasDragging.current = true;
    // On mobile, if we weren't in drag mode yet, check if this is a horizontal drag (creation)
    if (isMobile && dragMode === 'none' && dx > dy && dx > 10) {
      setDragMode('create');
    }
  }
  const newTime = dragMode === 'create' ? snapToGridFloor(time) : snapToGrid(time);
  const newDragCurrent = { x, y, time: newTime, dayIndex };

  // Performance optimization: only update state if the grid position (time/day) actually changed
  if (!dragCurrent ||
    newDragCurrent.time !== dragCurrent.time ||
    newDragCurrent.dayIndex !== dragCurrent.dayIndex) {
    setDragCurrent(newDragCurrent);
  }
}, [dragMode, dragStart, weekDays, startDate, dragCurrent]);

const handlePointerUp = useCallback((e?: MouseEvent | TouchEvent) => {
  if ((dragMode === 'create' || (isMobile && dragMode === 'none' && dragStart)) && dragStart) {
    const current = dragCurrent || dragStart;

    let pixelDistance = 0;
    if (isMobile && touchStartPos.current && e) {
      const { clientX, clientY } = getCoordinates(e);
      const dx = clientX - touchStartPos.current.x;
      const dy = clientY - touchStartPos.current.y;
      pixelDistance = Math.sqrt(dx * dx + dy * dy);
    } else {
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;
      pixelDistance = Math.sqrt(dx * dx + dy * dy);
    }

    // On mobile, if the user moved more than a small threshold, assume they were scrolling
    if (isMobile && pixelDistance > 20) {
      setDragMode('none');
      setDragStart(null);
      setDragCurrent(null);
      touchStartPos.current = null;
      return;
    }

    // Calculate created range
    const startMin = Math.min(dragStart.time, current.time);
    const endMin = Math.max(dragStart.time, current.time);
    const duration = Math.max(SNAP_MINUTES, endMin - startMin + (dragStart.time === current.time ? 30 : 0));

    const dayDate = addDays(startDate, dragStart.dayIndex);
    const dateStr = format(dayDate, 'yyyy-MM-dd');

    const hours = Math.floor(startMin / 60);
    const mins = startMin % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    setCreateModal({
      isOpen: true,
      date: dateStr,
      time: timeStr,
      duration: duration
    });
  } else if (dragMode === 'move' && activeTaskId && dragCurrent && dragStart) {
    // Finalize move
    const task = tasks.find(t => String(t.id) === String(activeTaskId) || String((t as any)._id) === String(activeTaskId));
    if (task) {
      const timeDiff = dragCurrent.time - dragStart.time;
      const dayDiff = dragCurrent.dayIndex - dragStart.dayIndex;

      // Helper to parse "HH:mm"
      const [h, m] = task.time!.split(':').map(Number);
      const originalMins = h * 60 + m;
      let newMins = originalMins + timeDiff;
      // Clamp to 0-24h
      newMins = Math.max(0, Math.min(1440 - (task.duration || 60), newMins));

      // Ensure snapping to grid
      newMins = snapToGrid(newMins);

      // Calculate new date
      const originalDate = new Date(task.date);
      const newDate = addDays(originalDate, dayDiff);

      // Format
      const newH = Math.floor(newMins / 60);
      const newM = newMins % 60;
      const newTimeStr = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
      const newDateStr = format(newDate, 'yyyy-MM-dd');

      // Check if actually moved
      const hasMoved = task.date !== newDateStr || task.time !== newTimeStr;
      if (!hasMoved) {
        setDragMode('none');
        setDragStart(null);
        setDragCurrent(null);
        setActiveTaskId(null);
        return;
      }

      // Validate past move
      const newDateTime = setMinutes(setHours(startOfDay(newDate), newH), newM);
      const now = new Date();
      if (isToday(newDate) && isBefore(newDateTime, subMinutes(now, 1))) {
        toast.error('Tasks can only be moved to a future time');
        setActiveTaskId(null);
        setDragMode('none');
        return;
      } else if (!isToday(newDate) && isBefore(newDate, startOfDay(now))) {
        // Prevent moving to entirely past days as well
        toast.error('Cannot move tasks to the past');
        setActiveTaskId(null);
        setDragMode('none');
        return;
      }

      onUpdateTask({ ...task, date: newDateStr, time: newTimeStr });
      toast.success('Event moved');
    }
  } else if (dragMode === 'resize' && activeTaskId && dragCurrent && dragStart) {
    // Finalize resize
    const task = tasks.find(t => String(t.id) === String(activeTaskId) || String((t as any)._id) === String(activeTaskId));
    if (task) {
      const endMins = dragCurrent.time;
      const [h, m] = task.time!.split(':').map(Number);
      const startMins = h * 60 + m;
      const newDuration = Math.max(15, endMins - startMins);

      // Final validation for resizing on today
      const taskDate = new Date(task.date);
      const endDateTime = setMinutes(setHours(startOfDay(taskDate), Math.floor(endMins / 60)), endMins % 60);
      if (isToday(taskDate) && isBefore(endDateTime, subMinutes(new Date(), 1))) {
        toast.error('Task cannot end in the past');
        setActiveTaskId(null);
        setDragMode('none');
        return;
      }

      if (task.duration !== newDuration) {
        onUpdateTask({ ...task, duration: newDuration });
        toast.success('Event resized');
      }
    }
  }

  setDragMode('none');
  setDragStart(null);
  setDragCurrent(null);
  setActiveTaskId(null);

  // Clear wasDragging after a short delay to allow the click event to fire and be ignored
  setTimeout(() => {
    wasDragging.current = false;
  }, 100);
}, [dragMode, dragStart, dragCurrent, startDate, tasks, onUpdateTask, isMobile]);

const handleTouchCancel = useCallback(() => {
  setDragMode('none');
  setDragStart(null);
  setDragCurrent(null);
  touchStartPos.current = null;
}, []);

useEffect(() => {
  window.addEventListener('mousemove', handlePointerMove as any);
  window.addEventListener('mouseup', handlePointerUp as any);
  window.addEventListener('touchmove', handlePointerMove as any, { passive: false });
  window.addEventListener('touchend', handlePointerUp as any);
  window.addEventListener('touchcancel', handleTouchCancel);
  return () => {
    window.removeEventListener('mousemove', handlePointerMove as any);
    window.removeEventListener('mouseup', handlePointerUp as any);
    window.removeEventListener('touchmove', handlePointerMove as any);
    window.removeEventListener('touchend', handlePointerUp as any);
    window.removeEventListener('touchcancel', handleTouchCancel);
  };
}, [handlePointerMove, handlePointerUp, handleTouchCancel]);

// Theme State
const [theme, setTheme] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'light';
  }
  return 'light';
});

const toggleTheme = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
  document.documentElement.classList.toggle('dark', newTheme === 'dark');
};

useEffect(() => {
  // Initialize theme on mount
  document.documentElement.classList.toggle('dark', theme === 'dark');
}, [theme]);

// Auto-scroll to current time (red line) on app load
useEffect(() => {
  const scrollToCurrentTime = () => {
    if (!containerRef.current) return;
    const now = new Date();
    // 1px per minute (HOUR_HEIGHT = 60, so 60px per hour)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // Offset upward by ~100px so there's some context above the red line
    const scrollTarget = Math.max(0, currentMinutes - 100);
    containerRef.current.scrollTop = scrollTarget;
  };
  // Small delay to ensure the DOM is fully rendered
  const timer = setTimeout(scrollToCurrentTime, 150);
  return () => clearTimeout(timer);
}, []); // eslint-disable-line react-hooks/exhaustive-deps

// Tick currentNow every 30s to keep the red line in sync with the clock
useEffect(() => {
  const interval = setInterval(() => setCurrentNow(new Date()), 30_000);
  return () => clearInterval(interval);
}, []);

// Synchronized date selection handler
const handleDateSelect = (date: Date | undefined) => {
  if (date) {
    setCurrentDate(date);
    setCurrentMonth(date);
    setPendingSearchDate(date);
    setCompletedSearchDate(date);
  }
};

// --- Event Layout Logic (Overlaps) ---
const eventsForGrid = useMemo(() => {
  // 1. Filter only this week's events
  const weekStartStr = format(startDate, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(startDate, 6), 'yyyy-MM-dd');

  // We need to group by Day first to handle day-local overlaps
  const eventsByDay: { [key: string]: any[] } = {};
  weekDays.forEach(d => eventsByDay[format(d, 'yyyy-MM-dd')] = []);

  sanitizedTasks.forEach(task => {
    // Find matching day by comparing parsed dates to be robust against format strings
    const taskDateParsed = parseTaskDate(task.date);
    const dayMatch = weekDays.find(d => isSameDay(d, taskDateParsed));
    if (dayMatch) {
      eventsByDay[format(dayMatch, 'yyyy-MM-dd')].push(task);
    } else {
      // Log if task is not in current view range
      // console.log('Task date not in current week range:', task.date);
    }
  });

  // 2. Process each day for visual attributes (top, height, left, width)
  const processedEvents: any[] = [];
  console.log('Events for grid - starting processing:', { tasksCount: sanitizedTasks.length, weekDaysCount: weekDays.length });

  Object.keys(eventsByDay).forEach(dateKey => {
    const dayEvents = eventsByDay[dateKey];
    if (dayEvents.length > 0) {
      console.log(`Processing day ${dateKey}: ${dayEvents.length} events found`);
    }
    // Sort by start time
    dayEvents.sort((a, b) => {
      return a.time!.localeCompare(b.time!);
    });

    // Simple overlap algorithm:
    // Group colliding events
    // Map [start, end] in minutes
    const slots: any[] = dayEvents.map(e => {
      const [h, m] = e.time!.split(':').map(Number);
      const start = h * 60 + m;
      let duration = e.duration || 60;
      // Parse duration from description if missing in prop (legacy support)
      if (!e.duration && e.description?.includes('Duration:')) {
        // Try parse
        try {
          const match = e.description.match(/Duration: (\d+)/);
          if (match) duration = parseInt(match[1]);
        } catch (e) { }
      }

      return {
        ...e,
        start,
        end: start + duration,
        duration
      };
    });

    // Layout calc (Pack events)
    const columns: any[][] = [];
    slots.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastEvent = col[col.length - 1];
        if (lastEvent.end <= event.start) {
          col.push(event);
          event.colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
        event.colIndex = columns.length - 1;
      }
    });

    const totalCols = columns.length;

    // Calculate day index for horizontal positioning
    const dayIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === dateKey);
    if (dayIndex === -1) return;

    const dayWidthPercent = 100 / weekDays.length;
    const dayLeftPercent = dayIndex * dayWidthPercent;

    slots.forEach(event => {
      const eventDateTime = setMinutes(setHours(startOfDay(parseTaskDate(event.date)), Math.floor(event.start / 60)), event.start % 60);
      const isPast = isBefore(eventDateTime, subMinutes(new Date(), 1));

      processedEvents.push({
        ...event,
        isPast,
        style: {
          top: (event.start / 60) * HOUR_HEIGHT,
          height: (event.duration / 60) * HOUR_HEIGHT,
          left: `${dayLeftPercent + (event.colIndex / totalCols) * dayWidthPercent}%`,
          width: `${(1 / totalCols) * dayWidthPercent}%`,
          position: 'absolute'
        }
      });
    });
  });

  return processedEvents;
}, [sanitizedTasks, startDate, weekDays]);




return (
  <div className="flex h-screen bg-gray-50 dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100 overflow-hidden font-sans selection:bg-[#e0b596]/30">

    {/* Sidebar - Teams Style (Updated) */}
    <div className={`hidden lg:flex flex-col w-[68px] bg-white dark:bg-[#1b1b1b] border-r border-gray-200 dark:border-[#292929] items-center py-6 z-20`}>
      <nav className="flex-1 w-full flex flex-col items-center gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                setActiveView('calendar');
                document.getElementById('dashboard-main')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`group relative p-3 rounded-xl transition-all ${activeView === 'calendar' ? 'bg-gray-100 dark:bg-[#333] text-[#e0b596]' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]'}`}
            >
              <Home className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" hideArrow>Home</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActiveView('pending')}
              className={`group relative p-3 rounded-xl transition-all ${activeView === 'pending' ? 'bg-gray-100 dark:bg-[#333] text-[#e0b596]' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]'}`}
            >
              <Hourglass className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" hideArrow>Pending</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActiveView('completed')}
              className={`group relative p-3 rounded-xl transition-all ${activeView === 'completed' ? 'bg-gray-100 dark:bg-[#333] text-[#e0b596]' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]'}`}
            >
              <Check className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" hideArrow>Completed</TooltipContent>
        </Tooltip>

        <div className="mt-auto flex flex-col items-center gap-4 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="group relative p-3 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-all"
              >
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" hideArrow>Theme</TooltipContent>
          </Tooltip>

          <button onClick={() => setShowSettings(true)} className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>

    {/* Secondary Sidebar - Mini Calendar */}
    <AnimatePresence mode="wait">
      {showSecondarySidebar && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="hidden xl:flex flex-col bg-[#f9f9f9] dark:bg-[#1b1b1b] border-r border-gray-200 dark:border-[#292929] overflow-hidden z-10"
        >
          <div className="w-[280px] h-full flex flex-col overflow-y-auto scrollbar-none">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-1">Calendar</h2>

              <div className="flex flex-col gap-4">
                <div className="bg-transparent">
                  <Calendar
                    mode="single"
                    month={currentMonth}
                    onMonthChange={(month) => {
                      setCurrentMonth(month);
                    }}
                    today={new Date()}
                    selected={currentDate}
                    onSelect={handleDateSelect}
                    className="w-full p-0"
                    classNames={{
                      months: "flex flex-col w-full",
                      month: "flex flex-col w-full",
                      caption: "flex justify-between items-center w-full mb-4 px-1",
                      caption_label: "text-sm font-bold text-gray-700 dark:text-gray-200",
                      nav: "flex items-center gap-1",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-[#333] transition-colors",
                      table: "w-full border-collapse space-y-1",
                      head_row: "grid grid-cols-7 mb-2",
                      head_cell: "text-gray-400 font-bold text-[10px] uppercase text-center w-full",
                      row: "grid grid-cols-7 w-full",
                      cell: "h-8 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 p-0 font-medium aria-selected:opacity-100 rounded-full flex items-center justify-center mx-auto hover:bg-gray-200 dark:hover:bg-[#333] transition-all",
                      day_today: "bg-black! text-white! dark:bg-white! dark:text-black! font-bold aria-selected:bg-black! aria-selected:text-white! dark:aria-selected:bg-white! dark:aria-selected:text-black!",
                      day_selected: "bg-transparent! border-2! border-black! dark:border-white! text-black! dark:text-white! font-bold shadow-none hover:bg-gray-100 dark:hover:bg-[#292929]",
                      day_outside: "text-gray-300 dark:text-gray-600 opacity-50",
                      day_disabled: "text-gray-300 dark:text-gray-600 opacity-50",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Main Content */}
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#1f1f1f]">

      {/* Header */}
      <header className="h-24 border-b border-gray-200 dark:border-[#292929] flex flex-col justify-center px-6 bg-white dark:bg-[#1f1f1f]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <button className="lg:hidden text-gray-500 dark:text-gray-400" onClick={() => setShowSidebar(true)}>
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}, {userName}
              </h1>
              <div className={`flex items-center gap-4 ${activeView !== 'calendar' ? 'opacity-0 pointer-events-none' : ''}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowSecondarySidebar(!showSecondarySidebar)}
                      className={`hidden xl:flex items-center justify-center p-2 rounded-lg transition-all ${!showSecondarySidebar ? 'bg-[#e0b596]/10 text-[#e0b596]' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#292929]'}`}
                    >
                      <PanelLeft className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" hideArrow>{showSecondarySidebar ? "Hide navigation pane" : "Show navigation pane"}</TooltipContent>
                </Tooltip>

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowMobileMiniCalendar(!showMobileMiniCalendar);
                      if (!isMobile) setShowMiniCalendar(!showMiniCalendar);
                    }}
                    className="text-xs md:text-sm font-semibold tracking-tight text-gray-500 dark:text-gray-300 flex items-center gap-1.5 md:gap-2 hover:bg-gray-100 dark:hover:bg-[#292929] px-2 py-1 rounded transition-colors"
                  >
                    {format(currentDate, 'MMM yyyy')}
                    <ChevronDown className={`w-3 h-3 transition-transform ${(isMobile ? showMobileMiniCalendar : showMiniCalendar) ? 'rotate-180' : ''}`} />
                  </button>

                  {showMobileMiniCalendar && (
                    <>
                      {isMobile && <div className="fixed inset-0 z-40" onClick={() => setShowMobileMiniCalendar(false)} />}
                      <div className={`${isMobile ? 'absolute top-full left-0 mt-2' : 'absolute top-full left-0 mt-2'} p-3 bg-white dark:bg-[#1b1b1b] border border-gray-100 dark:border-[#333] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 w-[250px] aspect-square flex flex-col items-center justify-center`}>
                        <DayPicker
                          mode="single"
                          month={currentMonth}
                          onMonthChange={(month) => {
                            setCurrentMonth(month);
                          }}
                          selected={currentDate}
                          onSelect={(date) => {
                            if (date) {
                              handleDateSelect(date);
                              setShowMobileMiniCalendar(false);
                              if (!isMobile) setShowMiniCalendar(false);
                            }
                          }}
                          modifiers={{
                            today: new Date()
                          }}
                          modifiersStyles={{
                            today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                            selected: { backgroundColor: '#e0b596', color: 'white' }
                          }}
                          styles={{
                            root: { 
                              color: theme === 'dark' ? '#f5f5f5' : '#1f2937', 
                              backgroundColor: 'transparent',
                              margin: 0,
                              width: '100%'
                            },
                            day: { color: theme === 'dark' ? '#e0e0e0' : '#374151', width: '28px', height: '28px', fontSize: '11px' },
                            caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827', fontSize: '12px', marginBottom: '4px' },
                            nav_button: { color: theme === 'dark' ? '#e0b596' : '#c69472', width: '20px', height: '20px' },
                            head_cell: { width: '28px', fontSize: '10px' }
                          }}
                          showOutsideDays
                        />
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  setShowFilters(!showFilters);
                  if (!showFilters) setShowViewOptions(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-semibold transition-all group ${showFilters || showSpecialsOnly
                  ? 'bg-[#e0b596]/10 border-[#e0b596] text-[#e0b596]'
                  : 'bg-white dark:bg-[#292929] border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#333]'
                  }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {showSpecialsOnly && <div className="w-1.5 h-1.5 rounded-full bg-[#e0b596]" />}
              </button>

              <AnimatePresence>
                {showFilters && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl z-50 p-2 space-y-3"
                    >
                      <div className="px-2 py-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ">View Mode</p>
                          {showViewOptions && (
                            <button
                              onClick={() => setShowViewOptions(false)}
                              className="text-[10px] font-bold text-[#e0b596] hover:underline"
                            >
                              Collapse
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {!showViewOptions ? (
                            <button
                              onClick={() => setShowViewOptions(true)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-[#e0b596]/10 text-[#e0b596] border border-[#e0b596]/20"
                            >
                              <currentViewData.icon className="w-4 h-4" />
                              <span className="flex-1 text-left">{currentViewData.label}</span>
                              <ChevronDown className="w-3 h-3 opacity-50 transition-transform" />
                            </button>
                          ) : (
                            (isMobile ? viewOptions.filter(o => ['day', 'week', 'month'].includes(o.id)) : viewOptions).map((option) => (
                              <button
                                key={option.id}
                                onClick={() => {
                                  setCalendarView(option.id);
                                  setShowViewOptions(false);
                                  setShowFilters(false);
                                }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${calendarView === option.id
                                  ? 'bg-[#e0b596]/10 text-[#e0b596]'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#333]'
                                  }`}
                              >
                                <option.icon className="w-4 h-4" />
                                <span className="flex-1 text-left">{option.label}</span>
                                {calendarView === option.id && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-[#333] mx-1" />

                      <div className="px-2 py-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Filters</p>
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#232323] rounded-lg border border-gray-100 dark:border-[#333]">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium">Specials</span>
                          </div>
                          <Switch
                            checked={showSpecialsOnly}
                            onCheckedChange={(val) => {
                              setShowSpecialsOnly(val);
                              setShowFilters(false);
                            }}
                            className="scale-75 data-[state=checked]:bg-[#e0b596]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-b from-[#e0b596]/90 to-[#c69472]/90 text-[#1f1f1f] shadow-[0_10px_20px_rgba(224,181,150,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] border border-white/20 border-t-white/60 hover:brightness-110 hover:scale-[1.05] backdrop-blur-xl transition-all duration-300 rounded-xl text-sm font-semibold"
              onClick={() => setCreateModal({ isOpen: true, duration: 30 })}
            >
              <Plus className="w-4 h-4" />
              <span>Add reminder</span>
            </button>

            <button
              onClick={() => setShowProfileMenu(true)}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-[#e0b596] to-[#dcb49a] flex items-center justify-center text-xs font-bold text-[#1f1f1f] border-2 border-white/50 dark:border-[#333] ml-2 shadow-lg hover:shadow-xl hover:scale-110 transition-all cursor-pointer ring-2 ring-transparent hover:ring-[#e0b596]/50"
            >
              {userName && userName.length > 0 ? userName[0].toUpperCase() : 'U'}
            </button>
          </div>
        </div>
      </header>

      {/* Profile Menu Overlay */}
      <AnimatePresence>
        {showProfileMenu && (
          <ProfileMenu
            userEmail={userEmail}
            userName={userName}
            onClose={() => setShowProfileMenu(false)}
            onLogout={async () => {
              try {
                await GoogleAuth.signOut();
              } catch (e) {
                console.error('Google signOut error:', e);
              }
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              window.location.reload();
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 relative flex overflow-hidden bg-gray-50 dark:bg-[#1f1f1f]">
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${showSpecialsOnly ? 'mr-0 lg:mr-64' : ''}`}>
          {activeView === 'calendar' && (
            !isMobile ? (
              <div
                className="flex flex-col h-full bg-white dark:bg-[#1f1f1f]"
              >
                {/* Calendar Grid Header */}
                {calendarView !== 'month' ? (
                  <div className="flex bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-[#333] sticky top-0 z-30">
                    <div className="w-[60px] flex-shrink-0 border-r border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]" />
                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
                      {weekDays.map((day, i) => (
                          <div
                            key={i}
                            className={`py-3 text-center border-r border-gray-200 dark:border-[#333] last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                          >
                            Schedule
                          </button>
    <button
      onClick={() => setMobileViewMode('day')}
      className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${mobileViewMode === 'day' ? 'bg-white dark:bg-[#3d3d45] text-[#e0b596] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
    >
      Day
    </button>
                        </div >
                  </div >
    {/* Persistent Common Datestrip (Paginated or Grid) */}
                < div className="flex flex-col bg-white dark:bg-[#1f1f1f] shrink-0 relative" >
                  {!isMobileCalendarExpanded ? (
                    <div
                      ref={dateStripRef}
                      className="flex overflow-x-auto no-scrollbar py-3 px-0 snap-x snap-mandatory"
                    >
                      {horizontalScrollWeeks.map((week, weekIndex) => (
                        <div key={weekIndex} data-week={weekIndex} className="flex min-w-full justify-around px-2 snap-start">
                          {week.map((day, i) => {
                            const isSelected = isSameDay(day, currentDate);
                            return (
                              <button
                                key={i}
                                data-date={format(day, 'yyyy-MM-dd')}
                                onClick={() => handleDateSelect(day)}
                                className={`flex flex-col items-center gap-1 transition-all ${isSelected ? 'scale-110 active' : 'opacity-60'}`}
                              >
                                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-[#e0b596]' : 'text-gray-400'}`}>
                                  {format(day, 'EEE')[0]}
                                </span>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all ${isSelected
                                  ? 'bg-[#e0b596] text-white shadow-lg'
                                  : isSameDay(day, new Date())
                                    ? 'border-2 border-black dark:border-white text-gray-700 dark:text-gray-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                  {format(day, 'd')}
                                </span>
                                {sanitizedTasks.some(t => isTaskOnDay(t.date, day)) && (
                                  <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[#e0b596]' : 'bg-gray-400'}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: '350px', opacity: 1 }}
                      className="overflow-y-auto no-scrollbar"
                      ref={expandedCalendarRef}
                    >
                      <div className="px-4 py-2">
                        <div className="grid grid-cols-7 mb-4">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-y-4">
                          {continuousCalendarDays.map((day, i) => {
                            const isSelected = isSameDay(day, currentDate);
                            const isFirstOfMonth = day.getDate() === 1;
                            const hasTasks = sanitizedTasks.some(t => isTaskOnDay(t.date, day));

                            return (
                              <button
                                key={i}
                                data-date={format(day, 'yyyy-MM-dd')}
                                onClick={() => handleDateSelect(day)}
                                className="relative flex flex-col items-center justify-center py-1 group"
                              >
                                {isFirstOfMonth && (
                                  <span className="absolute -top-3 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                    {format(day, 'MMM')}
                                  </span>
                                )}
                                <span className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all ${isSelected
                                  ? 'bg-[#e0b596] text-white shadow-lg scale-110'
                                  : isSameDay(day, new Date())
                                    ? 'border-2 border-black dark:border-white text-gray-700 dark:text-gray-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#292929]'
                                  }`}>
                                  {format(day, 'd')}
                                </span>
                                {hasTasks && !isSelected && (
                                  <div className="absolute bottom-0 w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )
                  }

                  {/* Drag Handle */}
                  <motion.div
                    onPanEnd={(_, info) => {
                      if (info.offset.y > 20) setIsMobileCalendarExpanded(true);
                      if (info.offset.y < -20) setIsMobileCalendarExpanded(false);
                    }}
                    className="flex justify-center pb-2 cursor-grab active:cursor-grabbing group select-none touch-none"
                  >
                    <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-[#333] group-hover:bg-gray-300 dark:group-hover:bg-[#444] transition-colors" />
                  </motion.div>
                </div >
              </div >
            )}

          {/* Calendar Content Selection */}
          {
            isMobile && mobileViewMode === 'schedule' ? (
              <div
                ref={scheduleListRef}
                className="flex-1 overflow-y-auto p-4 pb-32 space-y-8 bg-gray-50/30 dark:bg-transparent custom-scrollbar scroll-smooth"
              >
                {(() => {
                  // ... (rest of logic remains same)
                  let listDays = [];
                  if (calendarView === 'day') {
                    listDays = [currentDate];
                  } else if (calendarView === 'week') {
                    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
                    listDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
                  } else if (calendarView === 'month') {
                    const start = startOfMonth(currentDate);
                    const end = endOfMonth(currentDate);
                    listDays = eachDayOfInterval({ start, end });
                  } else {
                    // Fallback for workWeek or others (e.g. 7-day window)
                    const start = subDays(currentDate, 3);
                    listDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
                  }

                  return listDays.map((day, i) => {
                    const dayTasks = sanitizedTasks.filter(t => isTaskOnDay(t.date, day));
                    return (
                      <div key={i} data-schedule-date={format(day, 'yyyy-MM-dd')} className="space-y-4 pt-2">
                        <h3 className="flex items-baseline gap-2 text-lg font-bold text-gray-900 dark:text-white">
                          {format(day, 'd MMM')}
                          <span className="text-sm font-medium text-gray-400">
                            {isToday(day) ? 'Today' : format(day, 'EEEE')}
                          </span>
                        </h3>

                        <div className="space-y-3">
                          {dayTasks.length > 0 ? (
                            (() => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const isExpanded = !!expandedScheduleDays[dateKey];
                              return (
                                <>
                                  {dayTasks
                                    .sort((a, b) => a.time!.localeCompare(b.time!))
                                    .slice(0, isExpanded ? undefined : 2)
                                    .map(task => {
                                      const cleanDesc = task.description ? task.description.replace(/<!-- metadata: .*? -->/g, '').trim() : '';
                                      const hasDesc = cleanDesc.length > 0;
                                      return (
                                        <div
                                          key={task.id}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                          className={`px-3 py-1.5 rounded-2xl border flex items-center gap-3 group transition-all active:scale-[0.98] ${task.completed ? 'bg-gray-50/50 dark:bg-[#252525]/50 border-gray-100 dark:border-gray-800' : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-[#333] shadow-sm'}`}
                                        >
                                          {/* Time & Duration (Left) */}
                                          <div className="flex flex-col items-center min-w-[64px] text-center">
                                            <span className={`text-[10px] md:text-xs font-bold leading-none ${task.completed ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                              {task.time ? format(parse(task.time, 'HH:mm', new Date()), 'h:mm a') : '--:--'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-1">
                                              {(() => {
                                                const match = task.description?.match(/<!-- metadata: (.+) -->/);
                                                if (match) {
                                                  try {
                                                    const meta = JSON.parse(match[1]);
                                                    if (meta.duration) return `${meta.duration} min`;
                                                  } catch (e) { }
                                                }
                                                return '30 min';
                                              })()}
                                            </span>
                                          </div>

                                          {/* Colored Bar */}
                                          <div className={`w-1 ${hasDesc ? 'h-10' : 'h-6'} rounded-full flex-shrink-0 ${task.completed ? 'bg-gray-300' :
                                            isBefore(setMinutes(setHours(startOfDay(parseTaskDate(task.date)), parseInt(task.time?.split(':')[0] || '0')), parseInt(task.time?.split(':')[1] || '0')), subMinutes(new Date(), 1)) ?
                                              'bg-amber-500' : 'bg-[#e0b596]'
                                            }`} />

                                          {/* Title (Right) */}
                                          <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold text-sm md:text-base truncate ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                              {task.title}
                                            </h4>
                                            {hasDesc && (
                                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                                {cleanDesc}
                                              </p>
                                            )}
                                          </div>
                                          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        </div>
                                      )
                                    })}
                                  {dayTasks.length > 2 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedScheduleDays(prev => ({ ...prev, [dateKey]: !isExpanded }));
                                      }}
                                      className="w-full flex items-center justify-center gap-1.5 py-3 mt-1 bg-gray-50 dark:bg-[#252525] border border-dashed border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold text-[#e0b596] hover:bg-white dark:hover:bg-[#2a2a2a] transition-all"
                                    >
                                      {isExpanded ? 'Show less' : `+ ${dayTasks.length - 2} more tasks`}
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <p className="text-sm italic text-gray-400 pl-6">No events</p>
                          )}
                        </div>
                      </div>
                    ))
                }
                      </div>
                    </div >
        ) : (
        <div className="grid grid-cols-7 bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-[#333] sticky top-0 z-30">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#333] last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        )
}

        {/* Calendar Grid Body */}
        {
          (calendarView !== 'month' || isMobile) ? (
            <div
              className="flex-1 overflow-y-auto relative custom-scrollbar touch-pan-y"
              ref={containerRef}
              onMouseDown={handleMouseDown}
            >
              <div className="flex min-h-[1440px] relative">
                {/* Time Column */}
                <div className="w-[60px] flex-shrink-0 border-r border-gray-200 dark:border-[#333] bg-white dark:bg-[#1f1f1f] select-none text-right pr-2 pt-2">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-[60px] text-xs text-gray-400 font-medium relative -top-2.5">
                      {format(setHours(new Date(), i), 'h a')}
                    </div>
                  ))}
                </div>

                {/* Grid Columns */}
                <div className="flex-1 grid relative bg-white dark:bg-[#1f1f1f]" style={{ gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
                  {/* Current Time Indicator */}
                  {isToday(currentDate) && (
                    <div
                      className="absolute w-full z-40 pointer-events-none flex items-center -translate-y-1/2"
                      style={{
                        top: (new Date().getHours() * 60 + new Date().getMinutes()) + 'px'
                      }}
                    >
                      <div className="w-[60px] text-right pr-2 text-red-500 text-[10px] font-black leading-none bg-white/60 dark:bg-black/40 py-0.5 rounded-sm backdrop-blur-[2px]">
                        {format(new Date(), 'h:mm a')}
                      </div>
                      <div className="flex-1 h-[1px] bg-red-500 relative">
                        <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Grid Lines */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={`line-${i}`}
                      className="absolute w-full border-t border-gray-100 dark:border-[#333]"
                      style={{ top: i * 60, height: 60 }}
                    />
                  ))}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={`dotted-${i}`}
                      className="absolute w-full border-t border-dotted border-gray-300 dark:border-[#555]"
                      style={{ top: i * 60 + 30, height: 1 }}
                    />
                  ))}

                  {/* Day Columns BG */}
                  {weekDays.map((_, i) => (
                    <div key={i} className="border-r border-gray-100 dark:border-[#333] last:border-r-0 h-full relative" />
                  ))}

                  {/* Events */}
                  {eventsForGrid.map((event) => {
                    const isShort = (event.duration || 60) <= 30;
                    return (
                      <div
                        key={event.id}
                        style={{
                          ...event.style,
                          minHeight: isShort ? '24px' : event.style.height
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (event.completed) return;
                          setActiveTaskId(event.id);
                          const { clientX, clientY } = getCoordinates(e);
                          const rect = containerRef.current?.getBoundingClientRect();
                          const x = clientX - (rect?.left || 0) - 60;
                          const y = clientY - (rect?.top || 0) + (containerRef.current?.scrollTop || 0);
                          const dayIdx = getDayIndexFromX(x, (rect?.width || 0) - 60, weekDays.length);
                          const pointerTime = getMinutesFromY(y);

                          setDragStart({
                            x,
                            y,
                            time: pointerTime,
                            dayIndex: dayIdx,
                            originalTime: event.start // Store original task start
                          });
                          setDragCurrent({
                            x,
                            y,
                            time: pointerTime,
                            dayIndex: dayIdx
                          });
                          setDragMode('move');
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (event.completed) return;
                          setActiveTaskId(event.id);
                          const { clientX, clientY } = getCoordinates(e);
                          const rect = containerRef.current?.getBoundingClientRect();
                          const x = clientX - (rect?.left || 0) - 60;
                          const y = clientY - (rect?.top || 0) + (containerRef.current?.scrollTop || 0);
                          const dayIdx = getDayIndexFromX(x, (rect?.width || 0) - 60, weekDays.length);
                          const pointerTime = getMinutesFromY(y);

                          setDragStart({
                            x,
                            y,
                            time: pointerTime,
                            dayIndex: dayIdx,
                            originalTime: event.start
                          });
                          setDragCurrent({
                            x,
                            y,
                            time: pointerTime,
                            dayIndex: dayIdx
                          });
                          setDragMode('move');
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (wasDragging.current) return;
                          setSelectedTask(event);
                        }}
                        className="absolute px-1 py-0.5 z-10 group overflow-hidden transition-all duration-200"
                      >
                        <div
                          className={`h-full w-full rounded-md border-l-4 p-1.5 text-xs cursor-pointer shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-center
                                  ${event.completed ? 'bg-gray-100 border-gray-400 text-gray-500 dark:bg-[#333] dark:border-gray-500 dark:text-gray-400' :
                              event.isPast ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-900/20 dark:border-amber-500 dark:text-amber-300' :
                                event.category?.toLowerCase() === 'work' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300' :
                                  event.category?.toLowerCase() === 'personal' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-300' :
                                    'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500 dark:text-purple-300'}
                                `}
                        >
                          {!event.completed && !event.isPast && (
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 z-20"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveTaskId(event.id);
                                const rect = containerRef.current?.getBoundingClientRect();
                                const dayIdx = rect ? getDayIndexFromX(e.clientX - rect.left - 60, rect.width - 60, weekDays.length) : 0;
                                setDragStart({ x: 0, y: 0, time: event.start, dayIndex: dayIdx });
                                setDragCurrent({ x: 0, y: 0, time: event.end, dayIndex: dayIdx });
                                setDragMode('resize');
                              }}
                            />
                          )}

                          <div className={`font-semibold truncate flex items-center gap-1 ${event.completed ? 'line-through text-gray-500' : ''}`}>
                            {event.isSpecial && <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />}
                            <span className="truncate">{event.title}</span>
                            {isShort && (
                              <span className="text-[9px] opacity-60 ml-auto font-normal whitespace-nowrap">
                                {format(parse(event.time!, 'HH:mm', new Date()), 'h:mm a')}
                              </span>
                            )}
                          </div>

                          {!isShort && (
                            <>
                              <div className="opacity-80 truncate text-[10px]">
                                {format(parse(event.time!, 'HH:mm', new Date()), 'h:mm a')} - {format(addMinutes(parse(event.time!, 'HH:mm', new Date()), event.duration || 60), 'h:mm a')}
                              </div>

                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Interaction Preview (Create, Move, Resize) */}
                  {dragMode !== 'none' && dragStart && dragCurrent && (() => {
                    let startMin = 0;
                    let endMin = 0;
                    let dayIdx = dragCurrent.dayIndex;
                    let label = "";

                    if (dragMode === 'create') {
                      startMin = Math.min(dragStart.time, dragCurrent.time);
                      endMin = Math.max(dragStart.time, dragCurrent.time);
                      // On click, show 30 min block
                      if (startMin === endMin) endMin += SNAP_MINUTES;
                      dayIdx = dragStart.dayIndex;
                    } else if (dragMode === 'move' && activeTaskId) {
                      const task = tasks.find(t => String(t.id) === String(activeTaskId) || String((t as any)._id) === String(activeTaskId));
                      const duration = task?.duration || 60;
                      const timeDiff = dragCurrent.time - dragStart.time;
                      const originalTaskStart = dragStart.originalTime || 0;
                      startMin = snapToGrid(originalTaskStart + timeDiff);
                      endMin = startMin + duration;
                      dayIdx = dragCurrent.dayIndex;
                    } else if (dragMode === 'resize' && activeTaskId) {
                      startMin = dragStart.time;
                      endMin = Math.max(startMin + SNAP_MINUTES, dragCurrent.time);
                      dayIdx = dragStart.dayIndex;
                    }

                    const formatMins = (mins: number) => {
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return format(setMinutes(setHours(new Date(), h), m), 'h:mm a');
                    };

                    label = `${formatMins(startMin)} - ${formatMins(endMin)}`;

                    return (
                      <div
                        style={{
                          top: (startMin / 60) * HOUR_HEIGHT,
                          height: ((endMin - startMin) / 60) * HOUR_HEIGHT,
                          left: `${(dayIdx / weekDays.length) * 100}%`,
                          width: `${100 / weekDays.length}%`,
                          position: 'absolute'
                        }}
                        className="bg-[#e0b596]/30 border-2 border-[#e0b596] border-dashed rounded-md z-30 pointer-events-none flex flex-col items-center justify-center"
                      >
                        <div className="bg-[#e0b596] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                          {label}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto grid grid-cols-7 auto-rows-fr bg-gray-50 dark:bg-[#1f1f1f] custom-scrollbar">
              {calendarDays.map((day, i) => {
                const dayTasks = sanitizedTasks.filter(t => isSameDay(parseTaskDate(t.date), day));
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                return (
                  <div
                    key={i}
                    className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-[#333] flex flex-col gap-1 transition-colors ${!isCurrentMonth ? 'bg-gray-100/30 dark:bg-black/10 opacity-50' : 'bg-white dark:bg-[#1f1f1f]'} ${isSameDay(day, new Date()) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-[#e0b596] text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-all hover:brightness-95 active:scale-95
                                    ${task.completed ? 'bg-gray-100 text-gray-400 dark:bg-[#333] line-through' :
                              isBefore(setMinutes(setHours(startOfDay(parseTaskDate(task.date)), parseInt(task.time?.split(':')[0] || '0')), parseInt(task.time?.split(':')[1] || '0')), subMinutes(new Date(), 1)) ?
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                task.category?.toLowerCase() === 'work' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                  task.category?.toLowerCase() === 'personal' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}
                                  `}
                          title={`${task.time} - ${task.title}`}
                        >
                          {task.time} {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div >
      ) : (
      <div className="flex flex-col h-full bg-white dark:bg-[#1f1f1f] overflow-hidden">
        {/* Mobile Date Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#333]">
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
            {weekDays.map((day, i) => (
              <button
                key={i}
                onClick={() => handleDateSelect(day)}
                className={`flex flex-col items-center min-w-[40px] gap-1 transition-all ${isSameDay(day, currentDate) ? 'scale-110' : 'opacity-60'}`}
              >
                <span className={`text-[10px] font-bold uppercase ${isSameDay(day, currentDate) ? 'text-[#e0b596]' : 'text-gray-400'}`}>
                  {format(day, 'EEE')[0]}
                </span>
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${isSameDay(day, currentDate) ? 'bg-[#e0b596] text-white shadow-md' : 'text-gray-900 dark:text-white'}`}>
                  {format(day, 'd')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-8">
            {weekDays.map((day, i) => {
              const dayTasks = tasks.filter(t => isSameDay(parseTaskDate(t.date), day));
              return (
                <div key={i} className="space-y-4">
                  <h3 className="flex items-baseline gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    {format(day, 'd MMM')}
                    <span className="text-sm font-medium text-gray-400">
                      {isToday(day) ? 'Today' : format(day, 'EEEE')}
                    </span>
                  </h3>

                  <div className="space-y-3">
                    {dayTasks.length > 0 ? (
                      dayTasks
                        .sort((a, b) => a.time!.localeCompare(b.time!))
                        .map(task => (
                          <div
                            key={task.id}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                            className={`p-4 rounded-2xl border flex items-center justify-between group transition-all active:scale-[0.98] ${task.completed ? 'bg-gray-50/50 dark:bg-[#252525]/50 border-gray-100 dark:border-gray-800' : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-[#333] shadow-sm'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-10 rounded-full ${task.completed ? 'bg-gray-300' :
                                isBefore(setMinutes(setHours(startOfDay(parseTaskDate(task.date)), parseInt(task.time?.split(':')[0] || '0')), parseInt(task.time?.split(':')[1] || '0')), subMinutes(new Date(), 1)) ?
                                  'bg-amber-500' :
                                  task.category === 'Work' ? 'bg-blue-500' : task.category === 'Personal' ? 'bg-green-500' : 'bg-purple-500'
                                }`} />
                              <div>
                                <h4 className={`font-bold ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                  {task.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {task.time ? format(parse(task.time, 'HH:mm', new Date()), 'h:mm a') : '--:--'}
                                  {task.location && ` • ${task.location}`}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </div>
                        ))
                    ) : (
                      <p className="text-sm italic text-gray-400 pl-6">No events</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Mobile FAB and Navigation */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button
            onClick={() => handleDateSelect(new Date())}
            className="px-6 py-3 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-full shadow-lg text-[#e0b596] text-sm font-bold flex items-center gap-2 active:scale-95 transition-all"
          >
            <ChevronDown className="w-4 h-4 rotate-180" />
            Today
          </button>
          <button
            onClick={() => setCreateModal({ isOpen: true, duration: 30 })}
            className="w-14 h-14 bg-gradient-to-br from-[#e0b596] to-[#dcb49a] rounded-full shadow-xl shadow-[#e0b596]/30 flex items-center justify-center text-[#1f1f1f] active:scale-90 transition-all"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </div>
      )
            )}

      {
        activeView === 'locations' && (
          <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar scroll-smooth">

          </div>
        )
      }

      {
        (activeView === 'pending' || activeView === 'completed') && (
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar scroll-smooth">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                {activeView === 'pending' ? <Clock className="w-6 h-6 text-[#e0b596]" /> : <CheckCircle className="w-6 h-6 text-green-500" />}
                {activeView} Tasks
              </h2>

              {activeView === 'completed' && (
                <div className="flex items-center gap-2">
                  {completedSearchDate && (
                    <button
                      onClick={() => setCompletedSearchDate(undefined)}
                      className="text-xs font-medium text-gray-500 hover:text-[#e0b596] transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowCompletedCalendar(!showCompletedCalendar)}
                      className={`p-2 rounded-lg transition-all ${completedSearchDate ? 'bg-[#e0b596] text-white shadow-lg shadow-[#e0b596]/30' : 'bg-white dark:bg-[#292929] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#333] hover:border-[#e0b596]'}`}
                      title="Search by date"
                    >
                      <Search className="w-5 h-5" />
                    </button>

                    {showCompletedCalendar && (
                      <div className="absolute top-full right-0 mt-2 p-2 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-lg shadow-2xl z-50">
                        <DayPicker
                          mode="single"
                          selected={completedSearchDate}
                          onSelect={(date) => {
                            setCompletedSearchDate(date);
                            setShowCompletedCalendar(false);
                          }}
                          modifiers={{
                            today: new Date()
                          }}
                          modifiersStyles={{
                            today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                            selected: { backgroundColor: '#e0b596', color: 'white' }
                          }}
                          styles={{
                            root: { color: theme === 'dark' ? '#f5f5f5' : '#1f2937', backgroundColor: theme === 'dark' ? '#292929' : '#ffffff' },
                            day: { color: theme === 'dark' ? '#e0e0e0' : '#374151' },
                            caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827' }
                          }}
                          showOutsideDays
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeView === 'pending' && (
                <div className="flex items-center gap-2">
                  {pendingSearchDate && (
                    <button
                      onClick={() => setPendingSearchDate(undefined)}
                      className="text-xs font-medium text-gray-500 hover:text-[#e0b596] transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowPendingCalendar(!showPendingCalendar)}
                      className={`p-2 rounded-lg transition-all ${pendingSearchDate ? 'bg-[#e0b596] text-white shadow-lg shadow-[#e0b596]/30' : 'bg-white dark:bg-[#292929] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#333] hover:border-[#e0b596]'}`}
                      title="Search by date"
                    >
                      <Search className="w-5 h-5" />
                    </button>

                    {showPendingCalendar && (
                      <div className="absolute top-full right-0 mt-2 p-2 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-lg shadow-2xl z-50">
                        <DayPicker
                          mode="single"
                          selected={pendingSearchDate}
                          onSelect={(date) => {
                            setPendingSearchDate(date);
                            setShowPendingCalendar(false);
                          }}
                          modifiers={{
                            today: new Date()
                          }}
                          modifiersStyles={{
                            today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                            selected: { backgroundColor: '#e0b596', color: 'white' }
                          }}
                          styles={{
                            root: { color: theme === 'dark' ? '#f5f5f5' : '#1f2937', backgroundColor: theme === 'dark' ? '#292929' : '#ffffff' },
                            day: { color: theme === 'dark' ? '#e0e0e0' : '#374151' },
                            caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827' }
                          }}
                          showOutsideDays
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-4">
              {(() => {
                const filteredTasks = sanitizedTasks
                  .filter(t => {
                    if (activeView === 'pending') {
                      if (t.completed) return false;
                      if (!pendingSearchDate) return true;
                      return isSameDay(parseISO(t.date), pendingSearchDate);
                    }

                    // Completed view
                    if (!t.completed) return false;
                    if (!completedSearchDate) return true;

                    return isSameDay(parseTaskDate(t.date), completedSearchDate);
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                return (
                  <>
                    {filteredTasks.map(task => (
                      <motion.div
                        layout
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-[#292929] px-3 py-2 rounded-xl border border-gray-200 dark:border-[#333] shadow-sm flex items-center justify-between group"
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => { if (!task.completed) onToggleComplete(task.id); }}
                            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 cursor-default' : 'border-gray-400 hover:border-[#e0b596]'}`}
                          >
                            {task.completed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>
                          <div>
                            <h3 className={`font-semibold text-lg ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                              <CalendarIcon className="w-3.5 h-3.5" /> {task.date} at {task.time}
                              {task.duration && <span className="text-xs bg-gray-100 dark:bg-black/30 px-2 py-0.5 rounded ml-2">{task.duration}m</span>}
                            </p>
                            {task.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{task.description.replace(/<!-- metadata: .*? -->/g, '').trim()}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelectedTask(task)} className="p-2 text-gray-400 hover:text-[#e0b596] hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg">
                            <Settings className="w-4 h-4" /> {/* Edit Icon placeholder really */}
                          </button>
                          <button onClick={() => onDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {filteredTasks.length === 0 && (
                      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                        <p className="text-lg">No {activeView === 'completed' ? 'completed' : 'pending'} tasks found {activeView === 'completed' && completedSearchDate ? `for ${format(completedSearchDate, 'MMMM d, yyyy')}` : activeView === 'pending' && pendingSearchDate ? `for ${format(pendingSearchDate, 'MMMM d, yyyy')}` : ''}.</p>
                        {activeView === 'completed' && completedSearchDate && (
                          <button
                            onClick={() => setCompletedSearchDate(undefined)}
                            className="mt-2 text-[#e0b596] hover:underline text-sm font-medium"
                          >
                            Show all completed tasks
                          </button>
                        )}
                        {activeView === 'pending' && pendingSearchDate && (
                          <button
                            onClick={() => setPendingSearchDate(undefined)}
                            className="mt-2 text-[#e0b596] hover:underline text-sm font-medium"
                          >
                            Show all pending tasks
                          </button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )
      }

    </div >

    {/* Specials Panel */}
    <AnimatePresence>
      {
        showSpecialsOnly && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1b1b1b] border-l border-gray-200 dark:border-[#292929] shadow-2xl z-30 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-[#292929] flex items-center justify-between bg-purple-50/30 dark:bg-purple-900/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Specials</h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {specialDateFilter ? format(specialDateFilter, 'EEEE, d MMMM') : 'All Special Tasks'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {specialDateFilter && (
                  <button
                    onClick={() => setSpecialDateFilter(undefined)}
                    className="text-[10px] font-bold text-purple-600 hover:underline mr-1"
                  >
                    Clear
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowSpecialCalendar(!showSpecialCalendar)}
                    className={`p-2 rounded-lg transition-all ${specialDateFilter ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400'}`}
                    title="Search specials by date"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {showSpecialCalendar && (
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl z-50 origin-top-right scale-[0.85]">
                      <DayPicker
                        mode="single"
                        selected={specialDateFilter}
                        onSelect={(date) => {
                          if (date) {
                            setSpecialDateFilter(date);
                            setShowSpecialCalendar(false);
                          }
                        }}
                        modifiers={{
                          today: new Date()
                        }}
                        modifiersStyles={{
                          today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                          selected: { backgroundColor: '#e0b596', color: 'white' }
                        }}
                        styles={{
                          root: {
                            color: theme === 'dark' ? '#f5f5f5' : '#1f2937',
                            backgroundColor: theme === 'dark' ? '#292929' : '#ffffff',
                            margin: 0,
                            padding: '10px'
                          },
                          day: { color: theme === 'dark' ? '#e0e0e0' : '#374151' },
                          caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827' }
                        }}
                        showOutsideDays
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowSpecialsOnly(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {(() => {
                const specials = sanitizedTasks.filter(t => t.isSpecial);
                const filtered = specialDateFilter
                  ? specials.filter(t => isSameDay(parseTaskDate(t.date), specialDateFilter))
                  : specials;

                if (filtered.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-40">
                      <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/10 rounded-3xl flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-purple-400 shadow-xl shadow-purple-500/10" />
                      </div>
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No special tasks {specialDateFilter ? 'for this day' : 'found'}.</p>
                      <p className="text-[10px] text-gray-500 mt-2">Mark tasks as special to see them highlighted here.</p>
                    </div>
                  );
                }

                // Group by date
                const groups: { [key: string]: Task[] } = {};
                filtered.forEach(t => {
                  const d = format(parseTaskDate(t.date), 'yyyy-MM-dd');
                  if (!groups[d]) groups[d] = [];
                  groups[d].push(t);
                });

                // Sort dates
                const sortedDates = Object.keys(groups).sort((a, b) => a.localeCompare(b));

                return sortedDates.map(dateKey => (
                  <div key={dateKey} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-px flex-1 bg-gray-100 dark:bg-[#292929]" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEE, d MMM')}
                      </span>
                      <div className="h-px flex-1 bg-gray-100 dark:bg-[#292929]" />
                    </div>
                    <div className="space-y-3">
                      {groups[dateKey]
                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                        .map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="px-3 py-1.5 rounded-2xl bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/50 transition-all cursor-pointer group relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                {task.time ? format(parse(task.time, 'HH:mm', new Date()), 'h:mm a') : 'All day'}
                              </span>
                              <Sparkles className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                              {task.title}
                            </h4>
                          </div>
                        ))}
                    </div>
                  </div>
                ));
              })()}
            </div>


          </motion.div>
        )
      }
    </AnimatePresence >
  </div >

  {/* Render Modals */ }
  <AnimatePresence>
{/* Mobile Sidebar Overlay */ }
{
  showSidebar && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowSidebar(false)}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
      />
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#1b1b1b] shadow-2xl p-6 lg:hidden flex flex-col border-r border-gray-200 dark:border-[#292929]"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Menu</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#292929] rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 space-y-1">
          <button
            onClick={() => { setActiveView('calendar'); setShowSidebar(false); }}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'calendar' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>



          <button
            onClick={() => { setActiveView('pending'); setShowSidebar(false); }}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'pending' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
          >
            <Hourglass className="w-5 h-5" />
            <span>Pending Tasks</span>
          </button>

          <button
            onClick={() => { setActiveView('completed'); setShowSidebar(false); }}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'completed' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
          >
            <Check className="w-5 h-5" />
            <span>Completed</span>
          </button>
        </nav>

        <div className="mt-auto border-t border-gray-100 dark:border-[#292929] pt-6 space-y-2">
          <button
            onClick={() => { toggleTheme(); }}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={() => { setShowSettings(true); setShowSidebar(false); }}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}
{
  createModal.isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl h-[85vh] flex flex-col">
        <CreateReminder
          tasks={sanitizedTasks}
          onCreateTask={(t) => {
            onAddTask(t);
            setCreateModal({ isOpen: false });
          }}
          initialDate={createModal.date}
          initialTime={createModal.time}
          initialDuration={createModal.duration}
          onClose={() => setCreateModal({ isOpen: false })}
        />
      </motion.div>
    </div>
  )
}

{
  selectedTask && (
    <TaskDetails
      task={selectedTask}
      tasks={sanitizedTasks}
      initialEditMode={openInEditMode}
      onClose={() => { setSelectedTask(null); setOpenInEditMode(false); }}
      // Pass handlers...
      onToggleComplete={onToggleComplete}
      onDeleteTask={onDeleteTask}
      onUpdateTask={onUpdateTask}
    />
  )
}

{
  showSettings && (
    <SettingsPanel
      userEmail={userEmail}
      initialName={userName}
      notificationsEnabled={notificationsEnabled}
      onNotificationChange={onToggleNotifications}
      onClose={() => setShowSettings(false)}
      onUpdateUser={onUpdateUser}
    />
  )
}
        </AnimatePresence >

  <CustomerSupportChat />
      </div >
    </div >
  );
}
