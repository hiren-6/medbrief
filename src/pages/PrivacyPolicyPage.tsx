import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Globe, FileText, Users, Database } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { scrollToTop } from '../hooks/useScrollToTop';

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    scrollToTop('auto');
    navigate('/');
  };

  const sections = [
    {
      icon: Shield,
      title: 'Information We Collect',
      content: [
        'Personal Health Information (PHI) including medical records, lab results, prescriptions, and diagnostic reports',
        'Personal identifiers such as name, email address, phone number, and date of birth',
        'Technical information including IP address, browser type, device information, and usage patterns',
        'Account information including login credentials and user preferences',
        'Communication data including support requests and feedback'
      ]
    },
    {
      icon: Lock,
      title: 'How We Use Your Information',
      content: [
        'Generate AI-powered medical summaries from your uploaded documents',
        'Provide personalized healthcare communication services',
        'Improve our AI algorithms and service quality',
        'Communicate with you about your account and our services',
        'Comply with legal obligations and regulatory requirements',
        'Detect and prevent fraud, abuse, and security threats'
      ]
    },
    {
      icon: Eye,
      title: 'Information Sharing and Disclosure',
      content: [
        'We do NOT sell, rent, or trade your personal health information',
        'Healthcare providers you explicitly authorize to receive your medical summaries',
        'Service providers who assist in our operations under strict confidentiality agreements',
        'Legal authorities when required by law or to protect rights and safety',
        'Business partners only with your explicit consent and for specified purposes'
      ]
    },
    {
      icon: Database,
      title: 'Data Security and Protection',
      content: [
        'End-to-end encryption for all data transmission and storage',
        'HIPAA-compliant infrastructure with regular security audits',
        'Multi-factor authentication and access controls',
        'Regular data backups with encrypted storage',
        'Employee training on data protection and confidentiality',
        'Incident response procedures for potential data breaches'
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
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Privacy Policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-800 font-medium mb-2">Effective Date: January 1, 2025</p>
            <p className="text-blue-700">Last Updated: January 1, 2025</p>
          </div>
          
          <p className="text-gray-700 leading-relaxed mb-6">
            At MedBrief AI, we understand that your health information is among your most sensitive personal data. 
            This Privacy Policy explains how we collect, use, protect, and share your information when you use our 
            AI-powered medical summary services. We are committed to maintaining the highest standards of privacy 
            and security in compliance with HIPAA, GDPR, and other applicable regulations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">HIPAA Compliant</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <Globe className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">GDPR Compliant</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <Lock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-800">End-to-End Encrypted</p>
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

        {/* HIPAA Compliance Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">HIPAA Compliance</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              As a healthcare technology provider, MedBrief AI is committed to full compliance with the Health Insurance 
              Portability and Accountability Act (HIPAA). We implement comprehensive safeguards to protect your Protected 
              Health Information (PHI):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Administrative Safeguards</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Designated Privacy Officer</li>
                  <li>• Employee training programs</li>
                  <li>• Access management procedures</li>
                  <li>• Incident response protocols</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Technical Safeguards</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• End-to-end encryption</li>
                  <li>• Secure authentication</li>
                  <li>• Audit logging</li>
                  <li>• Automatic session timeouts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* GDPR Compliance Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">GDPR Rights</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you are located in the European Union, you have the following rights under the General Data Protection Regulation (GDPR):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">Right to Access</p>
                  <p className="text-sm text-gray-600">Request copies of your personal data</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">Right to Rectification</p>
                  <p className="text-sm text-gray-600">Request correction of inaccurate data</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">Right to Erasure</p>
                  <p className="text-sm text-gray-600">Request deletion of your data</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">Right to Portability</p>
                  <p className="text-sm text-gray-600">Transfer your data to another service</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">Right to Object</p>
                  <p className="text-sm text-gray-600">Object to processing of your data</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">Right to Restrict</p>
                  <p className="text-sm text-gray-600">Limit how we use your data</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Database className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Data Retention</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              We retain your personal health information only as long as necessary to provide our services and comply with legal obligations:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <ul className="space-y-2">
                <li className="flex justify-between items-center">
                  <span className="text-gray-700">Medical documents and summaries</span>
                  <span className="font-medium text-gray-800">7 years or as required by law</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-700">Account information</span>
                  <span className="font-medium text-gray-800">Until account deletion</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-700">Usage analytics (anonymized)</span>
                  <span className="font-medium text-gray-800">3 years</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-700">Support communications</span>
                  <span className="font-medium text-gray-800">3 years</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Contact Us</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-6">
            If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800">Privacy Officer</p>
                <p className="text-gray-600">privacy@medbrief.ai</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Data Protection Officer (EU)</p>
                <p className="text-gray-600">dpo@medbrief.ai</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">General Support</p>
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

export default PrivacyPolicyPage;