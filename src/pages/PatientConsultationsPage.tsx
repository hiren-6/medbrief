import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, ChevronUp, Plus, Lock, FileText, Download, Calendar, Phone, Mail, AlertCircle, Pill, Activity, Brain, Heart, Clock, CheckCircle } from 'lucide-react';
import { useScrollToTop } from '../hooks/useScrollToTop';
import ProfileImage from '../components/ProfileImage';
import NotificationDropdown from '../components/NotificationDropdown';
import PatientSidebar from '../components/PatientSidebar';
import PatientTopNavbar from '../components/PatientTopNavbar';
import { formatDateTimeIST, formatTimeIST, formatDateIST, getCurrentISTDateString } from '../utils/timezone';

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

interface Consultation {
  id: string;
  doctor_id: string;
  form_data: any;
  created_at: string;
  doctor?: { full_name: string; doctor_speciality: string; profile_image_url?: string };
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_datetime: string;
  status: string;
  consultation_id: string;
}

interface PatientFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_category: string;
  uploaded_at: string;
  processed_by_ai: boolean;
  ai_summary?: string;
}

interface ClinicalSummary {
  id: string;
  consultation_id: string;
  patient_id: string;
  summary_json: {
    urgency: string;
    medications: {
      past: string[];
      active: string[];
    };
    current_symptoms: string[];
    past_investigations: string[];
    past_medical_events: string[];
    short_clinical_synopsis: string;
    potential_conflicts_gaps: string[];
    ai_insights_and_suggestions: {
      next_steps: {
        tests_to_consider: string[];
        referrals_to_consider: string[];
        medications_to_review_start: string[];
      };
      urgency_flags: string[];
      relevance_to_cardiology: string[];
    };
  };
  model_version: string;
  prompt_version: string;
  processing_status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

const PatientConsultationsPage: React.FC = () => {
  // Scroll to top on page load
  useScrollToTop();
  
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [appointments, setAppointments] = useState<Record<string, Appointment>>({});
  const [patientFiles, setPatientFiles] = useState<Record<string, PatientFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Notification UI moved to global top navbar
  const [clinicalSummaries, setClinicalSummaries] = useState<Record<string, ClinicalSummary>>({});
  const [aiProcessingStatus, setAiProcessingStatus] = useState<Record<string, string>>({});
  // Add state for collapsible status groups with default values
  const [expandedStatusGroups, setExpandedStatusGroups] = useState({
    scheduled: true,  // Expanded by default
    checked: false,   // Collapsed by default
    cancelled: false  // Collapsed by default
  });
  const navigate = useNavigate();

  // Toggle status group expansion
  const toggleStatusGroup = (status: 'scheduled' | 'checked' | 'cancelled') => {
    setExpandedStatusGroups(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showLogout && !target.closest('.logout-dropdown')) {
        setShowLogout(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogout]);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();
      if (!profile || profile.role !== 'patient') {
        navigate('/dashboard/patient');
        return;
      }
      setUserName(profile.full_name || '');
    };
    checkRole();
  }, [navigate]);

  useEffect(() => {
    const fetchConsultations = async () => {
      setLoading(true);
      setError('');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not logged in.');
        setLoading(false);
        return;
      }
      setPatientId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setUserName(profile?.full_name || '');
      
      // Fetch consultations
      const { data, error } = await supabase
        .from('consultations')
        .select('id, doctor_id, form_data, created_at')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        setError('Failed to fetch consultations: ' + error.message);
        setLoading(false);
        return;
      }
      
      // Fetch doctor info
      const doctorIds = Array.from(new Set((data || []).map((c: any) => c.doctor_id)));
      let doctorsMap: Record<string, { full_name: string; doctor_speciality: string; profile_image_url?: string }> = {};
      if (doctorIds.length > 0) {
        const { data: doctors } = await supabase
          .from('profiles')
          .select('id, full_name, doctor_speciality, profile_image_url')
          .in('id', doctorIds);
        if (doctors) {
          doctorsMap = Object.fromEntries(doctors.map((d: any) => [d.id, { full_name: d.full_name, doctor_speciality: d.doctor_speciality, profile_image_url: d.profile_image_url }]));
        }
      }
      
      const consultationsWithDoctor = (data || []).map((c: any) => ({
        ...c,
        doctor: doctorsMap[c.doctor_id] || { full_name: 'Unknown', doctor_speciality: '' },
      }));
      // Fetch appointments for each consultation
      const appointmentsMap: Record<string, Appointment> = {};
      for (const consultation of consultationsWithDoctor) {
        const { data: appointmentData } = await supabase
          .from('appointments')
          .select('*')
          .eq('consultation_id', consultation.id)
          .single();
        if (appointmentData) {
          appointmentsMap[consultation.id] = appointmentData;
        }
      }
      setAppointments(appointmentsMap);

      // Fetch clinical summaries for each consultation
      const summariesMap: Record<string, ClinicalSummary> = {};
      const processingStatusMap: Record<string, string> = {};
      
      for (const consultation of consultationsWithDoctor) {
        // Get clinical summary
        const { data: summaryData } = await supabase
          .from('clinical_summaries')
          .select('*')
          .eq('consultation_id', consultation.id)
          .single();
        
        if (summaryData) {
          summariesMap[consultation.id] = summaryData;
        }

        // Get AI processing status from appointments
        const appointment = appointmentsMap[consultation.id];
        if (appointment) {
          processingStatusMap[consultation.id] = appointment.ai_processing_status || 'pending';
        }
      }
      
      setClinicalSummaries(summariesMap);
      setAiProcessingStatus(processingStatusMap);
      
      // Sort consultations by appointment datetime (earliest first)
      const consultationsWithAppointments = consultationsWithDoctor.filter(consultation => 
        appointmentsMap[consultation.id]
      );
      
      consultationsWithAppointments.sort((a, b) => {
        const appointmentA = appointmentsMap[a.id];
        const appointmentB = appointmentsMap[b.id];
        
        if (!appointmentA || !appointmentB) return 0;
        
        const dateA = new Date(appointmentA.appointment_datetime);
        const dateB = new Date(appointmentB.appointment_datetime);
        
        return dateA.getTime() - dateB.getTime(); // Ascending order (earliest first)
      });
      
      setConsultations(consultationsWithAppointments);
      
      // Fetch files for each consultation
      const filesMap: Record<string, PatientFile[]> = {};
      for (const consultation of consultationsWithDoctor) {
        const { data: files } = await supabase
          .from('patient_files')
          .select('*')
          .eq('consultation_id', consultation.id)
          .order('uploaded_at', { ascending: false });
        filesMap[consultation.id] = files || [];
      }
      setPatientFiles(filesMap);
      
      setLoading(false);
      if ((data || []).length === 0) {
        navigate('/pre-consult');
      }
    };
    fetchConsultations();
  }, [navigate]);

  useEffect(() => {
    // Keep realtime updates for clinical summaries and appointments; notification moved to global navbar
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ch1 = supabase
        .channel(`clinical_summaries_${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clinical_summaries', filter: `patient_id=eq.${user.id}` }, (payload) => {
            const newSummary = payload.new as ClinicalSummary;
          setClinicalSummaries(prev => ({ ...prev, [newSummary.consultation_id]: newSummary }));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clinical_summaries', filter: `patient_id=eq.${user.id}` }, (payload) => {
            const updatedSummary = payload.new as ClinicalSummary;
          setClinicalSummaries(prev => ({ ...prev, [updatedSummary.consultation_id]: updatedSummary }));
        })
        .subscribe();

      const ch2 = supabase
        .channel(`appointments_${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `patient_id=eq.${user.id}` }, (payload) => {
            const updatedAppointment = payload.new as any;
          setAiProcessingStatus(prev => ({ ...prev, [updatedAppointment.consultation_id]: updatedAppointment.ai_processing_status || 'pending' }));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(ch1);
        supabase.removeChannel(ch2);
    };
    };
    const cleanupPromise = setupRealtime();
    return () => {
      // cleanup managed within setupRealtime
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const downloadFile = async (file: PatientFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .download(file.file_path);
      
      if (error) {
        console.error('Download error:', error);
        return;
      }
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Helper function to get filled form data (essential medical data only)
  const getFilledFormData = (formData: any) => {
    const filled: Record<string, any> = {};
    
    // New simplified form structure
    if (formData.concern) filled.concern = formData.concern;
    if (formData.symptomDuration) filled.symptomDuration = formData.symptomDuration;
    if (formData.chronicIllness) filled.chronicIllness = formData.chronicIllness;
    if (formData.medications) filled.medications = formData.medications;
    if (formData.additionalNotes) filled.additionalNotes = formData.additionalNotes;
    
    // Legacy field names for backward compatibility
    if (formData.chiefComplaint) filled.chiefComplaint = formData.chiefComplaint;
    if (formData.symptoms && formData.symptoms.length > 0) filled.symptoms = formData.symptoms;
    if (formData.additionalSymptoms) filled.additionalSymptoms = formData.additionalSymptoms;
    if (formData.allergies) filled.allergies = formData.allergies;
    if (formData.chronicConditions) filled.chronicConditions = formData.chronicConditions;
    
    return filled;
  };

  // Helper function to format field names (essential medical data only)
  const formatFieldName = (key: string): string => {
    const fieldMappings: Record<string, string> = {
      // New fields
      concern: 'What is your concern today?',
      symptomDuration: 'How long have you had these symptoms?',
      chronicIllness: 'Are you having any chronic illness?',
      medications: 'Are you on any medications?',
      additionalNotes: 'Any other notes for your doctor?',
      // Legacy fields for backward compatibility
      chiefComplaint: 'Chief Complaint',
      severityLevel: 'Severity',
      symptoms: 'Current Symptoms',
      additionalSymptoms: 'Other Symptoms',
      allergies: 'Allergies',
      chronicConditions: 'Chronic Conditions'
    };
    
    return fieldMappings[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Helper function to format field values
  const formatFieldValue = (key: string, value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (key === 'severityLevel') {
      return `${value}/5`;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return value?.toString() || '';
  };

  // Helper function to get icon for field category (essential medical data only)
  const getFieldIcon = (key: string) => {
    const iconMappings: Record<string, any> = {
      // New fields
      concern: AlertCircle,
      symptomDuration: Clock,
      chronicIllness: Heart,
      medications: Pill,
      additionalNotes: FileText,
      // Legacy fields for backward compatibility
      chiefComplaint: AlertCircle,
      severityLevel: Activity,
      symptoms: Activity,
      additionalSymptoms: Brain,
      allergies: AlertCircle,
      chronicConditions: Heart
    };
    
    return iconMappings[key] || AlertCircle;
  };

  // Helper function to get file category icon
  const getFileCategoryIcon = (category: string) => {
    const iconMappings: Record<string, any> = {
      lab_report: Activity,
      prescription: Pill,
      imaging: Brain,
      discharge_summary: FileText,
      medical_document: FileText
    };
    
    return iconMappings[category] || FileText;
  };

  // Group appointments by status and sort within each group
  const groupAppointmentsByStatus = (consultations: Consultation[], appointments: Record<string, Appointment>) => {
    const grouped = {
      scheduled: [] as Consultation[],
      checked: [] as Consultation[],
      cancelled: [] as Consultation[]
    };

    consultations.forEach(consultation => {
      const appointment = appointments[consultation.id];
      if (appointment) {
        const status = appointment.status as keyof typeof grouped;
        if (grouped[status]) {
          grouped[status].push(consultation);
        }
      }
    });

    // Sort each group by appointment datetime (nearest first)
    Object.keys(grouped).forEach(status => {
      grouped[status as keyof typeof grouped].sort((a, b) => {
        const appointmentA = appointments[a.id];
        const appointmentB = appointments[b.id];
        
        if (!appointmentA || !appointmentB) return 0;
        
        const dateA = new Date(appointmentA.appointment_datetime);
        const dateB = new Date(appointmentB.appointment_datetime);
        
        return dateA.getTime() - dateB.getTime(); // Ascending order (nearest first)
      });
    });

    return grouped;
  };

  // Get status group display info
  const getStatusGroupInfo = (status: string) => {
    const statusInfo = {
      scheduled: {
        title: 'Scheduled Appointments',
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        icon: Calendar
      },
      checked: {
        title: 'Completed Appointments',
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        icon: CheckCircle
      },
      cancelled: {
        title: 'Cancelled Appointments',
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        icon: AlertCircle
      }
    };

    return statusInfo[status as keyof typeof statusInfo] || statusInfo.scheduled;
  };

  // Helper function to format appointment date and time in IST
  const formatAppointmentDateTime = (appointment: Appointment) => {
    // Get appointment date in IST properly using our utility
    const appointmentDateIST = formatDateIST(appointment.appointment_datetime, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Get current date in IST properly
    const currentDateIST = getCurrentISTDateString();
    
    // Calculate tomorrow's date in IST
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowDateIST = tomorrowDate.toLocaleDateString('en-CA', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
    
    let dateDisplay = '';
    if (appointmentDateIST === currentDateIST) {
      dateDisplay = 'Today';
    } else if (appointmentDateIST === tomorrowDateIST) {
      dateDisplay = 'Tomorrow';
    } else {
      dateDisplay = formatDateIST(appointment.appointment_datetime, {
        weekday: 'long', 
        month: 'short', 
        day: 'numeric'
      });
    }
    
    // Use our timezone utility for time formatting
    const timeDisplay = formatTimeIST(appointment.appointment_datetime);
    
    return { dateDisplay, timeDisplay };
  };

  // Helper functions for AI summaries removed - not shown to patients

  // Unified gradient icon style to match booking step 3 theme
  const gradientIconClass = "mr-2 inline-flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-r from-blue-500 to-teal-500 text-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pl-16">
      <PatientSidebar />
      <PatientTopNavbar />
      <div className="pt-[90px] max-w-4xl mx-auto px-4">
        <div className="mb-4" />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No appointments found.</div>
            <button
              onClick={() => navigate('/pre-consult')}
              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all duration-300"
            >
              Book Your First Appointment
            </button>
          </div>
        ) : (
          (() => {
            const groupedAppointments = groupAppointmentsByStatus(consultations, appointments);
            const statusOrder: (keyof typeof groupedAppointments)[] = ['scheduled', 'checked', 'cancelled'];
            
            return (
              <div className="space-y-8">
                {statusOrder.map(status => {
                  const statusConsultations = groupedAppointments[status];
                  if (statusConsultations.length === 0) return null; // Hide empty groups
                  
                  const statusInfo = getStatusGroupInfo(status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={status} className={`${statusInfo.bgColor} rounded-3xl p-6`}>
                      {/* Group Header - Now Clickable */}
                      <button
                        onClick={() => toggleStatusGroup(status)}
                        className="w-full flex items-center justify-between mb-6 hover:opacity-80 transition-opacity duration-200 focus:outline-none"
                      >
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`h-6 w-6 ${statusInfo.textColor}`} />
                          <h2 className={`text-2xl font-bold ${statusInfo.textColor}`}>
                            {statusInfo.title}
                          </h2>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/70 ${statusInfo.textColor}`}>
                            {statusConsultations.length} appointment{statusConsultations.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`${statusInfo.textColor} transition-transform duration-200 ${
                            expandedStatusGroups[status] ? 'rotate-180' : ''
                          }`}>
                            <ChevronDown className="h-6 w-6" />
                          </span>
                        </div>
                      </button>
                      
                      {/* Appointments in this group - Now Collapsible */}
                      {expandedStatusGroups[status] && (
                        <div className="grid gap-4">
                        {statusConsultations.map((consultation, groupIdx) => {
                          // Calculate unique index across all groups for openIndex state
                          const uniqueIdx = statusOrder.slice(0, statusOrder.indexOf(status))
                            .reduce((acc, prevStatus) => acc + groupedAppointments[prevStatus].length, 0) + groupIdx;
                          
                          const filledData = getFilledFormData(consultation.form_data || {});
                          const files = patientFiles[consultation.id] || [];
                          const appointment = appointments[consultation.id];
                          const { dateDisplay, timeDisplay } = appointment ? formatAppointmentDateTime(appointment) : { dateDisplay: '', timeDisplay: '' };
                          
                          return (
                            <div key={consultation.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
                              {/* Header */}
                              <button
                                className="w-full flex items-center justify-between p-5 focus:outline-none hover:bg-gray-50 transition-colors duration-200"
                                onClick={() => setOpenIndex(openIndex === uniqueIdx ? null : uniqueIdx)}
                                aria-expanded={openIndex === uniqueIdx}
                              >
                                <div className="flex items-center space-x-4">
                                  <ProfileImage imageUrl={consultation.doctor?.profile_image_url} size="lg" className="border-2 border-blue-200" alt={`Dr. ${consultation.doctor?.full_name}`} />
                                  <div className="text-left">
                                    <h3 className="text-xl font-bold text-gray-800">
                                      Dr. {consultation.doctor?.full_name}
                                    </h3>
                                    <p className="text-blue-600 font-medium">
                                      {formatSpecialtyDisplay(consultation.doctor?.doctor_speciality || '')}
                                    </p>
                                    {appointment && (
                                      <div className="flex items-center space-x-4 mt-1">
                                        <div className="flex items-center space-x-1 text-gray-600">
                                          <Clock className="h-4 w-4" />
                                          <span className="text-sm font-medium">{dateDisplay} at {timeDisplay}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  {files.length > 0 && (
                                    <div className="flex items-center space-x-1 text-blue-600">
                                      <FileText className="h-4 w-4" />
                                      <span className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                  <span className="text-blue-600">
                                    {openIndex === uniqueIdx ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                                  </span>
                                </div>
                              </button>

                              {/* Collapsible Content */}
                              {openIndex === uniqueIdx && (
                                <div className="border-t border-gray-100 p-5 space-y-6">
                                  {/* Booking Information */}
                                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                      <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                                      Booking Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-semibold text-gray-700">Booked on:</span>
                                        <span className="ml-2 text-gray-600">
                                          {new Date(consultation.created_at).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      {appointment && (
                                        <div>
                                          <span className="font-semibold text-gray-700">Appointment:</span>
                                          <span className="ml-2 text-gray-600">
                                            {formatDateIST(appointment.appointment_datetime, {
                                              weekday: 'long',
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })} at {formatTimeIST(appointment.appointment_datetime)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Filled Form Data */}
                                  {Object.keys(filledData).length > 0 && (
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                        <span className={gradientIconClass}>
                                          <AlertCircle className="h-4 w-4" />
                                        </span>
                                        Pre-Consultation Information
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(filledData).map(([key, value]) => {
                                          const Icon = getFieldIcon(key);
                                          return (
                                            <div key={key} className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-100">
                                              <div className="flex items-center space-x-3 mb-2">
                                                <span className={gradientIconClass}>
                                                  <Icon className="h-4 w-4" />
                                                </span>
                                                <span className="font-semibold text-gray-800 text-sm">
                                                  {formatFieldName(key)}
                                                </span>
                                              </div>
                                              <p className="text-gray-700 text-sm">
                                                {formatFieldValue(key, value)}
                                              </p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Uploaded Files */}
                                  {files.length > 0 && (
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                        <span className={gradientIconClass}>
                                          <FileText className="h-4 w-4" />
                                        </span>
                                        Uploaded Documents
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {files.map((file) => {
                                          const FileIcon = getFileCategoryIcon(file.file_category);
                                          return (
                                            <div key={file.id} className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-4 border border-teal-100 overflow-hidden">
                                              <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center space-x-3 min-w-0">
                                                  <span className={`${gradientIconClass} flex-shrink-0`}>
                                                    <FileIcon className="h-4 w-4" />
                                                  </span>
                                                  <div className="min-w-0">
                                                    <p className="font-semibold text-gray-800 text-sm truncate">
                                                      {file.file_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 capitalize truncate">
                                                      {file.file_category.replace('_', ' ')}
                                                    </p>
                                                  </div>
                                                </div>
                                                <button
                                                  onClick={() => downloadFile(file)}
                                                  className="text-teal-600 hover:text-teal-700 transition-colors duration-200 flex-shrink-0"
                                                  title="Download file"
                                                  aria-label={`Download ${file.file_name}`}
                                                >
                                                  <Download className="h-4 w-4" />
                                                </button>
                                              </div>
                                              <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                                              </div>
                                              {/* AI file summaries removed - not shown to patients */}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* AI Clinical Summary section removed - not shown to patients */}

                                  {/* No Data Message */}
                                  {Object.keys(filledData).length === 0 && files.length === 0 && (
                                    <div className="text-center py-8">
                                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                      <p className="text-gray-500">No information or files available for this appointment.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default PatientConsultationsPage; 