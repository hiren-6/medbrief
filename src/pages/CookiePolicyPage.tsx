import React, { useState } from 'react';
import { ArrowLeft, Cookie, Settings, Shield, BarChart, Users, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scrollToTop } from '../hooks/useScrollToTop';

const CookiePolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const [cookieSettings, setCookieSettings] = useState({
    essential: true,
    analytics: true,
    functional: true,
    marketing: false
  });

  const handleBack = () => {
    scrollToTop('auto');
    navigate('/');
  };

  const cookieTypes = [
    {
      icon: Shield,
      title: 'Essential Cookies',
      description: 'Required for basic website functionality and security',
      required: true,
      examples: [
        'User authentication and session management',
        'Security tokens and CSRF protection',
        'Load balancing and performance optimization',
        'Basic website functionality and navigation'
      ]
    },
    {
      icon: BarChart,
      title: 'Analytics Cookies',
      description: 'Help us understand how users interact with our platform',
      required: false,
      examples: [
        'Page views and user journey tracking',
        'Feature usage and performance metrics',
        'Error tracking and debugging information',
        'Aggregated usage statistics (anonymized)'
      ]
    },
    {
      icon: Settings,
      title: 'Functional Cookies',
      description: 'Enable enhanced features and personalization',
      required: false,
      examples: [
        'User preferences and settings',
        'Language and region preferences',
        'Accessibility settings and customizations',
        'Recently viewed documents and summaries'
      ]
    },
    {
      icon: Users,
      title: 'Marketing Cookies',
      description: 'Used for targeted advertising and marketing campaigns',
      required: false,
      examples: [
        'Advertising campaign effectiveness',
        'Social media integration and sharing',
        'Third-party marketing platform integration',
        'Personalized content recommendations'
      ]
    }
  ];

  const handleCookieToggle = (type: string) => {
    if (type === 'essential') return; // Essential cookies cannot be disabled
    
    setCookieSettings(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const saveSettings = () => {
    // In a real implementation, this would save settings to localStorage or send to backend
    console.log('Cookie settings saved:', cookieSettings);
    alert('Cookie preferences saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Cookie className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Cookie Policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Cookie Policy</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-800 font-medium mb-2">Effective Date: January 1, 2025</p>
            <p className="text-blue-700">Last Updated: January 1, 2025</p>
          </div>
          
          <p className="text-gray-700 leading-relaxed mb-6">
            This Cookie Policy explains how MedBrief AI uses cookies and similar tracking technologies on our 
            website and platform. We are committed to transparency about our data collection practices and 
            giving you control over your privacy preferences.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Cookie className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-orange-800 mb-2">What are Cookies?</h3>
                <p className="text-orange-700 text-sm">
                  Cookies are small text files stored on your device when you visit our website. They help us 
                  provide you with a better experience by remembering your preferences and improving our services.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cookie Types */}
        {cookieTypes.map((type, index) => {
          const Icon = type.icon;
          const settingKey = type.title.toLowerCase().split(' ')[0] as keyof typeof cookieSettings;
          const isEnabled = cookieSettings[settingKey];
          
          return (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-teal-500 w-12 h-12 rounded-xl flex items-center justify-center">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{type.title}</h2>
                    <p className="text-gray-600">{type.description}</p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <div className="flex items-center space-x-3">
                  {type.required && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Required</span>
                  )}
                  <button
                    onClick={() => handleCookieToggle(settingKey)}
                    disabled={type.required}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      isEnabled 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300'
                    } ${type.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Examples of {type.title}:</h3>
                <ul className="space-y-2">
                  {type.examples.map((example, exampleIndex) => (
                    <li key={exampleIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-gray-700">{example}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}

        {/* Third-Party Cookies */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Third-Party Cookies</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            We may use third-party services that set their own cookies. These services help us provide better 
            functionality and analyze our website performance:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Analytics Services</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Google Analytics (anonymized)</li>
                <li>• Performance monitoring tools</li>
                <li>• Error tracking services</li>
                <li>• User experience analytics</li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Security Services</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Content delivery networks (CDN)</li>
                <li>• DDoS protection services</li>
                <li>• Security monitoring tools</li>
                <li>• Fraud prevention systems</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cookie Management */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Managing Your Cookie Preferences</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              You have several options to manage cookies on our website:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Website Settings</h3>
                  <p className="text-blue-700 text-sm mb-3">
                    Use the cookie preferences panel above to control which types of cookies we use.
                  </p>
                  <button
                    onClick={saveSettings}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Browser Settings</h3>
                  <p className="text-gray-700 text-sm">
                    Most browsers allow you to control cookies through their settings. You can usually find 
                    these options in the "Privacy" or "Security" section of your browser preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cookie Retention */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Cookie className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Cookie Retention Periods</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed mb-4">
              Different types of cookies are stored for different periods:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Session cookies</span>
                    <span className="font-medium text-gray-800">Until browser closes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Authentication cookies</span>
                    <span className="font-medium text-gray-800">30 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Preference cookies</span>
                    <span className="font-medium text-gray-800">1 year</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Analytics cookies</span>
                    <span className="font-medium text-gray-800">2 years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Marketing cookies</span>
                    <span className="font-medium text-gray-800">1 year</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Security cookies</span>
                    <span className="font-medium text-gray-800">6 months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Questions About Cookies?</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-6">
            If you have any questions about our use of cookies or this Cookie Policy, please contact us:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800">Privacy Team</p>
                <p className="text-gray-600">privacy@medbrief.ai</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Technical Support</p>
                <p className="text-gray-600">support@medbrief.ai</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800">Mailing Address</p>
                <p className="text-gray-600">
                  MedBrief AI Privacy Team<br />
                  Tech Hub, Koramangala<br />
                  Bangalore, Karnataka 560034<br />
                  India
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Phone</p>
                <p className="text-gray-600">+91 80 4567 8900</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;