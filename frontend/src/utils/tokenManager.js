// Token Management Utility
// Automatically manages JWT tokens and cleanup

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - true if expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    
    // Check if token is expired (with 5 minute buffer)
    const expirationTime = decoded.exp * 1000;
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes
    
    return now > (expirationTime - buffer);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Get token expiration date
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null if invalid
 */
export const getTokenExpiration = (token) => {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Clean up expired tokens from localStorage
 */
export const cleanupExpiredTokens = () => {
  const token = localStorage.getItem('token');
  
  if (token && isTokenExpired(token)) {
    console.log('🗑️ Cleaning up expired token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return true;
  }
  
  return false;
};

/**
 * Validate token and clean up if expired
 * @returns {boolean} - true if token is valid
 */
export const validateAndCleanupToken = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    cleanupExpiredTokens();
    return false;
  }
  
  return true;
};

/**
 * Get time until token expires (in milliseconds)
 * @returns {number} - milliseconds until expiration, or 0 if expired/invalid
 */
export const getTimeUntilExpiration = () => {
  const token = localStorage.getItem('token');
  if (!token) return 0;
  
  const expiration = getTokenExpiration(token);
  if (!expiration) return 0;
  
  const timeRemaining = expiration.getTime() - Date.now();
  return Math.max(0, timeRemaining);
};

/**
 * Format time remaining until expiration
 * @returns {string} - Human readable format
 */
export const getTokenExpirationMessage = () => {
  const timeRemaining = getTimeUntilExpiration();
  
  if (timeRemaining === 0) {
    return 'Token expired';
  }
  
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `Expires in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    return `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};

