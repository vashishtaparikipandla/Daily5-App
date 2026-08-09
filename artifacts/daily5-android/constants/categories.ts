import type { CategoryId } from '@/lib/data';

export const CATEGORIES: { id: CategoryId; label: string; icon: string; color: string }[] = [
  { id: 'food',     label: 'Food',     icon: 'restaurant',               color: '#E8A84E' },
  { id: 'travel',   label: 'Travel',   icon: 'airplane',                 color: '#4EA8E8' },
  { id: 'people',   label: 'People',   icon: 'people',                   color: '#E84E98' },
  { id: 'work',     label: 'Work',     icon: 'briefcase',                color: '#8B4EE8' },
  { id: 'health',   label: 'Health',   icon: 'heart',                    color: '#4EC87A' },
  { id: 'learning', label: 'Learning', icon: 'book',                     color: '#4E8BE8' },
  { id: 'home',     label: 'Home',     icon: 'home',                     color: '#C87A4E' },
  { id: 'love',     label: 'Love',     icon: 'heart-circle',             color: '#E84E4E' },
  { id: 'other',    label: 'Other',    icon: 'ellipsis-horizontal-circle', color: '#9A9A9A' },
];

export function getCategoryById(id: CategoryId | undefined) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[8];
}
