import { memo } from 'react';
import { format } from 'date-fns';
import { Task } from '@/app/types';
import { getCategoryForReminder, CATEGORIES } from '@/app/utils/reminderCategories';
import { Check } from 'lucide-react';
import { cn } from '@/app/components/ui/utils'; // Assuming cn utility is there

interface ReminderCardProps {
  task: Task;
  onToggleComplete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
}

export const ReminderCard = memo(({ task, onToggleComplete, onClick }: ReminderCardProps) => {
  // Determine category config
  // Use stored category if available, otherwise fallback to guessing
  let catConfig = CATEGORIES.find(c => c.id === task.category);
  if (!catConfig) {
    catConfig = getCategoryForReminder(task.title, task.description);
  }

  const isCompleted = task.completed;
  const IconComponent = catConfig.icon;

  // Format time (e.g., "09:00 AM")
  let displayTime = '';
  if (task.time) {
    // Basic time parse for display
    const [h, m] = task.time.split(':');
    const date = new Date();
    date.setHours(Number(h));
    date.setMinutes(Number(m));
    displayTime = format(date, 'hh:mm a');
  } else if (task.isAllDay) {
    displayTime = 'All Day';
  }

  return (
    <div
      onClick={() => onClick && onClick(task)}
      className={cn(
        "flex items-center gap-3 w-full p-4 bg-white dark:bg-neutral-900 rounded-[20px] shadow-sm cursor-pointer transition-all border border-transparent dark:border-neutral-800",
        isCompleted && "opacity-60 grayscale-[0.2]"
      )}
      style={{
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
      }}
    >
      {/* Time Chip */}
      {displayTime && (
        <div 
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
          style={{ 
            backgroundColor: catConfig.bgColor,
            color: catConfig.iconColor 
          }}
        >
          {displayTime}
        </div>
      )}

      {/* Icon Tile */}
      <div 
        className="flex-shrink-0 w-12 h-12 rounded-[16px] flex items-center justify-center"
        style={{ backgroundColor: catConfig.bgColor }}
      >
        <IconComponent 
          size={24} 
          strokeWidth={2}
          style={{ color: catConfig.iconColor }} 
        />
      </div>

      {/* Title & Subtitle */}
      <div className="flex-1 min-w-0">
        {(() => {
          const cleanDesc = task.description ? task.description.replace(/<!-- metadata: .*? -->/g, '').trim() : '';
          return (
            <>
              <h3 className={cn(
                "text-[16px] font-bold text-gray-900 dark:text-gray-100 truncate",
                isCompleted && "line-through text-gray-500"
              )}>
                {task.title}
              </h3>
              {cleanDesc && (
                <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {cleanDesc}
                </p>
              )}
            </>
          );
        })()}
      </div>

      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.(task.id);
        }}
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none",
          isCompleted 
            ? "border-gray-400 bg-gray-400" 
            : "border-gray-300 hover:border-gray-400 bg-transparent"
        )}
      >
        {isCompleted && <Check size={14} className="text-white" strokeWidth={3} />}
      </button>
    </div>
  );
});

ReminderCard.displayName = 'ReminderCard';
