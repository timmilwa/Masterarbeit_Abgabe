export enum ReflectionLevel {
  FUNCTIONAL = 'Funktional',
  EMOTIONAL = 'Emotional',
  SYMBOLIC = 'Symbolisch'
}

export interface Annotation {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  messageId: string;
  level: ReflectionLevel; // Store the level color context
}

export interface StagedResponse {
  id: string;
  text: string;
  draftPin: { x: number, y: number } | null;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  annotationId?: string; // Optional link to an image annotation
}

export interface ImageFile {
  data: string; // base64 string
  mimeType: string;
}

declare global {
  interface AIStudio {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}