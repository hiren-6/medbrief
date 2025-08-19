import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Hero from '../components/Hero';
import LazySection from '../components/LazySection';
import { supabase } from '../supabaseClient';
import { useScrollToTop } from '../hooks/useScrollToTop';

// Lazy load components for better performance
const Benefits = lazy(() => import('../components/Benefits'));
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const Features = lazy(() => import('../components/Features'));
const FAQ = lazy(() => import('../components/FAQ'));
const Footer = lazy(() => import('../components/Footer'));
const ContactSupport = lazy(() => import('../components/ContactSupport'));

// Loading fallback component
const SectionLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex space-x-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  // Scroll to top on page load
  useScrollToTop();
  
  const navigate = useNavigate();
  const [showContactSupport, setShowContactSupport] = useState(false);

  const handleShowLogin = () => {
    navigate('/login');
  };

  const handleShowSignup = () => {
    navigate('/signup');
  };

  const handleShowPrivacyPolicy = () => {
    navigate('/privacy-policy');
  };

  const handleShowTermsOfService = () => {
    navigate('/terms-of-service');
  };

  const handleShowCookiePolicy = () => {
    navigate('/cookie-policy');
  };

  const handleShowContactSupport = () => {
    setShowContactSupport(true);
  };

  const handleCloseContactSupport = () => {
    setShowContactSupport(false);
  };

  return (
    <div className="home-page min-h-screen">
      <Navigation onLoginClick={handleShowLogin} />
      <Hero onSummarizeClick={handleShowSignup} />
      
      <LazySection fallback={<SectionLoader />}>
        <Benefits />
      </LazySection>
      
      <LazySection fallback={<SectionLoader />}>
        <HowItWorks onGetStartedClick={handleShowLogin} />
      </LazySection>

      <LazySection fallback={<SectionLoader />}>
        <Features />
      </LazySection>
      
      <LazySection fallback={<SectionLoader />}>
        <FAQ onContactSupportClick={handleShowContactSupport} />
      </LazySection>
      
      <LazySection fallback={<SectionLoader />}>
        <Footer 
          onPrivacyClick={handleShowPrivacyPolicy}
          onTermsClick={handleShowTermsOfService}
          onCookieClick={handleShowCookiePolicy}
        />
      </LazySection>
      
      <Suspense fallback={null}>
        <ContactSupport 
          isOpen={showContactSupport} 
          onClose={handleCloseContactSupport} 
        />
      </Suspense>
    </div>
  );
};

export default HomePage;