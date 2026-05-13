import { Task } from '@/app/types';

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


