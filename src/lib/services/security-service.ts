import { SecurityStatus } from '../types';

// Helper to validate the passphrase
export function validatePassphrase(inputPassphrase: string, requiredPassphrase?: string): boolean {
  if (!requiredPassphrase) {
    return true; // No passphrase required
  }

  return inputPassphrase === requiredPassphrase;
}

// Helper to check admin access
export function validateAdminAccess(inputPassword: string): boolean {
  // In a real implementation, this would use a hashed password
  // For demo purposes, we'll use a simple comparison
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin_password_placeholder';
  return inputPassword === adminPassword;
}

// Helper to get security status based on passphrase
export function getSecurityStatus(hasPassphrase: boolean, passphraseValidated: boolean): SecurityStatus {
  if (!hasPassphrase) {
    return 'UNSECURED';
  }

  return passphraseValidated ? 'SECURED' : 'PASSPHRASE-PROTECTED';
}

// Simple in-memory session storage (for demo purposes)
const sessionStore: Record<string, { expires: number }> = {};

// Create a session for admin access
export function createAdminSession(): string {
  // Generate a random session ID
  const sessionId = Math.random().toString(36).substring(2, 15);

  // Set expiration (4 hours from now)
  const expires = Date.now() + (4 * 60 * 60 * 1000);

  // Store session
  sessionStore[sessionId] = { expires };

  // If localStorage is available (client-side), store there as well
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('adminSessionId', sessionId);
    localStorage.setItem('adminSessionExpires', expires.toString());
  }

  return sessionId;
}

// Validate an admin session
export function validateAdminSession(sessionId?: string): boolean {
  try {
    // If no session ID provided, try to get from localStorage
    if (!sessionId && typeof window !== 'undefined' && window.localStorage) {
      sessionId = localStorage.getItem('adminSessionId') || undefined;
    }

    // If still no session ID, not authenticated
    if (!sessionId) {
      return false;
    }

    // Check if session exists and is valid
    const session = sessionStore[sessionId];
    if (!session) {
      // Try to get from localStorage as a fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        const expires = localStorage.getItem('adminSessionExpires');
        if (expires && Number(expires) > Date.now()) {
          return true;
        }
      }
      return false;
    }

    // Check if session is expired
    if (session.expires < Date.now()) {
      delete sessionStore[sessionId];
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('adminSessionId');
        localStorage.removeItem('adminSessionExpires');
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating admin session:', error);
    return false;
  }
}

// Clear an admin session
export function clearAdminSession(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const sessionId = localStorage.getItem('adminSessionId');
      if (sessionId) {
        delete sessionStore[sessionId];
      }
      localStorage.removeItem('adminSessionId');
      localStorage.removeItem('adminSessionExpires');
    }
  } catch (error) {
    console.error('Error clearing admin session:', error);
  }
}
