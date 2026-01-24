
export type MediaType = 'image' | 'text' | 'notes';

export interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  children?: StickyNote[];
}

export interface AppConfig {
  apiKey: string;
  model: string;
}

export interface AppState {
  image: string | null; // base64
  text: string;
  notes: StickyNote[];
  focusObject: string; // User-specified focus for image analysis
  activeTab: MediaType;
  loading: boolean;
  status: string;
  error: string | null;
  config: AppConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  apiKey: '',
  model: 'gemini-3-flash-preview'
};

export const COLORS = [
  'bg-yellow-100',
  'bg-blue-100',
  'bg-green-100',
  'bg-pink-100',
  'bg-purple-100',
  'bg-orange-100'
];
