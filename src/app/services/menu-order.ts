import { MenuItem } from './menu.model';

// Meals carry a "sortOrder" so the site can show them in the order the printed
// menu reads rather than however Firestore happens to return them.
//
// This sorting is done here in the app rather than with a Firestore orderBy()
// on purpose: an orderBy query silently drops any document that is missing the
// field, so a meal added by hand in the Firebase console (without a sortOrder)
// would just disappear from the menu. Sorting locally keeps those items visible,
// parked at the end.
export function sortMenuItems(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
}
