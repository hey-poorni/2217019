import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import urlService from '../services/urlService';
import logger from '../utils/logger';

const UrlRedirect: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shortCode) {
      setError('Invalid shortcode');
      setIsLoading(false);
      return;
    }

    logger.info('Processing URL redirect', { 
      shortCode,
      action: 'URL_REDIRECT' 
    });

    // Get the URL entry
    const urlEntry = urlService.getUrlByShortCode(shortCode);
    
    if (!urlEntry) {
      logger.warn('URL not found or expired', { 
        shortCode,
        action: 'URL_REDIRECT' 
      });
      setError('URL not found or has expired');
      setIsLoading(false);
      return;
    }

    // Increment click count
    urlService.incrementClicks(shortCode);

    // Redirect to the original URL
    logger.info('Redirecting to original URL', { 
      shortCode,
      longUrl: urlEntry.longUrl,
      action: 'URL_REDIRECT' 
    });

    // Small delay to show loading state
    setTimeout(() => {
      window.location.href = urlEntry.longUrl;
    }, 1000);

  }, [shortCode, navigate]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>
            Redirecting...
          </h2>
          <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
            You will be redirected to your destination shortly.
          </p>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '20px' }}>
            Error
          </h2>
          <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default UrlRedirect;
