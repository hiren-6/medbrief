import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, MapPin, Heart, Activity, Scale, Ruler, AlertTriangle, Wine, Dumbbell } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface ProfileData {
  // Profile Details
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  
  // Medical History
  family_history: string;
  smoking_status: string;
  tobacco_use: string;
  allergies: string;
  alcohol_consumption: string;
  exercise_frequency: string;
  weight: number;
  height: number;
  bmi: number;
}

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [formData, setFormData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
    family_history: '',
    smoking_status: '',
    tobacco_use: '',
    allergies: '',
    alcohol_consumption: '',
    exercise_frequency: '',
    weight: 0,
    height: 0,
    bmi: 0
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);
      
      // Check if profile already exists and is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile && profile.first_name) {
        // Profile already exists and is complete, redirect to dashboard
        navigate('/dashboard/patient');
      } else if (profile) {
        // Profile exists but is incomplete, populate form with existing data
        setFormData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          gender: profile.gender || '',
          date_of_birth: profile.date_of_birth || '',
          address: profile.address || '',
          family_history: profile.family_history || '',
          smoking_status: profile.smoking_status || '',
          tobacco_use: profile.tobacco_use || '',
          allergies: profile.allergies || '',
          alcohol_consumption: profile.alcohol_consumption || '',
          exercise_frequency: profile.exercise_frequency || '',
          weight: profile.weight || 0,
          height: profile.height || 0,
          bmi: profile.bmi || 0
        });
      } else {
        // No profile found, use user metadata to prefill
        const userMeta = user.user_metadata || {};
        setFormData(prev => ({
          ...prev,
          first_name: userMeta.first_name || '',
          last_name: userMeta.last_name || '',
        }));
      }
    };
    checkUser();
  }, [navigate]);

  const calculateBMI = (weight: number, height: number): number => {
    if (height <= 0) return 0;
    const heightInMeters = height / 100; // Convert cm to meters
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-calculate BMI when weight or height changes
      if (name === 'weight' || name === 'height') {
        const weight = name === 'weight' ? parseFloat(value) || 0 : prev.weight;
        const height = name === 'height' ? parseFloat(value) || 0 : prev.height;
        newData.bmi = calculateBMI(weight, height);
      }
      
      return newData;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          address: formData.address,
          family_history: formData.family_history,
          smoking_status: formData.smoking_status,
          tobacco_use: formData.tobacco_use,
          allergies: formData.allergies,
          alcohol_consumption: formData.alcohol_consumption,
          exercise_frequency: formData.exercise_frequency,
          weight: formData.weight,
          height: formData.height,
          bmi: formData.bmi
        })
        .eq('id', userId);

      if (error) {
        alert('Error saving profile: ' + error.message);
        setLoading(false);
        return;
      }

      // Redirect to book first appointment
      navigate('/pre-consult');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate profile details
      if (!formData.first_name || !formData.last_name || !formData.phone || !formData.gender || !formData.date_of_birth || !formData.address) {
        alert('Please fill in all profile details');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-32 h-12 rounded-xl overflow-hidden">
              <img 
                src="/Picture3.svg" 
                alt="MedBrief AI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Help us provide better care by sharing your information</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of 2
            </span>
            <span className="text-sm text-gray-500">
              {currentStep === 1 ? 'Profile Details' : 'Medical History'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 1 ? (
            // Profile Details Step
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Details</h2>
                <p className="text-gray-600">Let's start with your basic information</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your first name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your last name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your complete address"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Medical History Step
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Heart className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Medical History</h2>
                <p className="text-gray-600">Help doctors understand your health background</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family History
                  </label>
                  <textarea
                    name="family_history"
                    value={formData.family_history}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any family history of diseases (diabetes, heart disease, cancer, etc.)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Smoking Status
                  </label>
                  <select
                    name="smoking_status"
                    value={formData.smoking_status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select smoking status</option>
                    <option value="never">Never smoked</option>
                    <option value="former">Former smoker</option>
                    <option value="current">Current smoker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tobacco Use
                  </label>
                  <select
                    name="tobacco_use"
                    value={formData.tobacco_use}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select tobacco use</option>
                    <option value="none">No tobacco use</option>
                    <option value="chewing">Chewing tobacco</option>
                    <option value="other">Other forms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alcohol Consumption
                  </label>
                  <select
                    name="alcohol_consumption"
                    value={formData.alcohol_consumption}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select alcohol consumption</option>
                    <option value="none">No alcohol</option>
                    <option value="occasional">Occasional</option>
                    <option value="moderate">Moderate</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercise Frequency
                  </label>
                  <select
                    name="exercise_frequency"
                    value={formData.exercise_frequency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select exercise frequency</option>
                    <option value="never">Never</option>
                    <option value="rarely">Rarely</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="regular">Regular</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any known allergies (medications, food, environmental, etc.)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg) *
                  </label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight || ''}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter weight in kg"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm) *
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="height"
                      value={formData.height || ''}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter height in cm"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                {formData.bmi > 0 && (
                  <div className="md:col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-800">BMI Calculation</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">BMI:</span>
                          <span className="ml-2 font-semibold text-blue-800">{formData.bmi}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <span className="ml-2 font-semibold text-blue-800">{getBMICategory(formData.bmi)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Range:</span>
                          <span className="ml-2 text-blue-800">
                            {formData.bmi < 18.5 ? '< 18.5' : 
                             formData.bmi < 25 ? '18.5 - 24.9' :
                             formData.bmi < 30 ? '25 - 29.9' : '≥ 30'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Previous</span>
            </button>

            {currentStep === 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200"
              >
                <span>Next</span>
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage; 