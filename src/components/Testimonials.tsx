import React, { useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const testimonials = [
  {
    name: 'Dr. Ravi Mehta',
    role: 'Cardiologist',
    location: 'Mumbai',
    content: 'With MedBrief, I start every consultation fully informed. It\'s like having a pre-clinic assistant that never misses a detail.',
    rating: 5,
    avatar: '👨‍⚕️',
    id: 'dr-ravi'
  },
  {
    name: 'Asha Patel',
    role: 'Patient',
    location: 'Delhi',
    content: 'I didn\'t have to explain my entire medical history again. The doctor already knew everything. It saved so much time and stress.',
    rating: 5,
    avatar: '👩',
    id: 'asha'
  },
  {
    name: 'Dr. Neha Kapoor',
    role: 'Endocrinologist',
    location: 'Bangalore',
    content: 'The AI summaries are surprisingly accurate. I can now focus more on listening and less on paperwork.',
    rating: 5,
    avatar: '👩‍⚕️',
    id: 'dr-neha'
  },
  {
    name: 'Anuj Sharma',
    role: 'Caregiver',
    location: 'Pune',
    content: 'Managing my father\'s reports was overwhelming—until MedBrief. It organized everything into a simple, shareable summary.',
    rating: 5,
    avatar: '👨',
    id: 'anuj'
  }
];

const Testimonials = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <section 
      id="testimonials" 
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
            What Our Users Say
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Trusted by doctors and patients across India
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pb-8">
          {testimonials.map((testimonial, index) => {
            const isSelected = selectedCard === testimonial.id;
            
            return (
              <div
                key={index}
                className={`group relative overflow-hidden transition-all duration-500 hover:scale-105 cursor-pointer ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${200 + index * 150}ms` : '0ms'
                }}
                onClick={() => setSelectedCard(isSelected ? null : testimonial.id)}
              >
                {/* Simple card */}
                <div className={`
                  relative p-6 sm:p-8 rounded-3xl transition-all duration-300
                  ${isSelected 
                    ? 'simple-card-selected' 
                    : 'simple-card'
                  }
                `}>
                  {/* Quote Icon */}
                  <div className="absolute top-4 sm:top-6 right-4 sm:right-6 opacity-20">
                    <Quote className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600" />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-center space-x-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6 italic text-center group-hover:text-gray-800 transition-colors duration-300">
                    "{testimonial.content}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg">
                      {testimonial.avatar}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">{testimonial.name}</div>
                      <div className="text-gray-600 text-xs sm:text-sm">{testimonial.role}</div>
                      <div className="text-gray-500 text-xs">{testimonial.location}</div>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-4 left-4 w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse"></div>
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

export default Testimonials;