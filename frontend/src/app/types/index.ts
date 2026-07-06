export interface Task {
  id: string;
  sourceId?: string; // ✅ ADD THIS
  title: string;
  description: string;
  category?: string;
  date: string;
  time?: string;
  createdAt?: string;
  completed?: boolean;
  notifyAt?: string;
  notifyBefore?: string | number;
  // Frontend-only or metadata-mapped fields
  duration?: number; // in minutes
  location?: string;
  isAllDay?: boolean;
  isSpecial?: boolean;
  specialType?: 'birthday' | 'anniversary' | 'cultural' | 'other';
  attendees?: string[] | { email: string; status: string }[];
}


export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface Festival {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'public' | 'religious' | 'seasonal' | 'other' | 'birthday' | 'anniversary' | 'cultural';
}

export interface Merchant {
  id: number;
  userId: number;
  businessName: string;
  category: string;
  location: string;
  serviceArea?: string;
  description?: string;
  website?: string;
  phone: string;
  email: string;
  logoUrl?: string;
  photoUrls?: string[];
  proofDocumentUrl?: string;
  keywords?: string[];
  topPlacementBid?: number;
  facebookUrl?: string;
  instagramUrl?: string;
  whatsappNumber?: string;
  businessHours?: any;
  deliveryAvailable?: boolean;
  onlineServiceAvailable?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
