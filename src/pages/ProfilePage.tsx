import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, MapPin, Heart, Activity, Scale, Ruler, Edit, Save, X, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ProfileImage from '../components/ProfileImage';
import { useScrollToTop } from '../hooks/useScrollToTop';

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  family_history: string;
  smoking_status: string;
  tobacco_use: string;
  allergies: string;
  alcohol_consumption: string;
  exercise_frequency: string;
  weight: number;
  height: number;
  bmi: number;
  role: string;
  doctor_speciality?: string;
  updated_at?: string;
  profile_image_url?: string; // Added for profile image
}

const ProfilePage: React.FC = () => {
  // Scroll to top on page load
  useScrollToTop();
  
  const navigate = useNavigate();
  const location = useLocation();
  const inPortalLayout = location.pathname.startsWith('/dashboard/doctor') || location.pathname.startsWith('/dashboard/patient');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<'doctor' | 'patient' | ''>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  // Profile image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Helper to get image URL (public)
  const getImageUrl = (path: string) => {
    if (!path) return '';
    // If already a full URL, return as is
    if (path.startsWith('http')) return path;
    // Otherwise, build public URL using the profile-images bucket
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
  };

  // Helper to check if image URL is valid (points to correct bucket)
  const isValidImageUrl = (url: string) => {
    if (!url) return false;
    // Check if URL points to the correct bucket
    return url.includes('/profile-images/');
  };

  // Helper to clear invalid profile image URL
  const clearInvalidProfileImage = async () => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('id', profile.id);
      
      if (!error) {
        setProfile(prev => prev ? { ...prev, profile_image_url: null } : prev);
        console.log('Cleared invalid profile image URL');
      }
    } catch (err) {
      console.error('Failed to clear invalid profile image:', err);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setUploadError('');
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}/profile/${Date.now()}.${fileExt}`;
    
    try {
      console.log('Starting image upload for user:', profile.id);
      console.log('File path:', filePath);
      
      // Upload to Supabase Storage using the profile-images bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }
      
      console.log('Upload successful:', uploadData);
      
      // Get public URL using Supabase's getPublicUrl method
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);
        
      const publicUrl = urlData.publicUrl;
      console.log('Public URL generated:', publicUrl);
      
      // Update profile with the image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', profile.id);
        
      if (updateError) {
        console.error('Profile update error:', updateError);
        setUploadError('Failed to update profile: ' + updateError.message);
        setUploading(false);
        return;
      }
      
      console.log('Profile updated successfully with image URL');
      setProfile(prev => prev ? { ...prev, profile_image_url: publicUrl } : prev);
      setImageLoaded(false); // Reset to trigger new image loading
      setUploadError(''); // Clear any previous errors
      
    } catch (err: any) {
      console.error('Unexpected error during upload:', err);
      setUploadError('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Debug: Check if Supabase is configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          setError('Supabase configuration is missing. Please check your environment variables.');
          setDebugInfo(`URL: ${supabaseUrl ? 'Set' : 'Missing'}, Key: ${supabaseAnonKey ? 'Set' : 'Missing'}`);
          setLoading(false);
          return;
        }

        setDebugInfo('Supabase configured, fetching user...');
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          setError('Authentication error: ' + userError.message);
          setDebugInfo(`User error: ${userError.message}`);
          setLoading(false);
          return;
        }
        
        if (!user) {
          setError('No authenticated user found. Please log in.');
          setDebugInfo('No user found');
          setLoading(false);
          return;
        }

        setDebugInfo(`User found: ${user.email}, fetching profile...`);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          // If no profile found, use user metadata to prefill
          const userMeta = user.user_metadata || {};
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: userMeta.full_name || `${userMeta.first_name || ''} ${userMeta.last_name || ''}`.trim(),
            first_name: userMeta.first_name || '',
            last_name: userMeta.last_name || '',
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
            bmi: 0,
            role: userMeta.role || '',
            doctor_speciality: '',
            updated_at: '',
            profile_image_url: ''
          });
          setUserRole(userMeta.role || '');
          setDebugInfo('Profile not found, using user metadata');
          setLoading(false);
          return;
        }

        setProfile(data);
        setUserRole(data.role);
        setDebugInfo('Profile loaded successfully');
        // Reset image loaded state
        setImageLoaded(false);
        // Debug: Log profile image URL
        if (data.profile_image_url) {
          console.log('Profile image URL:', data.profile_image_url);
          // Check if the URL points to the wrong bucket and clear it
          if (data.profile_image_url.includes('/patient-documents/')) {
            console.log('Detected wrong bucket URL, clearing...');
            clearInvalidProfileImage();
          }
        } else {
          console.log('No profile image URL found');
        }
      } catch (err: any) {
        setError('Error: ' + err.message);
        setDebugInfo(`Exception: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const calculateBMI = (weight: number, height: number): number => {
    if (height <= 0) return 0;
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  };

  // Function to format specialty value for database storage
  const formatSpecialtyForStorage = (specialty: string): string => {
    if (!specialty) return '';
    
    // Handle special cases
    const specialCases: { [key: string]: string } = {
      'obstetrics_gynecology': 'Obstetrics & Gynecology',
      'family_medicine': 'Family Medicine',
      'general_surgery': 'General Surgery',
      'internal_medicine': 'Internal Medicine',
      'emergency_medicine': 'Emergency Medicine'
    };
    
    if (specialCases[specialty]) {
      return specialCases[specialty];
    }
    
    // For other cases, capitalize first letter and replace underscores with spaces
    // Handle special characters like & properly
    return specialty
      .split('_')
      .map(word => {
        // Handle words that might contain special characters
        if (word.includes('&')) {
          return word.split('&').map(part => 
            part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase()
          ).join(' & ');
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Function to get the display value for the select dropdown
  const getSpecialtyDisplayValue = (specialty: string): string => {
    if (!specialty) return '';
    
    // If it's already in the new format, return as is
    const newFormatOptions = [
      'Cardiology', 'Dermatology', 'Endocrinology', 'Family Medicine',
      'Gastroenterology', 'General Surgery', 'Internal Medicine', 'Neurology',
      'Obstetrics & Gynecology', 'Oncology', 'Ophthalmology', 'Orthopedics',
      'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Urology',
      'Emergency Medicine', 'Anesthesiology', 'Pathology', 'Other'
    ];
    
    if (newFormatOptions.includes(specialty)) {
      return specialty;
    }
    
    // If it's in old format, convert it
    return formatSpecialtyForStorage(specialty);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!profile) return;
    
    const { name, value } = e.target;
    setProfile(prev => {
      if (!prev) return prev;
      
      let processedValue = value;
      
      // Format specialty if it's the doctor_speciality field
      if (name === 'doctor_speciality') {
        // Check if the value is already in the proper format
        const newFormatOptions = [
          'Cardiology', 'Dermatology', 'Endocrinology', 'Family Medicine',
          'Gastroenterology', 'General Surgery', 'Internal Medicine', 'Neurology',
          'Obstetrics & Gynecology', 'Oncology', 'Ophthalmology', 'Orthopedics',
          'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Urology',
          'Emergency Medicine', 'Anesthesiology', 'Pathology', 'Other'
        ];
        
        if (newFormatOptions.includes(value)) {
          // If it's already in proper format, use it as is
          processedValue = value;
        } else {
          // Only format if it's in old format
          processedValue = formatSpecialtyForStorage(value);
        }
      }
      
      const newProfile = { ...prev, [name]: processedValue };
      
      // Auto-calculate BMI when weight or height changes
      if (name === 'weight' || name === 'height') {
        const weight = name === 'weight' ? parseFloat(value) || 0 : prev.weight;
        const height = name === 'height' ? parseFloat(value) || 0 : prev.height;
        newProfile.bmi = calculateBMI(weight, height);
      }
      
      return newProfile;
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          gender: profile.gender,
          date_of_birth: profile.date_of_birth,
          address: profile.address,
          family_history: profile.family_history,
          smoking_status: profile.smoking_status,
          tobacco_use: profile.tobacco_use,
          allergies: profile.allergies,
          alcohol_consumption: profile.alcohol_consumption,
          exercise_frequency: profile.exercise_frequency,
          weight: profile.weight,
          height: profile.height,
          bmi: profile.bmi,
          doctor_speciality: profile.doctor_speciality
        })
        .eq('id', profile.id);

      if (error) {
        setError('Failed to save profile: ' + error.message);
        return;
      }

      setEditing(false);
      setError('');
    } catch (err: any) {
      setError('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };



  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const getBMIColor = (bmi: number): string => {
    if (bmi < 18.5) return 'text-yellow-600 bg-yellow-100';
    if (bmi < 25) return 'text-green-600 bg-green-100';
    if (bmi < 30) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-blue-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-red-600">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        {inPortalLayout ? (
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-2">
              <ProfileImage 
                imageUrl={profile.profile_image_url}
                size="xl"
                className="border-4"
              />
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer shadow transition-colors" title="Upload new profile image">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <Edit className="h-5 w-5" />
              </label>
            </div>
            {uploading && <div className="text-blue-600 text-sm">Uploading...</div>}
            {uploadError && <div className="text-red-600 text-sm">{uploadError}</div>}
          </div>
          {/* First Row: Basic Information */}
          {userRole === 'doctor' ? (
            // Full width layout for doctors
            <div className="w-full">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
                    <p className="text-gray-600">Personal details and contact information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={profile.first_name || ''}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={profile.last_name || ''}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={profile.phone || ''}
                        onChange={handleInputChange}
                        disabled={!editing}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={profile.gender || ''}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="date_of_birth"
                        value={profile.date_of_birth || ''}
                        onChange={handleInputChange}
                        disabled={!editing}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <textarea
                        name="address"
                        value={profile.address || ''}
                        onChange={handleInputChange}
                        disabled={!editing}
                        rows={3}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Specialty Field - Only for Doctors */}
                  {userRole === 'doctor' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medical Specialty
                      </label>

                      <select
                        name="doctor_speciality"
                        value={getSpecialtyDisplayValue(profile.doctor_speciality || '')}
                        onChange={handleInputChange}
                        disabled={!editing}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <option value="">Select your medical specialty</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Endocrinology">Endocrinology</option>
                        <option value="Family Medicine">Family Medicine</option>
                        <option value="Gastroenterology">Gastroenterology</option>
                        <option value="General Surgery">General Surgery</option>
                        <option value="Internal Medicine">Internal Medicine</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                        <option value="Oncology">Oncology</option>
                        <option value="Ophthalmology">Ophthalmology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Psychiatry">Psychiatry</option>
                        <option value="Pulmonology">Pulmonology</option>
                        <option value="Radiology">Radiology</option>
                        <option value="Urology">Urology</option>
                        <option value="Emergency Medicine">Emergency Medicine</option>
                        <option value="Anesthesiology">Anesthesiology</option>
                        <option value="Pathology">Pathology</option>
                        <option value="Other">Other</option>
                        {/* Fallback option for any specialty that doesn't match the new format */}
                        {profile.doctor_speciality && 
                         !['Cardiology', 'Dermatology', 'Endocrinology', 'Family Medicine',
                           'Gastroenterology', 'General Surgery', 'Internal Medicine', 'Neurology',
                           'Obstetrics & Gynecology', 'Oncology', 'Ophthalmology', 'Orthopedics',
                           'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Urology',
                           'Emergency Medicine', 'Anesthesiology', 'Pathology', 'Other'].includes(profile.doctor_speciality) && (
                          <option value={profile.doctor_speciality}>{profile.doctor_speciality}</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Full width layout for patients
            <div className="w-full">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
                      <p className="text-gray-600">Personal details and contact information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={profile.first_name || ''}
                        onChange={handleInputChange}
                        disabled={!editing}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={profile.last_name || ''}
                        onChange={handleInputChange}
                        disabled={!editing}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email || ''}
                        disabled
                        className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={profile.phone || ''}
                          onChange={handleInputChange}
                          disabled={!editing}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={profile.gender || ''}
                        onChange={handleInputChange}
                        disabled={!editing}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="date"
                          name="date_of_birth"
                          value={profile.date_of_birth || ''}
                          onChange={handleInputChange}
                          disabled={!editing}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <textarea
                          name="address"
                          value={profile.address || ''}
                          onChange={handleInputChange}
                          disabled={!editing}
                          rows={3}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          )}

          {/* Medical History - Only for Patients */}
          {userRole === 'patient' && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Medical History</h2>
                <p className="text-gray-600">Health background and lifestyle information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family History
                </label>
                <textarea
                  name="family_history"
                  value={profile.family_history || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                  }`}
                  placeholder="Any family history of diseases"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Smoking Status
                </label>
                <select
                  name="smoking_status"
                  value={profile.smoking_status || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                  }`}
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
                  value={profile.tobacco_use || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                  }`}
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
                  value={profile.alcohol_consumption || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                  }`}
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
                  value={profile.exercise_frequency || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                  }`}
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
                  value={profile.allergies || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  rows={2}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                  }`}
                  placeholder="Any known allergies"
                />
              </div>
            </div>
          </div>
          )}

          {/* Physical Measurements - Only for Patients */}
          {userRole === 'patient' && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Physical Measurements</h2>
                <p className="text-gray-600">Height, weight, and BMI information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <div className="relative">
                  <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    name="weight"
                    value={profile.weight || ''}
                    onChange={handleInputChange}
                    disabled={!editing}
                    min="0"
                    step="0.1"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    name="height"
                    value={profile.height || ''}
                    onChange={handleInputChange}
                    disabled={!editing}
                    min="0"
                    step="0.1"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BMI
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={profile.bmi || 0}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg"
                  />
                  {profile.bmi > 0 && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBMIColor(profile.bmi)}`}>
                      {getBMICategory(profile.bmi)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

        </div>

        {/* Action Buttons */}
        {editing && (
          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 