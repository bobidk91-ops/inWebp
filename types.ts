export interface AiData {
  title: string;
  alt_text: string;
  description: string;
  price_guess: string;
}

export interface FileInfo {
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
}

export interface AppFile {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  info: FileInfo;
  aiData: AiData | null;
}

export interface ProcessingOptions {
  quality: number;
  maxWidth: number;
  format: string; // 'image/webp' | 'image/jpeg'
  cropTo43: boolean;
}

// Minimal definition for Telegram WebApp to avoid compilation errors
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        enableClosingConfirmation: () => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        showAlert: (message: string) => void;
        HapticFeedback: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        };
      };
    };
  }
}