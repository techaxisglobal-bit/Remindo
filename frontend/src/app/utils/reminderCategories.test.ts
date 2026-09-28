import { describe, it, expect } from 'vitest';
import { getCategoryForReminder } from './reminderCategories';

describe('getCategoryForReminder', () => {
  it('detects Medicine category from title and subtitle', () => {
    const result = getCategoryForReminder('Buy Medicines', 'Apollo Pharmacy');
    expect(result.id).toBe('Medicine');
  });

  it('detects Meeting category from title and subtitle', () => {
    const result = getCategoryForReminder('Team Meeting', 'Online');
    expect(result.id).toBe('Meeting');
  });

  it('detects Bills category from multi-word match', () => {
    const result = getCategoryForReminder('Pay Credit Card Bill', 'HDFC Bank');
    expect(result.id).toBe('Bills');
  });

  it('detects Fitness category', () => {
    const result = getCategoryForReminder('Gym Workout', 'At Club Fitness');
    expect(result.id).toBe('Fitness');
  });

  it('falls back to Default category when no keywords match', () => {
    const result = getCategoryForReminder('Do something random', 'Unknown place');
    expect(result.id).toBe('Default');
  });

  it('prioritizes title match over subtitle match', () => {
    // 'Gym' is Fitness (score 2 in title). 'lunch' is Food (score 1 in subtitle).
    const result = getCategoryForReminder('Gym', 'Grab lunch after');
    expect(result.id).toBe('Fitness');
  });

  it('prioritizes category earlier in the list on tie', () => {
    // Both 'medicine' (Medicine) and 'meeting' (Meeting) in title. 
    // Medicine is before Meeting in the list.
    const result = getCategoryForReminder('Medicine meeting', '');
    expect(result.id).toBe('Medicine');
  });
});
