import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import urlService from './services/urlService';
import logger from './utils/logger';
import { UrlEntry, CreateUrlRequest } from './types/url';
import UrlRedirect from './components/UrlRedirect';

const App: React.FC = () => {
  const [longUrl, setLongUrl] = useState<string>('');
  const [customShortCode, setCustomShortCode] = useState<string>('');
  const [validityMinutes, setValidityMinutes] = useState<number>(30);
  const [urlHistory, setUrlHistory] = useState<UrlEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'shortener' | 'statistics'>('shortener');

  // Load URL history on component mount
  useEffect(() => {
    loadUrlHistory();
    // Clean up expired URLs every minute
    const interval = setInterval(() => {
      const cleanedCount = urlService.cleanupExpiredUrls();
      if (cleanedCount > 0) {
        loadUrlHistory();
        logger.info(`Cleaned up ${cleanedCount} expired URLs`, { action: 'CLEANUP' });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadUrlHistory = (): void => {
    const urls = urlService.getAllUrls();
    setUrlHistory(urls);
    logger.debug('URL history loaded', { count: urls.length, action: 'LOAD_HISTORY' });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!longUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    
    try {
      const request: CreateUrlRequest = {
        longUrl: longUrl.trim(),
        customShortCode: customShortCode.trim() || undefined,
        validityMinutes: validityMinutes
      };

      const response = await urlService.createShortUrl(request);
      
      if (response.success && response.urlEntry) {
        setSuccess('URL shortened successfully!');
        setLongUrl('');
        setCustomShortCode('');
        setValidityMinutes(30);
        setShowAdvanced(false);
        loadUrlHistory();
        
        logger.info('URL shortened successfully', { 
          id: response.urlEntry.id,
          shortCode: response.urlEntry.shortCode,
          action: 'CREATE_URL_SUCCESS' 
        });
      } else {
        setError(response.error || 'Failed to create short URL');
        logger.error('Failed to create short URL', { 
          error: response.error,
          action: 'CREATE_URL_FAILED' 
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      logger.error('Exception during URL creation', { 
        error: errorMessage,
        action: 'CREATE_URL_EXCEPTION' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('URL copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
      
      logger.info('URL copied to clipboard', { 
        url: text,
        action: 'COPY_URL' 
      });
    } catch (error) {
      setError('Failed to copy URL');
      logger.error('Failed to copy URL to clipboard', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'COPY_URL_FAILED' 
      });
    }
  };

  const deleteUrl = (id: string): void => {
    if (urlService.deleteUrl(id)) {
      loadUrlHistory();
      setSuccess('URL deleted successfully!');
      setTimeout(() => setSuccess(''), 2000);
      
      logger.info('URL deleted', { id, action: 'DELETE_URL' });
    } else {
      setError('Failed to delete URL');
      logger.error('Failed to delete URL', { id, action: 'DELETE_URL_FAILED' });
    }
  };

  const formatExpiryTime = (expiresAt: string): string => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return 'Expired';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffMins < 1440) return `${Math.ceil(diffMins / 60)} hours`;
    return `${Math.ceil(diffMins / 1440)} days`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const clearLogs = (): void => {
    logger.clearLogs();
    setSuccess('Logs cleared successfully!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const exportLogs = (): void => {
    const logsData = logger.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-shortener-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('Logs exported successfully!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const renderShortenerPage = () => (
    <main className="App-main">
      <form onSubmit={handleSubmit} className="url-form">
        <div className="input-group">
          <input
            type="url"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="Paste your long URL here..."
            className="url-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="shorten-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Shorten'}
          </button>
        </div>

        <div className="advanced-options">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="advanced-toggle"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
          
          {showAdvanced && (
            <div className="advanced-fields">
              <div className="field-group">
                <label htmlFor="customShortCode">Custom Shortcode (optional):</label>
                <input
                  id="customShortCode"
                  type="text"
                  value={customShortCode}
                  onChange={(e) => setCustomShortCode(e.target.value)}
                  placeholder="e.g., mylink123"
                  className="custom-input"
                  maxLength={20}
                />
                <small>3-20 characters, letters and numbers only</small>
              </div>
              
              <div className="field-group">
                <label htmlFor="validityMinutes">Validity Period (minutes):</label>
                <input
                  id="validityMinutes"
                  type="number"
                  value={validityMinutes}
                  onChange={(e) => setValidityMinutes(Number(e.target.value))}
                  min="1"
                  max="10080"
                  className="validity-input"
                />
                <small>Default: 30 minutes (max: 1 week)</small>
              </div>
            </div>
          )}
        </div>
        
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
      </form>

      {urlHistory.length > 0 && (
        <section className="history-section">
          <h2>Your URLs</h2>
          <div className="url-list">
            {urlHistory.map((url) => (
              <div key={url.id} className={`url-item ${!url.isValid ? 'expired' : ''}`}>
                <div className="url-info">
                  <div className="url-details">
                    <a
                      href={url.longUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="long-url"
                    >
                      {url.longUrl}
                    </a>
                    <div className="short-url-info">
                      <span className="short-url">{url.shortUrl}</span>
                      <div className="url-meta">
                        <span className="clicks">Clicks: {url.clicks}</span>
                        <span className="expiry">Expires: {formatExpiryTime(url.expiresAt)}</span>
                        {url.customShortCode && (
                          <span className="custom-code">Custom: {url.customShortCode}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="url-actions">
                    <button
                      onClick={() => copyToClipboard(url.shortUrl)}
                      className="action-btn copy-btn"
                      title="Copy URL"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => deleteUrl(url.id)}
                      className="action-btn delete-btn"
                      title="Delete URL"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );

  const renderStatisticsPage = () => (
    <main className="App-main">
      <section className="statistics-section">
        <h2>URL Shortener Statistics</h2>
        
        <div className="stats-overview">
          <div className="stat-card">
            <h3>Total URLs</h3>
            <p className="stat-number">{urlHistory.length}</p>
          </div>
          <div className="stat-card">
            <h3>Active URLs</h3>
            <p className="stat-number">{urlHistory.filter(url => url.isValid).length}</p>
          </div>
          <div className="stat-card">
            <h3>Total Clicks</h3>
            <p className="stat-number">{urlHistory.reduce((sum, url) => sum + url.clicks, 0)}</p>
          </div>
        </div>

        <div className="logs-section">
          <div className="logs-header">
            <h3>Application Logs</h3>
            <div className="logs-actions">
              <button onClick={clearLogs} className="action-btn clear-btn">
                Clear Logs
              </button>
              <button onClick={exportLogs} className="action-btn export-btn">
                Export Logs
              </button>
            </div>
          </div>
          
          <div className="logs-container">
            {logger.displayLogsInUI().map((log, index) => (
              <div key={index} className={`log-entry log-${log.level.toLowerCase()}`}>
                <div className="log-header">
                  <span className="log-level">{log.level}</span>
                  <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                  {log.action && <span className="log-action">{log.action}</span>}
                </div>
                <div className="log-message">{log.message}</div>
                {log.data && (
                  <div className="log-data">
                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>🔗 URL Shortener</h1>
          <p>Make your long links short and easy to share</p>
          
          <nav className="main-nav">
            <button
              onClick={() => setCurrentView('shortener')}
              className={`nav-btn ${currentView === 'shortener' ? 'active' : ''}`}
            >
              URL Shortener
            </button>
            <button
              onClick={() => setCurrentView('statistics')}
              className={`nav-btn ${currentView === 'statistics' ? 'active' : ''}`}
            >
              Statistics
            </button>
          </nav>
        </header>

        <Routes>
          <Route path="/:shortCode" element={<UrlRedirect />} />
          <Route path="/" element={
            currentView === 'shortener' ? renderShortenerPage() : renderStatisticsPage()
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
