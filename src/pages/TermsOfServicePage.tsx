import React from 'react';
import { ArrowLeft, FileText, Shield, AlertTriangle, Users, Gavel, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { scrollToTop } from '../hooks/useScrollToTop';

const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    scrollToTop('auto');
    navigate('/');
  };

  const sections = [
    {
      icon: FileText,
      title: 'Service Description',
      content: [
        'MedBrief AI provides AI-powered medical document analysis and summary generation services',
        'Our platform helps patients organize and share their medical information with healthcare providers',
        'We offer document upload, AI processing, summary generation, and secure sharing capabilities',
        'Services are provided through our web platform and may include mobile applications',
        'We continuously improve our AI algorithms to enhance accuracy and usefulness'
      ]
    },
    {
      icon: Users,
      title: 'User Responsibilities',
      content: [
        'Provide accurate and complete information when using our services',
        'Maintain the confidentiality of your account credentials',
        'Use the service only for legitimate healthcare communication purposes',
        'Comply with all applicable laws and regulations',
        'Respect the intellectual property rights of MedBrief AI and third parties',
        'Report any security vulnerabilities or unauthorized access immediately'
      ]
    },
    {
      icon: Shield,
      title: 'Medical Disclaimer',
      content: [
        'MedBrief AI is NOT a substitute for professional medical advice, diagnosis, or treatment',
        'Our AI-generated summaries are tools to assist communication, not medical recommendations',
        'Always consult qualified healthcare professionals for medical decisions',
        'We do not provide medical advice, diagnosis, or treatment recommendations',
        'Emergency medical situations require immediate professional medical attention',
        'Users are responsible for verifying the accuracy of AI-generated summaries'
      ]
    },
    {
      icon: AlertTriangle,
      title: 'Prohibited Uses',
      content: [
        'Using the service for any illegal or unauthorized purpose',
        'Uploading false, misleading, or fraudulent medical information',
        'Attempting to reverse engineer or compromise our AI algorithms',
        'Sharing account access with unauthorized individuals',
        'Using the service to harm, harass, or discriminate against others',
        'Violating any applicable healthcare regulations or privacy laws'
      ]
    }
  ];

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
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Terms of Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Terms of Service</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-800 font-medium mb-2">Effective Date: January 1, 2025</p>
            <p className="text-blue-700">Last Updated: January 1, 2025</p>
          </div>
          
          <p className="text-gray-700 leading-relaxed mb-6">
            Welcome to MedBrief AI. These Terms of Service ("Terms") govern your use of our AI-powered medical 
            summary platform and services. By accessing or using MedBrief AI, you agree to be bound by these Terms. 
            If you do not agree to these Terms, please do not use our services.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-800 mb-2">Important Medical Disclaimer</h3>
                <p className="text-red-700 text-sm">
                  MedBrief AI is a healthcare communication tool and is NOT a substitute for professional medical 
                  advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with 
                  any questions regarding medical conditions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Sections */}
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-teal-500 w-12 h-12 rounded-xl flex items-center justify-center">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{section.title}</h2>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Payment and Billing */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Payment and Billing</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Our basic document summarization service is currently free for patients. Premium features may be 
              introduced with transparent pricing:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Free Services</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Basic document upload and summarization</li>
                  <li>• Standard AI-generated summaries</li>
                  <li>• Secure sharing with healthcare providers</li>
                  <li>• Basic account management</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Future Premium Features</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Advanced AI analysis and insights</li>
                  <li>• Priority processing and support</li>
                  <li>• Enhanced collaboration tools</li>
                  <li>• Extended storage and history</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Intellectual Property */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Intellectual Property</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Our Rights</h3>
              <p className="text-gray-700 text-sm">
                MedBrief AI owns all rights to our platform, AI algorithms, software, and related intellectual property. 
                Users are granted a limited, non-exclusive license to use our services.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Your Rights</h3>
              <p className="text-blue-700 text-sm">
                You retain ownership of your medical documents and personal information. By using our service, 
                you grant us permission to process your data solely for providing our services.
              </p>
            </div>
          </div>
        </div>

        {/* Limitation of Liability */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Limitation of Liability</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 font-medium mb-2">Important Legal Notice</p>
              <p className="text-red-700 text-sm leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDBRIEF AI SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF 
                PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OUR SERVICES.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Our liability is limited to the amount you have paid for our services in the 12 months preceding 
              the claim. This limitation applies regardless of the legal theory on which the claim is based.
            </p>
          </div>
        </div>

        {/* Termination */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Account Termination</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Either party may terminate these Terms at any time. Upon termination:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Your Rights</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Download your data within 30 days</li>
                  <li>• Request permanent data deletion</li>
                  <li>• Receive confirmation of account closure</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Our Actions</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Cease processing your data</li>
                  <li>• Securely delete your information</li>
                  <li>• Provide termination confirmation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Governing Law */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Gavel className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Governing Law and Disputes</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by the laws of India. Any disputes will be resolved through:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <ol className="space-y-2 text-gray-700">
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Good faith negotiation between the parties</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Mediation through a mutually agreed mediator</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>Arbitration in Bangalore, Karnataka, India</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Contact Information</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-6">
            For questions about these Terms of Service, please contact our legal team:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800">Legal Department</p>
                <p className="text-gray-600">legal@medbrief.ai</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">General Support</p>
                <p className="text-gray-600">support@medbrief.ai</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800">Business Address</p>
                <p className="text-gray-600">
                  MedBrief AI Legal Team<br />
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

export default TermsOfServicePage;