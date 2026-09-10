export interface MenuItem {
  image: string;
  name: string;
  // Georgian display name. Only used for meals added/edited through the admin
  // panel with a plain-text English name (see MainComponent/AdminComponent
  // displayName()) — the original seeded meals instead use a dotted
  // translation-key `name` (e.g. "salads.cucumberTomato") resolved against
  // public/i18n/en.json and ka.json, and ignore this field.
  nameKa?: string;
  price: number;
  description: string;
  category: string;
  // Position in the menu listing. Written on import/creation so the site can
  // show meals in menu order instead of whatever order Firestore returns.
  sortOrder?: number;
  showDescription?: boolean;
  id: string;
}
