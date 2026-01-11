// Centralized configuration for wedding app
// This ensures consistency across RSVP and Admin interfaces

export const MEAL_OPTIONS = [
  { value: 'Chicken', label: 'Herb Crusted Chicken', description: 'with Boursin Cheese Sauce', emoji: '🐔', recommended: true },
  { value: 'Beef', label: 'Grilled NY Strip Steak', description: 'with Wild Mushrooms & Bourbon Glaze', emoji: '🥩', recommended: false },
  { value: 'Vegetarian', label: 'Vegan/Vegetarian', description: 'Please specify in dietary restrictions', emoji: '🥗', recommended: false },
] as const;

export const KIDS_MEAL = {
  value: 'Kids Meal',
  label: 'Kids Meal',
  description: 'Crisp Herb-Encrusted Chicken Fillets with Golden Pommes Frites and a Savory Tomato Reduction (chicken tenders and fries)',
  emoji: '🍟',
} as const;

export type MealValue = typeof MEAL_OPTIONS[number]['value'] | typeof KIDS_MEAL['value'];

// Helper to get meal display info
export function getMealInfo(value: string | null | undefined) {
  if (!value) return null;
  if (value === KIDS_MEAL.value) return KIDS_MEAL;
  return MEAL_OPTIONS.find(m => m.value === value) ?? null;
}

// Helper to get meal description for emails
export function getMealDescription(value: string | null | undefined): string {
  const meal = getMealInfo(value);
  if (!meal) return value || 'Not selected';
  return meal.label + (meal.description ? ` ${meal.description}` : '');
}

// Title options
export const TITLE_OPTIONS = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Mx.'] as const;

// Suffix options  
export const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'] as const;

// RSVP Status options
export const RSVP_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: 'gray' },
  { value: 'YES', label: 'Attending', color: 'green' },
  { value: 'NO', label: 'Not Attending', color: 'red' },
] as const;

// Guest Of options
export const GUEST_OF_OPTIONS = [
  { value: 'RYAN', label: 'Ryan' },
  { value: 'MARSHA', label: 'Marsha' },
] as const;
