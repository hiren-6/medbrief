import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Upload, FileText, CheckCircle, AlertCircle, Clock, Heart, Pill } from 'lucide-react';
import { scrollToTop, useScrollToTop } from '../hooks/useScrollToTop';
import { supabase } from '../supabaseClient';
import AppointmentScheduler from '../components/AppointmentScheduler';
import PatientSidebar from '../components/PatientSidebar';
import PatientTopNavbar from '../components/PatientTopNavbar';


// Helper function to format specialty display
const formatSpecialtyDisplay = (specialty: string): string => {
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

interface FormData {
  // New simplified form structure
  concern: string; // What is your concern today? (mandatory)
  symptomDuration: string; // How long have you had these symptoms? (open-ended)
  chronicIllness: string; // Are you having any chronic illness?
  medications: string; // Are you on any medications including Ayurvedic and over-the-counter medicines?
  additionalNotes: string; // Any other notes you wish to highlight to your doctor?
}

const PatientViewPage: React.FC = () => {
  // Scroll to top on page load
  useScrollToTop();
  
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<Array<File & { url?: string }>>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Global navbar layout used; remove local welcome/user menu
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [showPopup, setShowPopup] = useState(false);

  // New: Doctor selection state
  const [doctors, setDoctors] = useState<Array<{ id: string; full_name: string; doctor_speciality: string; profile_image_url?: string }>>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [doctorError, setDoctorError] = useState<string>('');
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState<boolean>(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  // Appointment scheduling state
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [appointmentDatetime, setAppointmentDatetime] = useState<string>('');

  // Fetch doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      setDoctorError('');
      
      // First, get all doctors
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, doctor_speciality, role, profile_image_url');
      
      console.log('Doctor fetch result:', { data, error });
      if (error) {
        setDoctorError('Supabase error: ' + error.message);
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      } else if (!data) {
        setDoctorError('No data returned from Supabase.');
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      }

      const doctorsOnly = data.filter((doc: any) => doc.role === 'doctor');
      if (doctorsOnly.length === 0) {
        setDoctorError('No doctors found in the database.');
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      }

      // Now check which doctors have appointment settings
      const doctorIds = doctorsOnly.map(doc => doc.id);
      console.log('Checking appointment settings for doctors:', doctorIds);
      
      // Try multiple query approaches to debug the issue
      console.log('Attempting query 1: Direct IN query');
      const { data: settingsData1, error: settingsError1 } = await supabase
        .from('appointment_settings')
        .select('doctor_id, start_date, end_date')
        .in('doctor_id', doctorIds);

      console.log('Query 1 result:', { settingsData1, settingsError1 });

      // Try alternative query approach
      console.log('Attempting query 2: Individual queries');
      const settingsPromises = doctorIds.map(async (doctorId) => {
        const { data, error } = await supabase
          .from('appointment_settings')
          .select('doctor_id, start_date, end_date')
          .eq('doctor_id', doctorId)
          .single();
        return { doctorId, data, error };
      });

      const settingsResults = await Promise.all(settingsPromises);
      console.log('Query 2 results:', settingsResults);

      // Use the first query result for now
      const settingsData = settingsData1;
      const settingsError = settingsError1;

      if (settingsError) {
        console.warn('Error fetching appointment settings:', settingsError);
        // Still show all doctors, but they might not have settings
        setDoctors(doctorsOnly);
      } else {
        // For debugging, let's show all doctors first
        console.log('Settings data:', settingsData);
        console.log('All doctors:', doctorsOnly);
        
        // Filter to only show doctors with appointment settings
        const doctorsWithSettings = doctorsOnly.filter(doc => 
          settingsData?.some(setting => setting.doctor_id === doc.id)
        );
        
        console.log('Doctors with settings:', doctorsWithSettings.length);
        console.log('All doctors:', doctorsOnly.length);
        
        // For now, show all doctors to test the booking flow
        console.log('Showing all doctors for testing');
        setDoctors(doctorsOnly);
        setDoctorError('');
        
        // TODO: Re-enable filtering once we identify the issue
        // if (doctorsWithSettings.length === 0) {
        //   setDoctorError('No doctors have set up their appointment schedules yet. Please contact the doctors to configure their working hours.');
        //   setDoctors([]);
        // } else {
        //   setDoctors(doctorsWithSettings);
        // }
      }
      
      setLoadingDoctors(false);
    };
    fetchDoctors();
  }, []);

  // Close doctor dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isDoctorDropdownOpen) return;
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(e.target as Node)) {
        setIsDoctorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isDoctorDropdownOpen]);
  
  const [formData, setFormData] = useState<FormData>({
    concern: '',
    symptomDuration: '',
    chronicIllness: '',
    medications: '',
    additionalNotes: ''
  });

  // Removed the useEffect that restricts patients to only one appointment

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || profile.role !== 'patient') {
        navigate('/dashboard/patient');
        return;
      }
    };
    checkRole();
  }, [navigate]);

  // Fetch patient id on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setPatientId(user.id);
    };
    fetchUserId();
  }, []);

  // Fetch patient full name for personalization
  useEffect(() => {
    const loadPatientName = async () => {
      if (!patientId) return;
      console.log('[PatientViewPage] Loading patient name');
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', patientId)
        .single();
      if (data?.full_name) {
        console.log('[PatientViewPage] Patient name loaded:', data.full_name);
        setPatientName(data.full_name);
      } else {
        console.log('[PatientViewPage] No patient name found');
      }
    };
    loadPatientName();
  }, [patientId]);

  // Removed local logout dropdown handling in favor of global navbar

  // Back handled inline via navigate

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Remove the handleSymptomToggle function since we no longer have symptoms array
  // const handleSymptomToggle = (symptom: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     symptoms: prev.symptoms.includes(symptom)
  //       ? prev.symptoms.filter(s => s !== symptom)
  //       : [...prev.symptoms, symptom]
  //   }));
  // };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };



  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    console.log('handleNext called, advancing to step 4');
    scrollToTop('smooth'); // Smooth scroll when moving to next step
    setCurrentStep(4);
  };

  const handleAppointmentSelected = (date: string, time: string, datetime: string) => {
    setAppointmentDate(date);
    setAppointmentTime(time);
    setAppointmentDatetime(datetime);
    setCurrentStep(3); // Move to consultation form
    scrollToTop('smooth'); // Scroll to top when moving to step 3
  };

  // Enhanced file upload function with proper sequencing
  const uploadFilesToSupabase = async (files: File[], consultationId: string, appointmentId: string) => {
    const uploadedFiles = [];
    console.log(`📁 Starting file upload for appointment: ${appointmentId}`);
    
    for (const file of files) {
      try {
        console.log(`📄 Uploading file: ${file.name}`);
        
        // Create unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${patientId}/${consultationId}/${fileName}`;
        
        // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          continue;
        }
        
        console.log(`✅ File uploaded to storage: ${fileName}`);
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('patient-documents')
          .getPublicUrl(filePath);
        
        // Insert file record into database with appointment_id
        // This will trigger the patient_files trigger -> process_patient_files function
        const { error: dbError } = await supabase
          .from('patient_files')
          .insert({
            consultation_id: consultationId,
            patient_id: patientId,
            doctor_id: selectedDoctor,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            file_category: getFileCategory(file.name),
            appointment_id: appointmentId, // This triggers the webhook
            processed: false,
            processing_status: 'pending'
          });
        
        if (dbError) {
          console.error('❌ Database error:', dbError);
          continue;
        }
        
        console.log(`✅ File record created in database: ${file.name}`);
        
        uploadedFiles.push({
          name: file.name,
          path: filePath,
          url: urlData.publicUrl,
          size: file.size
        });
        
      } catch (error) {
        console.error('💥 File upload error:', error);
      }
    }
    
    console.log(`📁 File upload completed: ${uploadedFiles.length}/${files.length} successful`);
    return uploadedFiles;
  };

  // Helper function to categorize files
  const getFileCategory = (fileName: string): string => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('lab') || lowerName.includes('test') || lowerName.includes('report')) {
      return 'lab_report';
    } else if (lowerName.includes('prescription') || lowerName.includes('medication')) {
      return 'prescription';
    } else if (lowerName.includes('xray') || lowerName.includes('mri') || lowerName.includes('ct') || lowerName.includes('scan')) {
      return 'imaging';
    } else if (lowerName.includes('discharge') || lowerName.includes('summary')) {
      return 'discharge_summary';
    }
    return 'medical_document';
  };

  // Enhanced handleSubmit function with better error handling and validation
  const handleSubmit = async () => {
    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);
    
    try {
      // Validate required fields
      if (!selectedDoctor) {
        setSubmitError('Please select a doctor');
        setSubmitLoading(false);
        return;
      }

      if (!appointmentDate || !appointmentTime || !appointmentDatetime) {
        setSubmitError('Please select an appointment time');
        setSubmitLoading(false);
        return;
      }

      if (!formData.concern.trim()) {
        setSubmitError('Please describe your main concern');
        setSubmitLoading(false);
        return;
      }

      console.log('🔄 Starting appointment creation process...');
      console.log('Selected doctor:', selectedDoctor);
      console.log('Appointment datetime:', appointmentDatetime);
      console.log('Files to upload:', uploadedFiles.length);

      // Create a clean medical data object with only essential fields
      const medicalData = {
        concern: formData.concern,
        symptomDuration: formData.symptomDuration,
        chronicIllness: formData.chronicIllness,
        medications: formData.medications,
        additionalNotes: formData.additionalNotes
      };

      console.log('📝 Creating appointment and consultation...');
      
      let appointmentId: string;
      let consultationId: string;
      
      // Use atomic function for creation
      try {
        const { data: creationResult, error: creationError } = await supabase
          .rpc('create_appointment_with_consultation', {
            patient_uuid: patientId,
            doctor_uuid: selectedDoctor,
            appointment_datetime: appointmentDatetime,
            form_data: medicalData,
            files_data: uploadedFiles.map(f => ({
              name: f.name,
              size: f.size,
              type: f.type
            }))
          });

        if (creationError || !creationResult || creationResult.length === 0) {
          throw new Error(creationError?.message || 'Unknown error in atomic function');
        }

        const result = creationResult[0];
        if (!result.success) {
          throw new Error(result.error_message || 'Atomic function returned failure');
        }

        appointmentId = result.appointment_id;
        consultationId = result.consultation_id;
        
        console.log('✅ Appointment and consultation created atomically:', {
          appointmentId,
          consultationId
        });
      } catch (atomicError) {
        console.error('💥 Atomic function failed:', atomicError);
        setSubmitError('Failed to create appointment. Please try again in a moment.');
        setSubmitLoading(false);
        return;
      }

      // NOW upload files with appointment_id (after successful creation)
      if (uploadedFiles.length > 0) {
        console.log('📁 Uploading files with appointment_id...');
        try {
          await uploadFilesToSupabase(uploadedFiles, consultationId, appointmentId);
          console.log('✅ Files uploaded successfully');
          
          console.log('✅ Files uploaded successfully - database trigger will automatically start processing');
          
        } catch (fileError) {
          console.error('⚠️ File upload/processing error:', fileError);
          // Don't fail the entire process if file processing fails
        }
      } else {
        console.log('ℹ️ No files to upload - clinical summary will be generated from form data only');
      }

      console.log('✅ Appointment booking completed successfully');
      console.log('🚀 Workflow Status: Files uploading -> AI processing -> Clinical summary generation');

      // Note: Files are now uploaded with appointment_id directly, so no linking needed
      // AI processing will be triggered automatically by appointment INSERT trigger

      setSubmitSuccess(true);
      setIsSubmitted(true);
      setShowPopup(true);
      
      // Show success message for longer
      setTimeout(() => {
        setShowPopup(false);
        navigate('/dashboard/patient');
      }, 3000);
      
    } catch (err: any) {
      console.error('💥 Unexpected error in handleSubmit:', err);
      setSubmitError('Unexpected error: ' + err.message);
    }
    setSubmitLoading(false);
  };

  // Logout handled via global navbar

  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  // Notifications handled by global navbar

  // Notifications handled by PatientTopNavbar

  // Unified gradient icon style for form section icons
  const gradientIconClass = "mr-2 inline-flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-r from-blue-500 to-teal-500 text-white flex-shrink-0";

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Submission Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your pre-consultation form and documents have been submitted successfully. 
            Your doctor will review this information before your appointment.
          </p>
          {submitSuccess && <p className="text-green-600">Your information has been saved.</p>}
          {submitError && <p className="text-red-600">{submitError}</p>}
          <button
            onClick={() => navigate('/my-appointments')}
            className="mt-6 bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-teal-600 font-semibold"
          >
            View My Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <PatientSidebar />
      <PatientTopNavbar />
      {/* Popup Message */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
            <p className="text-gray-600">Your information is submitted to your doctor</p>
          </div>
        </div>
      )}

      {/* Global header is provided by PatientTopNavbar */}

      {/* Progress Bar */}
      {/* Progress bar moved into cards' headers */}

      {/* Notification dropdown handled by PatientTopNavbar */}

      {/* Main Content */}
      <div className="pt-[100px] min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back to Dashboard button removed */}

          {currentStep === 1 ? (
            // Step 1: Select Doctor
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Select Your Doctor</h1>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>4</div>
                </div>
              </div>
              {loadingDoctors ? (
                <div className="text-blue-600">Loading doctors...</div>
              ) : doctorError ? (
                <div className="text-red-600">{doctorError}</div>
              ) : (
                <div className="mb-8" ref={doctorDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doctor *</label>
                  {/* Custom dropdown */}
                  <button
                    type="button"
                    onClick={() => setIsDoctorDropdownOpen(v => !v)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <span className="flex items-center space-x-3">
                      <span
                        className={`inline-block h-[30px] w-[30px] rounded-full border ${selectedDoctor ? 'border-blue-600' : 'border-gray-300'} overflow-hidden`}
                        style={{ minWidth: 30, minHeight: 30 }}
                      >
                        {selectedDoctor ? (
                          (() => {
                            const doc = doctors.find(d => d.id === selectedDoctor);
                            return doc?.profile_image_url ? (
                              <img src={doc.profile_image_url} alt="doctor" className="h-[30px] w-[30px] rounded-full object-cover" />
                            ) : (
                              <div className="h-[30px] w-[30px] rounded-full bg-gray-200" />
                            );
                          })()
                        ) : (
                          <div className="h-[30px] w-[30px] rounded-full bg-gray-200" />
                        )}
                      </span>
                      <span className={`${selectedDoctor ? 'text-blue-600 font-bold' : 'text-gray-800'} flex items-center`}>
                        {selectedDoctor ? (
                          (() => {
                            const doc = doctors.find(d => d.id === selectedDoctor);
                            return `Dr. ${doc?.full_name || ''} (${formatSpecialtyDisplay(doc?.doctor_speciality || '')})`;
                          })()
                        ) : 'Select a doctor'}
                      </span>
                    </span>
                    <span className="ml-4 text-gray-400">▾</span>
                  </button>
                  {isDoctorDropdownOpen && (
                    <div className="mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto">
                    {doctors.map(doc => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => { setSelectedDoctor(doc.id); setIsDoctorDropdownOpen(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center space-x-3 group"
                        >
                          <span className="relative flex items-center">
                            <span className="inline-block h-[30px] w-[30px] rounded-full border border-gray-300 overflow-hidden group-hover:border-blue-500" style={{ minWidth: 30, minHeight: 30 }}>
                              {doc.profile_image_url ? (
                                <img src={doc.profile_image_url} alt="doctor" className="h-[30px] w-[30px] rounded-full object-cover" />
                              ) : (
                                <div className="h-[30px] w-[30px] rounded-full bg-gray-200" />
                              )}
                            </span>
                          </span>
                          <span className="flex-1 flex items-center">
                            <span className="font-medium text-gray-800 group-hover:text-blue-600">{`Dr. ${doc.full_name}`}</span>
                            <span className="text-gray-500 ml-2">({formatSpecialtyDisplay(doc.doctor_speciality)})</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => selectedDoctor && setCurrentStep(2)}
                  className={`bg-gradient-to-r from-blue-500 to-teal-500 text-white px-8 py-3 rounded-xl transition-all duration-300 font-semibold flex items-center space-x-2 ${!selectedDoctor ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-teal-600'}`}
                  disabled={!selectedDoctor}
                >
                  <span>Next: Select Appointment</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : currentStep === 2 ? (
            // Step 2: Appointment Scheduling
            <AppointmentScheduler
              doctorId={selectedDoctor}
              onAppointmentSelected={handleAppointmentSelected}
              onBack={() => setCurrentStep(1)}
              currentStep={2}
            />
          ) : currentStep === 3 ? (
            // Step 3: Pre-consultation Form
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Pre-Consultation Form</h1>
                  <p className="text-gray-600">Please fill out this form to help your doctor prepare for your appointment.</p>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>4</div>
                </div>
              </div>



              <form className="space-y-8">
                {/* Concern */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className={gradientIconClass}>
                      <AlertCircle className="h-4 w-4" />
                    </span>
                    What is your concern today? *
                  </h2>
                  <div>
                    <textarea
                      name="concern"
                      value={formData.concern}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your main symptoms or concerns..."
                      required
                    />
                  </div>
                </div>

                {/* Symptom Duration */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className={gradientIconClass}>
                      <Clock className="h-4 w-4" />
                    </span>
                    How long have you had these symptoms?
                  </h2>
                  <div>
                    <textarea
                      name="symptomDuration"
                      value={formData.symptomDuration}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe how long you've been experiencing these symptoms (e.g., 'Started 3 days ago', 'Since last Tuesday', 'About 2 weeks now')..."
                    />
                  </div>
                </div>

                {/* Chronic Illness */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className={gradientIconClass}>
                      <Heart className="h-4 w-4" />
                    </span>
                    Are you having any chronic illness?
                  </h2>
                  <div>
                    <textarea
                      name="chronicIllness"
                      value={formData.chronicIllness}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="List any chronic conditions like diabetes, hypertension, etc. (if any)..."
                    />
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className={gradientIconClass}>
                      <Pill className="h-4 w-4" />
                    </span>
                    Are you currently taking any medications?
                  </h2>
                  <div>
                    <textarea
                      name="medications"
                      value={formData.medications}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="List medications including Ayurvedic and over-the-counter medicines, dosages, and frequency (if any)..."
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className={gradientIconClass}>
                      <FileText className="h-4 w-4" />
                    </span>
                    Additional Notes
                  </h2>
                  <div>
                    <textarea
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any additional information you'd like your doctor to know..."
                    />
                  </div>
                </div>

                {/* Next and Back Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={formData.concern ? handleNext : undefined}
                    className={`bg-gradient-to-r from-blue-500 to-teal-500 text-white px-8 py-3 rounded-xl transition-all duration-300 font-semibold flex items-center space-x-2 ${!formData.concern ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-teal-600'}`}
                    disabled={!formData.concern}
                  >
                    <span>Next: Upload Documents</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Step 4: Document Upload
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Medical Documents</h1>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
                  <div className={`h-0.5 w-6 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>4</div>
                </div>
              </div>

              {/* Upload Area */}
              <div className="mb-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Upload Documents</h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop files here, or click to select files
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer inline-block"
                  >
                    Select Files
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
                  </p>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Documents</h3>
                  <div className="space-y-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-800">{file.name}</p>
                            <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.name.toLowerCase().endsWith('.pdf') && file.url && (
                            <button
                              onClick={() => { if (file.url) setSelectedPdf(file.url); }}
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              View
                            </button>
                          )}
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-700 transition-colors duration-200"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedPdf && (
                    <div className="mt-6 border rounded-lg overflow-hidden" style={{height: '600px'}}>
                      <iframe
                        src={selectedPdf + '#toolbar=0&navpanes=0&scrollbar=0'}
                        title="PDF Preview"
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Document Types Suggestion */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-blue-800 mb-3">Helpful Document Types to Upload:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>• Lab reports and test results</div>
                  <div>• Previous prescriptions</div>
                  <div>• Imaging reports (X-rays, MRI, CT scans)</div>
                  <div>• Discharge summaries</div>
                  <div>• Specialist consultation notes</div>
                  <div>• Vaccination records</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold flex items-center space-x-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold flex items-center space-x-2"
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientViewPage;