import React, { useState, useEffect } from 'react';
import { ArrowRight, Upload, Brain, Clock, ChevronLeft, ChevronRight, Shield, User } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useNavbarHeight } from '../hooks/useNavbarHeight';

const statsData = [
  {
    icon: Upload,
    value: '1000+',
    label: 'Documents Processed',
    id: 'documents'
  },
  {
    icon: Brain,
    value: '90%',
    label: 'Accuracy Rate',
    id: 'accuracy'
  },
  {
    icon: Clock,
    value: '2 min',
    label: 'Average Processing',
    id: 'processing'
  },
  {
    icon: User,
    value: '50+',
    label: 'Happy Users',
    id: 'users'
  },
  {
    icon: Brain,
    value: '24/7',
    label: 'AI Support',
    id: 'support'
  },
  {
    icon: Clock,
    value: '99%',
    label: 'Uptime',
    id: 'uptime'
  },
  {
    icon: Shield,
    value: 'HIPAA',
    label: 'Enabled',
    id: 'hipaa'
  }
];

interface HeroProps {
  onSummarizeClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onSummarizeClick }) => {
  useNavbarHeight();
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.2 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Auto-scroll functionality with performance optimization
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex >= statsData.length - 3 ? 0 : prevIndex + 1
      );
    }, 4000); // Increased interval for better performance

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex >= statsData.length - 3 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex <= 0 ? statsData.length - 3 : prevIndex - 1
    );
  };

  return (
    <section 
      id="home"
      ref={elementRef}
      className={`min-h-screen flex items-center justify-center transition-all duration-700 ease-out relative overflow-hidden ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        // Account for navbar height and its top offset so the hero/video can tuck fully underneath
        minHeight: 'calc(100dvh + var(--nav-h, 70px) - 10px)',
        marginTop: 'calc(-1 * (var(--nav-h, 70px) + var(--nav-offset, 8px)))',
        paddingTop: 'calc(var(--nav-h, 70px) + var(--nav-offset, 8px))'
      }}
    >
      {/* Video Background */}
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onCanPlay={() => setIsVideoReady(true)}
        onLoadedData={() => setIsVideoReady(true)}
        onError={() => setIsVideoReady(false)}
        onEnded={(e) => {
          // Freeze video on last frame
          const video = e.target as HTMLVideoElement;
          video.pause();
          video.currentTime = video.duration;
        }}
      >
        <source src="/Hero_banner.mp4" type="video/mp4" />
      </video>

      {/* Gradient placeholder to avoid blank/brand flash before video is ready */}
      <div
        className={`absolute inset-0 z-10 bg-gradient-to-br from-blue-50 via-teal-50 to-white transition-opacity duration-500 ${
          isVideoReady ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Removed dark overlay to keep video brightness unchanged */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-30" style={{ transform: 'translateY(-30px)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
          {/* Left Content */}
          <div className="text-center lg:text-left pt-4">

            {/* Headline + Subheading Card */}
            <div className={`inline-block max-w-2xl mx-auto lg:mx-0 mb-[30px] transition-all duration-600 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {/* Centered badge above card */}
              <div className="flex justify-center mb-2">
                <div className={`inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium relative overflow-hidden sophisticated-shimmer-box transition-all duration-500 delay-100 ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}>
                  <Brain className="h-4 w-4" />
                  <span>Hello Doctors</span>
                </div>
              </div>
              <div className="simple-card rounded-2xl px-6 py-[9px] shadow-xl relative">
                <div className="absolute right-4 top-4 w-10 h-10 bg-gradient-to-br from-blue-500/15 to-teal-500/15 rounded-full blur-md pointer-events-none"></div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 leading-tight mb-3">
                  Know Your{' '}
                  <span className="shimmer-text bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                    Patient
                  </span>{' '}
                  <br />Before Every{' '}
                  <span className="shimmer-text bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                    Consultation
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-black leading-relaxed">
                  Patients upload medical records. You get clean and concise AI-Powered clinical summaries — instantly.
                </p>
              </div>
            </div>

            {/* Optimized Horizontal Scrollable Stats Cards */}
            <div className={`relative transition-all duration-700 delay-400 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 z-30 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                aria-label="Previous stats"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 z-30 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                aria-label="Next stats"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>

              {/* Cards Container */}
              <div className="overflow-hidden mx-8 metrics-row bg-transparent">
                <div 
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${currentIndex * 33.333}%)` }}
                >
                  {statsData.map((stat, index) => {
                    const Icon = stat.icon;
                    const isSelected = selectedCard === stat.id;
                    
                    return (
                      <div
                        key={index}
                        className="flex-shrink-0 w-1/3 px-1"
                      >
                        <div 
                          className={`
                            relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] cursor-pointer
                            ${isSelected 
                              ? 'simple-card-selected' 
                              : 'simple-card'
                            }
                          `}
                          onClick={() => setSelectedCard(isSelected ? null : stat.id)}
                        >
                          <div className="bg-gradient-to-br from-blue-500 to-teal-500 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-none">
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-800 mb-1">{stat.value}</div>
                            <div className="text-xs text-gray-600">{stat.label}</div>
                          </div>

                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="flex justify-center mt-4 space-x-2">
                {Array.from({ length: statsData.length - 2 }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      currentIndex === index 
                        ? 'bg-blue-600 w-6' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <div className={`flex flex-col sm:flex-row justify-center lg:justify-center gap-4 mt-8 transition-all duration-500 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <button 
                onClick={onSummarizeClick}
                className="sophisticated-button mx-auto lg:mx-0 lg:mx-auto"
                style={{ maxWidth: 'min(100%, 320px)' }}
              >
                <div className="dots_border"></div>
                <span className="text_button flex items-center space-x-2">
                  <span>Save Your Time</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </div>
          </div>

          {/* Right Side - Empty space */}
          <div className="hidden lg:block"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
