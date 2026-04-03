export interface Task {
  id: string;
  sourceId?: string; // ✅ ADD THIS
  title: string;
  description: string;
  category: string;
  date: string;
  time?: string;
  createdAt?: string;
  completed?: boolean;
  notifyAt?: string;
  notifyBefore?: number;
  // Frontend-only or metadata-mapped fields
  duration?: number; // in minutes
  location?: string;
  isAllDay?: boolean;
  isSpecial?: boolean;
  specialType?: 'birthday' | 'anniversary' | 'cultural' | 'other';
}


export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface NearbyLocation {
  id: string;
  name: string;
  category: string;
  address: string;
  distance: string;
  rating: number;
  isOpen: boolean;
}

export interface Festival {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'public' | 'religious' | 'seasonal' | 'other' | 'birthday' | 'anniversary' | 'cultural';
}
