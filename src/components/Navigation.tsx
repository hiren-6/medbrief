import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveSection } from '../hooks/useScrollAnimation';
import { scrollToTop } from '../hooks/useScrollToTop';
import { supabase } from '../supabaseClient';

interface NavigationProps {
  onLoginClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const activeSection = useActiveSection();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data.user);
    };
    checkUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkUser());
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    navigate('/');
  };

  const scrollToTopHandler = () => {
    scrollToTop('smooth');
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'home') {
      scrollToTopHandler();
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        // Calculate offset to account for fixed navbar height + minimal padding
        const navbarHeight = 70; // Fixed navbar height
        const extraPadding = 20; // Reduced padding for better readability
        const totalOffset = navbarHeight + extraPadding;
        
        const elementPosition = element.offsetTop - totalOffset;
        
        window.scrollTo({
          top: Math.max(0, elementPosition),
          behavior: 'smooth'
        });
      }
    }
    setIsMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'clinical-workflow', label: 'AI Process' },
    { id: 'features', label: 'Features' }
  ];

  return (
    <nav id="global-navbar" className="fixed top-2 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[84%] mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-lg border border-gray-200">
          <div className="flex items-center h-14 px-4 sm:px-6 lg:px-8">
            {/* Logo - Left end */}
            <button 
              onClick={scrollToTopHandler}
              className="group hover:scale-105 transition-transform duration-200 transform translate-y-[5px] flex-shrink-0 py-1 leading-none"
              aria-label="MedBrief Home"
            >
              <div className="w-32 h-12 sm:w-36 sm:h-12 lg:w-40 lg:h-12 rounded-xl overflow-hidden flex items-center justify-center">
                <img 
                  src="/Picture3.svg" 
                  alt="MedBrief AI Logo" 
                  className="w-full h-full object-contain object-center"
                />
              </div>
            </button>

            {/* Centered Navigation Items */}
            <div className="hidden md:flex flex-1 justify-center">
              <div className="flex items-center space-x-4 lg:space-x-6">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative transition-colors duration-300 ease-out py-2 font-medium text-sm lg:text-base whitespace-nowrap ${
                        isActive
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                      style={{ willChange: 'color' }}
                    >
                      {item.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animated-underline"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
              
            {/* Beta tag + Login button - Right end (Desktop) */}
            <span 
              className="hidden md:inline-flex items-center mr-3 rounded-full border border-blue-200/70 bg-white/70 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold tracking-wider text-blue-700 shadow-sm"
              title="Beta version"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 mr-2" />
              BETA
            </span>
            <button 
              onClick={() => navigate('/login')}
              className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 lg:px-5 py-2 rounded-xl hover:from-blue-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 font-medium text-sm lg:text-base flex-shrink-0"
            >
              <User className="h-4 w-4" />
              <span>Login</span>
            </button>

            {/* Mobile menu button - Right end (Mobile) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-700 hover:text-blue-600 transition-colors duration-200 p-2 rounded-xl hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm rounded-b-[2rem]">
              <div className="px-4 sm:px-6 pt-4 pb-6 space-y-3">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative block w-full text-left px-4 py-3 rounded-xl transition-colors duration-300 font-medium ${
                        isActive
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="inline-block">{item.label}</span>
                      {isActive && (
                        <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
                <div className="pt-2">
                  <span 
                    className="inline-flex items-center mb-2 rounded-full border border-blue-200/70 bg-white/70 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold tracking-wider text-blue-700 shadow-sm"
                    title="Beta version"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 mr-2" />
                    BETA
                  </span>
                  <button 
                    onClick={() => navigate('/login')}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
