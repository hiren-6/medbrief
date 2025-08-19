import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook that scrolls to top on route changes
 * Works with all navigation methods including direct links, menu clicks, and browser back/forward
 */
export const useScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top immediately when location changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto' // Use 'auto' for immediate scroll, 'smooth' for animated
    });

    // Fallback for browsers that don't support scrollTo options
    try {
      window.scroll(0, 0);
    } catch (error) {
      // Fallback for very old browsers
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [location.pathname, location.search, location.hash]);
};

/**
 * Utility function to scroll to top programmatically
 * Can be used in components for manual scroll-to-top functionality
 */
export const scrollToTop = (behavior: 'auto' | 'smooth' = 'smooth') => {
  try {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior
    });
  } catch (error) {
    // Fallback for browsers that don't support scrollTo options
    try {
      window.scroll(0, 0);
    } catch (fallbackError) {
      // Fallback for very old browsers
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }
};

/**
 * Hook for scroll restoration control
 * Prevents browser's automatic scroll restoration and ensures our custom behavior works
 */
export const useScrollRestoration = () => {
  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Re-enable on cleanup (when component unmounts)
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);
};