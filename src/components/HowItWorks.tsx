import React, { useState } from 'react';
import { Upload, MessageSquare, FileCheck, ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const steps = [
  {
    icon: Upload,
    title: 'Upload Medical Documents',
    description: 'Share reports, prescriptions, lab results, and discharge summaries in a few clicks.',
    id: 'upload'
  },
  {
    icon: MessageSquare,
    title: 'Describe Symptoms & Concerns',
    description: 'Tell us what patient is experiencing—pain, discomfort, past diagnoses, anything the doctor should know.',
    id: 'describe'
  },
  {
    icon: FileCheck,
    title: 'Get a Smart Doctor-Ready Summary',
    description: 'Our AI analyzes everything and prepares a clean, organized clinical summary for you to review before your appointment.',
    id: 'summary'
  }
];

interface HowItWorksProps {
  onGetStartedClick: () => void;
}

const HowItWorks: React.FC<HowItWorksProps> = ({ onGetStartedClick }) => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <section 
      id="clinical-workflow" 
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Clinical Workflow
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Three simple steps to transform your medical information into doctor-ready summaries
          </p>
        </div>

        <div className="relative pb-8">
          {/* Desktop Arrow Connectors */}
          <div className={`hidden lg:block absolute top-1/2 left-1/4 w-1/2 h-0.5 bg-gradient-to-r from-blue-300 to-teal-300 transform -translate-y-1/2 transition-all duration-700 delay-400 ${
            isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          }`}>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-teal-400 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isSelected = selectedCard === step.id;

              return (
                <div key={index} className="relative h-full">
                  {/* Mobile Arrow */}
                  {index < steps.length - 1 && (
                    <div className={`lg:hidden flex justify-center mt-6 sm:mt-8 mb-6 sm:mb-8 transition-all duration-400 delay-${600 + index * 200} ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                    }`}>
                      <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div 
                    className={`group relative overflow-visible transition-all duration-500 hover:scale-105 cursor-pointer h-full ${
                      isVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-8'
                    }`}
                    style={{
                      transitionDelay: isVisible ? `${200 + index * 200}ms` : '0ms'
                    }}
                    onClick={() => setSelectedCard(isSelected ? null : step.id)}
                  >
                    {/* Step Number - Centered above card */}
                    <div className="flex justify-center mb-4">
                      <div className={`bg-gradient-to-r from-blue-500 to-teal-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                        isSelected ? 'scale-110 shadow-blue-500/25' : ''
                      } transition-all duration-300`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Fixed height card container */}
                    <div className={`
                      relative p-6 sm:p-8 rounded-3xl transition-all duration-300 h-full flex flex-col
                      ${isSelected 
                        ? 'simple-card-selected' 
                        : 'simple-card'
                      }
                    `}>
                      
                      <div className={`
                        bg-gradient-to-br from-blue-500 to-teal-500 w-14 sm:w-16 h-14 sm:h-16 rounded-2xl 
                        flex items-center justify-center mb-6 mx-auto shadow-lg
                        group-hover:scale-110 transition-all duration-300
                        ${isSelected ? 'scale-110 shadow-blue-500/25' : ''}
                      `}>
                        <Icon className="h-7 sm:h-8 w-7 sm:w-8 text-white" />
                        
                        {/* Inner glow */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"></div>
                      </div>

                      {/* Content - flex-grow to fill remaining space */}
                      <div className="text-center flex-grow flex flex-col">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 group-hover:text-gray-900 transition-colors duration-300">
                          {step.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm sm:text-base group-hover:text-gray-700 transition-colors duration-300 flex-grow">
                          {step.description}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section with sophisticated button - Centered */}
        <div className={`flex justify-center mt-12 sm:mt-16 transition-all duration-600 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <button 
            onClick={onGetStartedClick}
            className="sophisticated-button"
          >
            <div className="dots_border"></div>
            <span className="text_button flex items-center space-x-2">
              <span>Summarize Now</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;