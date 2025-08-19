import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    delay = 0
  } = options;

  const observer = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      if (delay > 0) {
        setTimeout(() => setIsVisible(true), delay);
      } else {
        setIsVisible(true);
      }
      if (triggerOnce && elementRef.current && observer.current) {
        observer.current.unobserve(elementRef.current);
      }
    } else if (!triggerOnce) {
      setIsVisible(false);
    }
  }, [delay, triggerOnce]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create observer only once
    if (!observer.current) {
      observer.current = new IntersectionObserver(handleIntersection, {
        threshold,
        rootMargin,
      });
    }

    observer.current.observe(element);

    return () => {
      if (observer.current && element) {
        observer.current.unobserve(element);
      }
    };
  }, [threshold, rootMargin, handleIntersection]);

  return { elementRef, isVisible };
};

// Improved hook for tracking active section in navigation with better scroll detection
export const useActiveSection = () => {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const sections = ['home', 'benefits', 'clinical-workflow', 'features', 'faq'];
    let observer: IntersectionObserver;
    
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Find the section with the highest intersection ratio
      let maxRatio = 0;
      let activeId = 'home';
      
      entries.forEach((entry) => {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          activeId = entry.target.id || 'home';
        }
      });
      
      // Only update if we have a significant intersection
      if (maxRatio > 0.1) {
        setActiveSection(activeId);
      }
    };

    const initializeObserver = () => {
      observer = new IntersectionObserver(handleIntersection, {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        // Reduced root margin for better detection
        rootMargin: '-80px 0px -40% 0px'
      });

      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.observe(element);
        }
      });

      // Observe hero section as home
      const heroElement = document.querySelector('section[id="home"]');
      if (heroElement) {
        observer.observe(heroElement);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(initializeObserver);
    } else {
      setTimeout(initializeObserver, 0);
    }

    // Also listen to scroll events for immediate feedback
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Account for navbar height
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observer) {
        sections.forEach((sectionId) => {
          const element = document.getElementById(sectionId);
          if (element) {
            observer.unobserve(element);
          }
        });
        observer.disconnect();
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return activeSection;
};