
/**
 * Simple Session Manager for Web3 Authentication
 * Provides basic session persistence using localStorage
 */

interface SessionData {
  walletAddress: string;
  timestamp: number;
}

const SESSION_KEY = 'web3_auth_session';

export class SessionManager {
  /**
   * Save session after successful authentication
   */
  saveSession(walletAddress: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const session: SessionData = {
        walletAddress: walletAddress.toLowerCase(),
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Session save error:', error);
    }
  }

  /**
   * Get current session data
   */
  getSession(): SessionData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data) as SessionData;
    } catch (error) {
      console.error('Session retrieval error:', error);
      return null;
    }
  }

  /**
   * Clear session (logout)
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Session clear error:', error);
    }
  }

  /**
   * Get the current wallet address from session
   */
  getCurrentWalletAddress(): string | null {
    const session = this.getSession();
    return session ? session.walletAddress : null;
  }

  /**
   * Check if there is a valid session in localStorage
   * Returns true if session exists (doesn't verify server-side validity)
   */
  hasValidSession(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return false;
      
      const session = JSON.parse(data) as SessionData;
      // Session exists if it has a wallet address
      return !!session.walletAddress;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
}

export const sessionManager = new SessionManager();
