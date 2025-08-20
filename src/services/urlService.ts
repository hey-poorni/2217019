import { UrlEntry, CreateUrlRequest, CreateUrlResponse, UrlValidationResult } from '../types/url';
import logger from '../utils/logger';

export class UrlService {
  private static instance: UrlService;
  private urlEntries: Map<string, UrlEntry> = new Map();
  private shortCodeToId: Map<string, string> = new Map();

  private constructor() {
    this.loadFromStorage();
    logger.info('URL Service initialized', { action: 'SERVICE_INIT' });
  }

  public static getInstance(): UrlService {
    if (!UrlService.instance) {
      UrlService.instance = new UrlService();
    }
    return UrlService.instance;
  }

  private loadFromStorage(): void {
    try {
      const storedUrls = localStorage.getItem('urlEntries');
      const storedMappings = localStorage.getItem('shortCodeMappings');
      
      if (storedUrls) {
        const urls = JSON.parse(storedUrls);
        urls.forEach((url: UrlEntry) => {
          this.urlEntries.set(url.id, url);
          this.shortCodeToId.set(url.shortCode, url.id);
        });
      }
      
      if (storedMappings) {
        const mappings = JSON.parse(storedMappings);
        Object.entries(mappings).forEach(([shortCode, id]) => {
          this.shortCodeToId.set(shortCode, id as string);
        });
      }
      
      logger.info('URLs loaded from storage', { 
        count: this.urlEntries.size,
        action: 'STORAGE_LOAD' 
      });
    } catch (error) {
      logger.error('Failed to load URLs from storage', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'STORAGE_LOAD' 
      });
    }
  }

  private saveToStorage(): void {
    try {
      const urls = Array.from(this.urlEntries.values());
      const mappings = Object.fromEntries(this.shortCodeToId);
      
      localStorage.setItem('urlEntries', JSON.stringify(urls));
      localStorage.setItem('shortCodeMappings', JSON.stringify(mappings));
      
      logger.debug('URLs saved to storage', { 
        count: urls.length,
        action: 'STORAGE_SAVE' 
      });
    } catch (error) {
      logger.error('Failed to save URLs to storage', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'STORAGE_SAVE' 
      });
    }
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shortCode: string;
    
    do {
      shortCode = '';
      for (let i = 0; i < 8; i++) {
        shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.shortCodeToId.has(shortCode));
    
    return shortCode;
  }

  private validateShortCode(shortCode: string): UrlValidationResult {
    if (!shortCode || shortCode.length < 3 || shortCode.length > 20) {
      return {
        isValid: false,
        error: 'Shortcode must be between 3 and 20 characters'
      };
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(shortCode)) {
      return {
        isValid: false,
        error: 'Shortcode must contain only letters and numbers'
      };
    }
    
    if (this.shortCodeToId.has(shortCode)) {
      return {
        isValid: false,
        error: 'Shortcode already exists'
      };
    }
    
    return { isValid: true };
  }

  private validateLongUrl(url: string): UrlValidationResult {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'URL must use HTTP or HTTPS protocol'
        };
      }
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }

  public createShortUrl(request: CreateUrlRequest): CreateUrlResponse {
    logger.info('Creating short URL', { 
      longUrl: request.longUrl,
      customShortCode: request.customShortCode,
      validityMinutes: request.validityMinutes,
      action: 'CREATE_URL' 
    });

    // Validate long URL
    const urlValidation = this.validateLongUrl(request.longUrl);
    if (!urlValidation.isValid) {
      logger.warn('Invalid long URL provided', { 
        longUrl: request.longUrl,
        error: urlValidation.error,
        action: 'CREATE_URL' 
      });
      return {
        success: false,
        error: urlValidation.error
      };
    }

    // Handle custom shortcode if provided
    let shortCode: string;
    if (request.customShortCode) {
      const shortCodeValidation = this.validateShortCode(request.customShortCode);
      if (!shortCodeValidation.isValid) {
        logger.warn('Invalid custom shortcode provided', { 
          customShortCode: request.customShortCode,
          error: shortCodeValidation.error,
          action: 'CREATE_URL' 
        });
        return {
          success: false,
          error: shortCodeValidation.error
        };
      }
      shortCode = request.customShortCode;
    } else {
      shortCode = this.generateShortCode();
    }

    // Set validity period (default 30 minutes as per requirements)
    const validityMinutes = request.validityMinutes || 30;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + validityMinutes * 60 * 1000);

    // Create URL entry
    const urlEntry: UrlEntry = {
      id: Date.now().toString(),
      longUrl: request.longUrl,
      shortUrl: `${window.location.origin}/${shortCode}`,
      shortCode,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      clicks: 0,
      isValid: true,
      customShortCode: request.customShortCode
    };

    // Store the URL
    this.urlEntries.set(urlEntry.id, urlEntry);
    this.shortCodeToId.set(shortCode, urlEntry.id);
    this.saveToStorage();

    logger.info('Short URL created successfully', { 
      id: urlEntry.id,
      shortCode: urlEntry.shortCode,
      action: 'CREATE_URL' 
    });

    return {
      success: true,
      urlEntry
    };
  }

  public getUrlByShortCode(shortCode: string): UrlEntry | null {
    const urlId = this.shortCodeToId.get(shortCode);
    if (!urlId) {
      logger.warn('Shortcode not found', { 
        shortCode,
        action: 'GET_URL' 
      });
      return null;
    }

    const urlEntry = this.urlEntries.get(urlId);
    if (!urlEntry) {
      logger.error('URL entry not found for shortcode', { 
        shortCode,
        urlId,
        action: 'GET_URL' 
      });
      return null;
    }

    // Check if URL is expired
    if (new Date() > new Date(urlEntry.expiresAt)) {
      urlEntry.isValid = false;
      this.urlEntries.set(urlEntry.id, urlEntry);
      this.saveToStorage();
      
      logger.info('URL expired', { 
        shortCode,
        urlId,
        action: 'GET_URL' 
      });
      return null;
    }

    return urlEntry;
  }

  public incrementClicks(shortCode: string): boolean {
    const urlEntry = this.getUrlByShortCode(shortCode);
    if (!urlEntry) {
      return false;
    }

    urlEntry.clicks++;
    this.urlEntries.set(urlEntry.id, urlEntry);
    this.saveToStorage();

    logger.info('Click count incremented', { 
      shortCode,
      clicks: urlEntry.clicks,
      action: 'INCREMENT_CLICKS' 
    });

    return true;
  }

  public getAllUrls(): UrlEntry[] {
    return Array.from(this.urlEntries.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public deleteUrl(id: string): boolean {
    const urlEntry = this.urlEntries.get(id);
    if (!urlEntry) {
      logger.warn('Attempted to delete non-existent URL', { 
        id,
        action: 'DELETE_URL' 
      });
      return false;
    }

    this.urlEntries.delete(id);
    this.shortCodeToId.delete(urlEntry.shortCode);
    this.saveToStorage();

    logger.info('URL deleted successfully', { 
      id,
      shortCode: urlEntry.shortCode,
      action: 'DELETE_URL' 
    });

    return true;
  }

  public cleanupExpiredUrls(): number {
    const now = new Date();
    const expiredUrls: string[] = [];

    this.urlEntries.forEach((urlEntry, id) => {
      if (new Date(urlEntry.expiresAt) < now) {
        expiredUrls.push(id);
        urlEntry.isValid = false;
      }
    });

    expiredUrls.forEach(id => {
      const urlEntry = this.urlEntries.get(id);
      if (urlEntry) {
        this.shortCodeToId.delete(urlEntry.shortCode);
      }
      this.urlEntries.delete(id);
    });

    if (expiredUrls.length > 0) {
      this.saveToStorage();
      logger.info('Expired URLs cleaned up', { 
        count: expiredUrls.length,
        action: 'CLEANUP_EXPIRED' 
      });
    }

    return expiredUrls.length;
  }
}

export default UrlService.getInstance();
