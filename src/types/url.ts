export interface UrlEntry {
  id: string;
  longUrl: string;
  shortUrl: string;
  shortCode: string;
  createdAt: string;
  expiresAt: string;
  clicks: number;
  isValid: boolean;
  customShortCode?: string;
}

export interface CreateUrlRequest {
  longUrl: string;
  customShortCode?: string;
  validityMinutes?: number;
}

export interface CreateUrlResponse {
  success: boolean;
  urlEntry?: UrlEntry;
  error?: string;
}

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UrlStats {
  totalUrls: number;
  activeUrls: number;
  expiredUrls: number;
  totalClicks: number;
  averageClicksPerUrl: number;
}
