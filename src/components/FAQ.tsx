import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const faqs = [
  {
    question: 'Is MedBrief free to use?',
    answer: 'Yes, uploading patient documents and getting a summary is completely free for a limited time. We may offer premium features in the future.',
    id: 'free-to-use'
  },
  {
    question: 'What kind of documents can I upload?',
    answer: 'You can upload prescriptions, lab reports, scans, discharge summaries, or any medical records in PDF, JPG, or PNG formats.',
    id: 'document-types'
  },
  {
    question: 'Is my data safe and private?',
    answer: 'Absolutely. We use end-to-end encryption and follow strict data protection protocols. Your data is never shared without your consent.',
    id: 'data-safety'
  },
  {
    question: 'How accurate is the AI-generated summary?',
    answer: 'Our AI is based on third-party provider and currently we do not offer any gurantee while the product is in beta launch. We are working tirelessly to improve our underlying LLM models. We will provide you update you soon.',
    id: 'ai-accuracy'
  },
  {
    question: 'Can I edit the summary before finalizing it?',
    answer: 'Yes, you can review and make changes to the summary to ensure it patients current condition accurately.',
    id: 'edit-summary'
  },
  {
    question: 'Do I need to install anything?',
    answer: 'No app download required. MedBrief is web-based and works seamlessly on desktop browser.',
    id: 'installation'
  },
  {
    question: 'What if I have a non-English medical document?',
    answer: 'Currently we support English only. Our AI attempts translation and summarization, but we can not gurantee the accuracy of the summary.',
    id: 'language-support'
  }
];

interface FAQProps {
  onContactSupportClick: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onContactSupportClick }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const toggleFAQ = (index: number, id: string) => {
    setOpenIndex(openIndex === index ? null : index);
    setSelectedCard(selectedCard === id ? null : id);
  };

  return (
    <section 
      id="faq" 
      ref={elementRef}
      className={`section-container relative overflow-hidden transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-600 delay-100 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Everything you need to know about MedBrief AI
          </p>
        </div>

        <div className="space-y-4 pb-8">
          {faqs.map((faq, index) => {
            const isSelected = selectedCard === faq.id;
            
            return (
              <div
                key={index}
                className={`relative overflow-hidden transition-all duration-500 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4'
                }`}
                style={{
                  transitionDelay: isVisible ? `${200 + index * 100}ms` : '0ms'
                }}
              >
                {/* Simple card */}
                <div className={`
                  relative rounded-3xl transition-all duration-300
                  ${isSelected 
                    ? 'simple-card-selected' 
                    : 'simple-card'
                  }
                `}>
                  <button
                    onClick={() => toggleFAQ(index, faq.id)}
                    className="w-full p-4 sm:p-6 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-3xl transition-all duration-300"
                  >
                    <span className="text-base sm:text-lg font-semibold text-gray-800 pr-4 sm:pr-8 group-hover:text-gray-900 transition-colors duration-300">
                      {faq.question}
                    </span>
                    <div className="flex-shrink-0">
                      {openIndex === index ? (
                        <ChevronUp className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      openIndex === index 
                        ? 'max-h-96 opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                        {faq.answer}
                      </p>
                    </div>
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

        {/* Still have questions CTA */}
        <div className={`text-center mt-8 sm:mt-12 transition-all duration-600 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="simple-card p-6 sm:p-8 rounded-3xl">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Our support team is here to help you get started with MedBrief AI
            </p>
            <button 
              onClick={onContactSupportClick}
              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;