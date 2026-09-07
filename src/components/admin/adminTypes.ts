import { TransitCar } from '../../types';

export interface FormImageItem {
  id: string;
  url: string;
  file?: File;
  isBlob: boolean;
  originalSize?: number;
  compressedSize?: number;
  isCompressed?: boolean;
  isCompressing?: boolean;
  mimeType?: string;
  savedPercent?: number;
}

export interface SaveProgressState {
  step: 'idle' | 'compressing' | 'uploading' | 'saving_db' | 'done';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export interface ConnectionStatusState {
  tested: boolean;
  dbConnected: boolean;
  storageConnected: boolean;
  dbError?: string;
  storageError?: string;
}

export const DEFAULT_STANDARD_FEATURES = [
  'Kondisioner',
  'Yüngül lehimli disklər',
  'ABS / ESP təhlükəsizlik',
  'Lyuk',
  'Yağış sensoru',
  'Mərkəzi qapanma',
  'Park radarı',
  'Avtopilot (Kruiz-kontrol)',
  'Dəri salon',
  'Ksenon lampalar',
  'Arxa görüntü kamerası',
  'Yan pərdələr',
  'Oturacaqların isidilməsi',
  'Oturacaqların ventilyasiyası',
  'Bort kompyuter',
  'Elektrikli şüşəqaldıranlar',
  'Duman əleyhinə işıqlar',
  'Hidravlik sükan',
  'Yan sürüşən qapı'
];
