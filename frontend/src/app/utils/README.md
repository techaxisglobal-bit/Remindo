# Reminder Categories

The app automatically categorizes reminders based on their title and subtitle using keyword matching. This categorization assigns an icon and color styling to the reminder card.

## How to add or modify categories

1. Open `src/app/utils/reminderCategories.ts`.
2. To add a new category:
   - Add the new category name to the `CategoryName` type union at the top.
   - Import the desired icon from `lucide-react`.
   - Add a new entry to the `CATEGORIES` array. Be sure to provide the `id`, a list of `keywords`, the imported `icon`, and your desired `iconColor` and `bgColor` (hex codes recommended).
3. The `getCategoryForReminder` utility will automatically include the new category in its scoring logic. Priority goes to title matches over subtitle matches, and ties are broken by the order in which categories appear in the `CATEGORIES` array.

Example:
```typescript
import { Plane } from 'lucide-react';

// 1. Add to CategoryName
export type CategoryName =
  | 'Medicine'
  // ...
  | 'Travel';

// 2. Add to CATEGORIES
export const CATEGORIES: CategoryConfig[] = [
  // ...
  {
    id: 'Travel',
    keywords: ['flight', 'train', 'trip', 'airport'],
    icon: Plane,
    iconColor: '#2B8EDB',
    bgColor: '#E0F0FC',
  },
];
```
