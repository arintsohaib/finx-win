
'use client';

import { useEffect } from 'react';

/**
 * Global Zoom Prevention Component
 * 
 * Prevents all forms of zoom on user-side pages:
 * - Keyboard shortcuts (Ctrl/Cmd + Plus/Minus/0)
 * - Mouse wheel zoom (Ctrl/Cmd + Wheel)
 * - Touch gestures (pinch-to-zoom)
 * - Double-tap zoom
 * 
 * Applied at root layout level for global coverage.
 */
export function ZoomPrevention() {
  useEffect(() => {
    // Prevent keyboard zoom shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl or Cmd key
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd) {
        // Prevent Ctrl/Cmd + Plus (zoom in)
        if (e.key === '+' || e.key === '=' || e.keyCode === 187) {
          e.preventDefault();
          return false;
        }
        
        // Prevent Ctrl/Cmd + Minus (zoom out)
        if (e.key === '-' || e.key === '_' || e.keyCode === 189) {
          e.preventDefault();
          return false;
        }
        
        // Prevent Ctrl/Cmd + 0 (reset zoom)
        if (e.key === '0' || e.keyCode === 48) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Prevent mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      // Check for Ctrl or Cmd key
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd) {
        e.preventDefault();
        return false;
      }
    };

    // Prevent touch gestures zoom (pinch-to-zoom)
    const handleTouchMove = (e: TouchEvent) => {
      // If multiple touches detected, it might be a pinch gesture
      if (e.touches.length > 1) {
        e.preventDefault();
        return false;
      }
    };

    // Prevent double-tap zoom on touch devices
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      const timeSinceLastTouch = now - (window as any).lastTouchEnd;
      
      if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
        e.preventDefault();
        return false;
      }
      
      (window as any).lastTouchEnd = now;
    };

    // Prevent gesturestart, gesturechange, gestureend (Safari specific)
    const handleGesture = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add all event listeners
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Safari gesture events
    document.addEventListener('gesturestart', handleGesture, { passive: false });
    document.addEventListener('gesturechange', handleGesture, { passive: false });
    document.addEventListener('gestureend', handleGesture, { passive: false });

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
      document.removeEventListener('gestureend', handleGesture);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
