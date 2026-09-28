import {
  Pill,
  Briefcase,
  CreditCard,
  Dumbbell,
  ShoppingBag,
  Cake,
  Plane,
  Utensils,
  Book,
  Scissors,
  Bell
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CategoryName =
  | 'Medicine'
  | 'Meeting'
  | 'Bills'
  | 'Fitness'
  | 'Shopping'
  | 'Events'
  | 'Travel'
  | 'Food'
  | 'Study'
  | 'PersonalCare'
  | 'Default';

export interface CategoryConfig {
  id: CategoryName;
  keywords: string[];
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'Medicine',
    keywords: ['medicine', 'medicines', 'pharmacy', 'apollo', 'tablet', 'doctor', 'hospital', 'clinic', 'checkup', 'dawai'],
    icon: Pill,
    iconColor: '#3B6FE0',
    bgColor: '#E6EEFF',
  },
  {
    id: 'Meeting',
    keywords: ['meeting', 'standup', 'call', 'zoom', 'teams', 'interview', 'office', 'sync'],
    icon: Briefcase,
    iconColor: '#2E9E5B',
    bgColor: '#E3F6EA',
  },
  {
    id: 'Bills',
    keywords: ['bill', 'credit card', 'pay', 'rent', 'emi', 'electricity', 'recharge', 'hdfc', 'insurance', 'loan'],
    icon: CreditCard,
    iconColor: '#D9702B',
    bgColor: '#FDEBDD',
  },
  {
    id: 'Fitness',
    keywords: ['gym', 'workout', 'exercise', 'run', 'yoga', 'walk', 'swim', 'cricket'],
    icon: Dumbbell,
    iconColor: '#7C4DDB',
    bgColor: '#EDE5FB',
  },
  {
    id: 'Shopping',
    keywords: ['buy', 'grocery', 'groceries', 'market', 'order', 'amazon', 'store'],
    icon: ShoppingBag,
    iconColor: '#1F9DA8',
    bgColor: '#DDF4F6',
  },
  {
    id: 'Events',
    keywords: ['birthday', 'anniversary', 'party', 'wedding', 'function'],
    icon: Cake,
    iconColor: '#D6457A',
    bgColor: '#FCE3EE',
  },
  {
    id: 'Travel',
    keywords: ['flight', 'train', 'bus', 'trip', 'ticket', 'airport', 'cab'],
    icon: Plane,
    iconColor: '#2B8EDB',
    bgColor: '#E0F0FC',
  },
  {
    id: 'Food',
    keywords: ['lunch', 'dinner', 'breakfast', 'restaurant', 'cook'],
    icon: Utensils,
    iconColor: '#D99A1F',
    bgColor: '#FFF1D6',
  },
  {
    id: 'Study',
    keywords: ['exam', 'study', 'class', 'assignment', 'homework', 'course'],
    icon: Book,
    iconColor: '#4B55C9',
    bgColor: '#E5E7FB',
  },
  {
    id: 'PersonalCare',
    keywords: ['haircut', 'salon', 'spa'],
    icon: Scissors,
    iconColor: '#C2506B',
    bgColor: '#FBE4EA',
  },
  {
    id: 'Default',
    keywords: [],
    icon: Bell,
    iconColor: '#B07A4F',
    bgColor: '#F6EBDD',
  }
];

export function getCategoryForReminder(title: string, subtitle: string = ''): CategoryConfig {
  const t = title.toLowerCase();
  const s = subtitle.toLowerCase();

  let bestMatch: CategoryConfig | null = null;
  let highestScore = 0;

  for (const cat of CATEGORIES) {
    if (cat.id === 'Default') continue;
    
    let score = 0;
    for (const kw of cat.keywords) {
      // Use word boundaries, but be careful with multi-word keywords like "credit card"
      // or "apollo pharmacy". 
      // Actually, a simpler inclusion check might be safer for partial matches, but word boundary is better.
      // We will do a generic inclusion check for multi-word keywords.
      
      let matched = false;
      if (kw.includes(' ')) {
        matched = t.includes(kw);
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        matched = regex.test(t);
      }

      if (matched) {
        score += 2; // Title matches weigh more
      }
      
      let subMatched = false;
      if (kw.includes(' ')) {
        subMatched = s.includes(kw);
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        subMatched = regex.test(s);
      }

      if (subMatched) {
        score += 1;
      }
    }

    // Tie breaker: if score is same as highestScore, we keep the previous one 
    // because it appeared earlier in the array (priority order).
    if (score > highestScore) {
      highestScore = score;
      bestMatch = cat;
    }
  }

  return bestMatch || CATEGORIES.find(c => c.id === 'Default')!;
}
