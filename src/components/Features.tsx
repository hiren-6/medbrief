import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const LongImage: React.FC<{ src: string; alt: string; label?: string; className?: string }> = ({ src, alt, label, className }) => {
  const [aspect, setAspect] = React.useState<number | null>(null);
  return (
    <div
      className={`relative bg-white rounded-2xl border border-gray-200 overflow-hidden long-image-container ${className || ''}`}
      style={{ aspectRatio: aspect || 0.8 }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain opacity-95 long-image-mask"
        onLoad={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (img.naturalHeight > 0) {
            setAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
      />
      {label && (
        <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">{label}</div>
      )}
    </div>
  );
};

const Features: React.FC = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.15 });

  return (
    <section
      id="features"
      ref={elementRef}
      className={`section-container relative overflow-hidden transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className={`text-left mb-8 sm:mb-12 transition-all duration-600 delay-100 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent leading-tight">
            Smarter summaries. Faster consults.
            <br className="hidden sm:block" />
            Stronger care teams
          </h2>
        </div>

        {/* Three full-width rows with alternating image/text layout */}
        <div className="space-y-6 lg:space-y-8">
          {/* Row 1: text left, image right */}
          <div className={`simple-card rounded-3xl p-6 sm:p-8 shadow-lg transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-center">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">1-page Consult-Ready Patient Summary</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                Turn scattered records into an organized one-pager that highlights what matters most for each patient visit.
                </p>
              </div>
              <LongImage src="/feature1.png" alt="Feature1: 1-page Consult-Ready Patient Summary" />
            </div>
          </div>

          {/* Row 2: image left, text right (inverse) */}
          <div className={`rounded-3xl p-6 sm:p-8 shadow-lg transition-all duration-500 bg-gradient-to-br from-blue-50 via-teal-50 to-white border border-gray-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: isVisible ? '250ms' : '0ms' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-center">
              <div className="order-1 md:order-none">
                <LongImage src="/feature2.png" alt="Feature2: Practice Insights Dashboard" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Practice Insights Dashboard (under progress)</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                Get real-time visibility into patient flow, consultation types, and outcomes to run your practice smarter.
                </p>
              </div>
            </div>
          </div>

          {/* Row 3: text left, image right */}
          <div className={`rounded-3xl p-6 sm:p-8 simple-card shadow-lg transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: isVisible ? '350ms' : '0ms' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-center">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">AI Clinical Copilot</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                Ask real-time questions about patient cases and get evidence-based insights to support decision-making.
                </p>
              </div>
              <LongImage src="/feature3.png" alt="Feature3: AI Clinical Copilot" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;


