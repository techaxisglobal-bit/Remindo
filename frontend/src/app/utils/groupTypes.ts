import {
  Home,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Users,
  Smile,
  Plane,
  PartyPopper,
  Utensils,
  Wallet,
  Gamepad2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type GroupTypeName =
  | 'Family'
  | 'Work'
  | 'College/School'
  | 'Fitness/Sports'
  | 'Flatmates/Roommates'
  | 'Friends/Social'
  | 'Travel/Trips'
  | 'Party/Events'
  | 'Food'
  | 'Finance'
  | 'Gaming/Hobbies'
  | 'Default';

export interface GroupTypeConfig {
  id: GroupTypeName;
  keywords: string[];
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

export const GROUP_TYPES: GroupTypeConfig[] = [
  {
    id: 'Family',
    keywords: ['family', 'ghar', 'home', 'parivar', 'parents', 'mom', 'dad', 'cousins', 'relatives', 'papa', 'mummy', 'bhai', 'sister'],
    icon: Home,
    iconColor: '#B23A3A',
    bgColor: '#F8DEDF',
  },
  {
    id: 'Work',
    keywords: ['work', 'team', 'office', 'colleagues', 'company', 'project', 'client', 'staff', 'boss', 'department'],
    icon: Briefcase,
    iconColor: '#B5622B',
    bgColor: '#FBE6D3',
  },
  {
    id: 'College/School',
    keywords: ['college', 'school', 'university', 'batch', 'classmates', 'class', 'alumni', 'campus', 'study', 'hostel', 'collage'],
    icon: GraduationCap,
    iconColor: '#1F3A8A',
    bgColor: '#DCE8FB',
  },
  {
    id: 'Fitness/Sports',
    keywords: ['gym', 'fitness', 'workout', 'buddies', 'yoga', 'running', 'cricket', 'football', 'badminton', 'sports', 'trek'],
    icon: Dumbbell,
    iconColor: '#5B33C9',
    bgColor: '#E6DDFB',
  },
  {
    id: 'Flatmates/Roommates',
    keywords: ['flat', 'flatmates', 'roommates', 'pg', 'room', 'apartment', 'society', 'neighbours', 'neighbors', 'neigbours', 'nieghbors', 'neigbors'],
    icon: Users,
    iconColor: '#B5713F',
    bgColor: '#F7E8DD',
  },
  {
    id: 'Friends/Social',
    keywords: ['friends', 'gang', 'squad', 'buddies', 'yaar', 'besties', 'crew'],
    icon: Smile,
    iconColor: '#1F8A93',
    bgColor: '#DDF4F6',
  },
  {
    id: 'Travel/Trips',
    keywords: ['trip', 'travel', 'vacation', 'goa', 'tour', 'holiday', 'road trip'],
    icon: Plane,
    iconColor: '#2B8EDB',
    bgColor: '#E0F0FC',
  },
  {
    id: 'Party/Events',
    keywords: ['party', 'wedding', 'birthday', 'function', 'event', 'celebration'],
    icon: PartyPopper,
    iconColor: '#D6457A',
    bgColor: '#FCE3EE',
  },
  {
    id: 'Food',
    keywords: ['foodies', 'lunch', 'dinner', 'cooking', 'restaurant', 'chai'],
    icon: Utensils,
    iconColor: '#C98A15',
    bgColor: '#FFF1D6',
  },
  {
    id: 'Finance',
    keywords: ['split', 'expenses', 'savings', 'chit', 'money', 'investment'],
    icon: Wallet,
    iconColor: '#2E9E5B',
    bgColor: '#E3F6EA',
  },
  {
    id: 'Gaming/Hobbies',
    keywords: ['gaming', 'game', 'music', 'band', 'reading', 'movie', 'movies', 'photography'],
    icon: Gamepad2,
    iconColor: '#4B55C9',
    bgColor: '#E5E7FB',
  },
  {
    id: 'Default',
    keywords: [],
    icon: Users,
    iconColor: '#B07A4F',
    bgColor: '#F6EBDD',
  }
];

export function getGroupType(groupName: string): GroupTypeConfig {
  const t = groupName.toLowerCase();
  
  let bestMatch: GroupTypeConfig | null = null;
  let highestScore = 0;

  for (const cat of GROUP_TYPES) {
    if (cat.id === 'Default') continue;
    
    let score = 0;
    for (const kw of cat.keywords) {
      if (kw.includes(' ')) {
        if (t.includes(kw)) {
          score += 2; // Exact match for multi-word
        }
      } else {
        const exactMatch = new RegExp(`\\b${kw}\\b`, 'i');
        const substringMatch = new RegExp(kw, 'i');
        
        if (exactMatch.test(t)) {
          score += 2; // Whole word match weighs more
        } else if (substringMatch.test(t)) {
          score += 1; // Substring match weighs less
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = cat;
    }
  }

  return bestMatch || GROUP_TYPES.find(c => c.id === 'Default')!;
}
