import React, { useState } from 'react';
import { Eye, Brain, MessageCircle, Zap, Shield, Heart } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const benefits = [
  {
    icon: Eye,
    title: 'Complete Clarity for Your Doctor',
    description: 'Share your full medical history upfront so your doctor sees the whole picture—nothing missed, nothing forgotten.',
    id: 'clarity'
  },
  {
    icon: Brain,
    title: 'AI-Powered Clinical Summary',
    description: 'Automatically convert reports, prescriptions, and symptoms into a concise, doctor-ready summary.',
    id: 'ai-summary'
  },
  {
    icon: MessageCircle,
    title: 'More Face Time, Less File Time',
    description: 'Spend your consultation talking, not digging through files. MedBrief helps doctors come prepared.',
    id: 'face-time'
  },
  {
    icon: Zap,
    title: 'Smarter, Faster Diagnoses',
    description: 'When doctors have all the context, they make better, quicker decisions—reducing guesswork and delays.',
    id: 'faster-diagnoses'
  },
  {
    icon: Shield,
    title: 'Fewer Errors, Safer Care',
    description: 'Avoid miscommunications and missing details that can lead to medical errors.',
    id: 'safer-care'
  },
  {
    icon: Heart,
    title: 'Peace of Mind, Every Time',
    description: 'Know your doctor has everything needed to provide the best possible care—even before you walk in.',
    id: 'peace-of-mind'
  }
];

const Benefits = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <section 
      id="benefits" 
      ref={elementRef}
      className={`section-container relative overflow-hidden transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-600 delay-100 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Why Choose MedBrief AI?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Experience the future of healthcare communication with our intelligent platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const isSelected = selectedCard === benefit.id;
            
            return (
              <div
                key={index}
                className={`group relative overflow-hidden transition-all duration-500 hover:scale-105 cursor-pointer h-full ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${200 + index * 100}ms` : '0ms'
                }}
                onClick={() => setSelectedCard(isSelected ? null : benefit.id)}
              >
                {/* Fixed height card container */}
                <div className={`
                  relative p-6 sm:p-8 rounded-3xl transition-all duration-300 h-full flex flex-col
                  ${isSelected 
                    ? 'simple-card-selected' 
                    : 'simple-card'
                  }
                `}>
                  
                  {/* Icon container */}
                  <div className="relative z-10 flex justify-center mb-6">
                    <div className={`
                      bg-gradient-to-br from-blue-500 to-teal-500 w-16 sm:w-18 h-16 sm:h-18 rounded-2xl 
                      flex items-center justify-center shadow-lg
                      group-hover:scale-110 transition-all duration-300
                      relative overflow-hidden
                      ${isSelected ? 'scale-110 shadow-blue-500/25' : ''}
                    `}>
                      <Icon className="h-8 sm:h-9 w-8 sm:w-9 text-white relative z-10" />
                      
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                  </div>

                  {/* Content - flex-grow to fill remaining space */}
                  <div className="relative z-10 text-center flex-grow flex flex-col">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 group-hover:text-gray-900 transition-colors duration-300">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base group-hover:text-gray-700 transition-colors duration-300 flex-grow">
                      {benefit.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Benefits;