import { Task, NearbyLocation } from '@/app/types';

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Buy Medicine',
    description: 'Purchase aspirin and vitamin D supplements',
    date: '2026-01-22',
    time: '14:30',
    completed: false,
    category: 'medicine',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: '2',
    title: 'Grocery Shopping',
    description: 'Buy vegetables, fruits, and milk',
    date: '2026-01-23',
    time: '10:00',
    completed: false,
    category: 'groceries',
    createdAt: '2026-01-21T14:00:00Z',
  },
  {
    id: '3',
    title: 'Doctor Appointment',
    description: 'Annual checkup at City Hospital',
    date: '2026-01-24',
    time: '09:00',
    completed: false,
    category: 'medical',
    createdAt: '2026-01-19T08:00:00Z',
  },
];

export const quickAddSuggestions: Task[] = [
  {
    id: 'q1',
    title: 'Morning Medication',
    description: 'Take daily vitamins',
    date: '',
    time: '08:00',
    completed: false,
    category: 'medicine',
    createdAt: '',
  },
  {
    id: 'q2',
    title: 'Grocery Shopping',
    description: 'Weekly grocery shopping',
    date: '',
    time: '10:00',
    completed: false,
    category: 'groceries',
    createdAt: '',
  },
  {
    id: 'q3',
    title: 'Evening Walk',
    description: '30 minutes walk',
    date: '',
    time: '18:00',
    completed: false,
    category: 'fitness',
    createdAt: '',
  },
];

export const getNearbyLocations = (category: string): NearbyLocation[] => {
  const locationMap: Record<string, NearbyLocation[]> = {
    medicine: [
      {
        id: 'l1',
        name: 'Apollo Pharmacy',
        category: 'Pharmacy',
        address: '123 Main Street, Downtown',
        distance: '0.5 km',
        rating: 4.5,
        isOpen: true,
      },
      {
        id: 'l2',
        name: 'MedPlus',
        category: 'Pharmacy',
        address: '456 Park Avenue',
        distance: '1.2 km',
        rating: 4.3,
        isOpen: true,
      },
      {
        id: 'l3',
        name: 'HealthCare Pharmacy',
        category: 'Pharmacy',
        address: '789 Oak Road',
        distance: '2.0 km',
        rating: 4.7,
        isOpen: false,
      },
    ],
    groceries: [
      {
        id: 'l4',
        name: 'Fresh Mart',
        category: 'Supermarket',
        address: '321 Market Street',
        distance: '0.8 km',
        rating: 4.4,
        isOpen: true,
      },
      {
        id: 'l5',
        name: 'Big Bazaar',
        category: 'Hypermarket',
        address: '654 Shopping Complex',
        distance: '1.5 km',
        rating: 4.2,
        isOpen: true,
      },
      {
        id: 'l6',
        name: 'Organic Store',
        category: 'Grocery Store',
        address: '987 Green Lane',
        distance: '3.0 km',
        rating: 4.8,
        isOpen: true,
      },
    ],
    medical: [
      {
        id: 'l7',
        name: 'City Hospital',
        category: 'Hospital',
        address: '147 Health Avenue',
        distance: '2.5 km',
        rating: 4.6,
        isOpen: true,
      },
      {
        id: 'l8',
        name: 'Care Clinic',
        category: 'Clinic',
        address: '258 Medical Plaza',
        distance: '1.0 km',
        rating: 4.5,
        isOpen: true,
      },
    ],
    default: [
      {
        id: 'l9',
        name: 'General Store',
        category: 'Store',
        address: '369 Central Road',
        distance: '0.7 km',
        rating: 4.0,
        isOpen: true,
      },
    ],
  };

  return locationMap[category] || locationMap.default;
};

export const detectCategory = (taskDescription: string): string => {
  const text = taskDescription.toLowerCase();
  
  if (text.includes('medicine') || text.includes('pill') || text.includes('drug') || 
      text.includes('pharmacy') || text.includes('prescription') || text.includes('vitamin')) {
    return 'medicine';
  }
  
  if (text.includes('grocery') || text.includes('vegetables') || text.includes('fruits') || 
      text.includes('milk') || text.includes('shopping') || text.includes('food')) {
    return 'groceries';
  }
  
  if (text.includes('doctor') || text.includes('hospital') || text.includes('clinic') || 
      text.includes('checkup') || text.includes('appointment')) {
    return 'medical';
  }
  
  if (text.includes('gym') || text.includes('exercise') || text.includes('workout') || 
      text.includes('run') || text.includes('walk')) {
    return 'fitness';
  }
  
  return 'general';
};
