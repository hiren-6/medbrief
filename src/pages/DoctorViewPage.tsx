import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, Phone, Mail, Calendar, Clock, FileText, AlertTriangle, CheckCircle, Check, Search, ChevronDown, ChevronUp, Heart, Activity, Scale, Ruler, Wine, Dumbbell, X, Sparkles, Pill } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AppointmentStatusService } from '../services/AppointmentStatusService';
import { AppointmentCacheService } from '../services/AppointmentCacheService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTimeIST, formatDateIST_DDMMMYYYY, formatDateTimeIST_DDMMMYYYY } from '../utils/timezone';
// 1. Import ProfileImage at the top
import ProfileImage from '../components/ProfileImage';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorTopNavbar from '../components/DoctorTopNavbar';
import AIGenerationProgress from '../components/AIGenerationProgress';
import FloatingChatButton from '../components/FloatingChatButton';
import ConsultationChatWidget from '../components/ConsultationChatWidget';
// 1. Import VITE_SUPABASE_URL at the top
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  appointmentDate: string;
  appointmentTime: string;
  chiefComplaint: string;
  phone: string;
  email: string;
  status: 'scheduled' | 'in-progress' | 'checked' | 'cancelled';
}

interface PatientDetail {
  // Personal Information
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  profile_image_url?: string;
  
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

interface ComplaintData {
  // New simplified form structure
  concern: string;
  symptomDuration: string;
  chronicIllness: string;
  medications: string;
  additionalNotes: string;
  // Legacy fields for backward compatibility
  chiefComplaint: string;
  severityLevel: number;
  symptoms: string[];
  additionalSymptoms: string;
  allergies: string;
  chronicConditions: string;
}

interface PatientDocument {
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
      // Dynamic speciality-aware relevance key(s), e.g., relevance_to_cardiology, relevance_to_neurology
      [key: string]: any;
    };
  };
  model_version: string;
  prompt_version: string;
  processing_status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// 2. Add a helper to get the public URL for a file
const getPublicFileUrl = (filePath: string) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return `${supabaseUrl}/storage/v1/object/public/patient-documents/${filePath}`;
};

const DoctorViewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tab4' | 'patient-detail' | 'tab3'>('tab4');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<PatientDocument | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  // const [userName, setUserName] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary | null>(null);
  const [aiProcessingStatus, setAiProcessingStatus] = useState<string>('pending');
  const [progressEvents, setProgressEvents] = useState<any[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [revealCards, setRevealCards] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState({
    scheduled: true,
    checked: false, // Collapsed by default
    cancelled: true
  });
  const [showCompletionHold, setShowCompletionHold] = useState<boolean>(false);
  const [hasShownCompletionHold, setHasShownCompletionHold] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  
  // State for clinical summary collapsible sections
  const [expandedStatusGroups, setExpandedStatusGroups] = useState({
    clinicalSummary: true,
    urgency: true,
    currentSymptoms: true,
    pastMedicalEvents: true,
    pastInvestigations: true,
    currentMedications: true,
    pastMedications: true,
    urgencyFlags: true,
    conflictsGaps: true,
    cardiologyRelevance: true,
    testsToConsider: true,
    medicationsToReview: true,
    referralsToConsider: true,
    clinicalSynopsis: true
  });
  // Profile dropdown moved to sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  // Handle reset signal when navigating to the same dashboard route (e.g., clicking Home while already there)
  useEffect(() => {
    const state = (location.state as any) || {};
    if (state.resetConsultation) {
      setSelectedPatient(null);
      setActiveTab('tab4');
      setSelectedDate(new Date());
      // Clear the navigation state so it doesn't re-trigger on re-renders
      navigate('/dashboard/doctor', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Fetch appointments and patients handled per-date

  // Fetch appointments for a specific date
  const fetchAppointmentsForDate = async (date: Date) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Create date range for the selected date (start and end of day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Debug: Log the date range and user ID
      console.log('Fetching appointments for date:', date.toISOString());
      console.log('Date range:', { startOfDay: startOfDay.toISOString(), endOfDay: endOfDay.toISOString() });
      console.log('Doctor ID:', user.id);

      // Fetch appointments for this doctor on the specific date
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*, consultations!appointments_consultation_id_fkey(*)')
        .eq('doctor_id', user.id)
        .gte('appointment_datetime', startOfDay.toISOString())
        .lte('appointment_datetime', endOfDay.toISOString())
        .order('appointment_datetime', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        return;
      }

      console.log('Appointments found:', appointmentsData?.length || 0);
      console.log('Appointments data:', appointmentsData);

      const appointments = appointmentsData || [];

      // Fetch patient profiles and any available AI chief complaints from clinical summaries
      if (appointments.length > 0) {
        // Pull any chief_complaint already generated by AI for these consultations
        const consultationIds = Array.from(new Set((appointments as any[])
          .map(a => a.consultation_id)
          .filter((id: string | null | undefined) => !!id)));

        let clinicalSummaryMap: Record<string, any> = {};
        if (consultationIds.length > 0) {
          const { data: summaries, error: summariesError } = await supabase
            .from('clinical_summaries')
            .select('consultation_id, summary_json')
            .in('consultation_id', consultationIds);

          if (summariesError) {
            console.error('Error fetching clinical summaries for chief complaint:', summariesError);
          } else if (summaries) {
            clinicalSummaryMap = Object.fromEntries(
              summaries.map((s: any) => [s.consultation_id, s])
            );
          }
        }

        const patientIds = [...new Set(appointments.map((apt: any) => apt.patient_id))];
        const { data: patientProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, phone, email, date_of_birth, gender, profile_image_url')
          .in('id', patientIds);

        if (profilesError) {
          console.error('Error fetching patient profiles:', profilesError);
        } else {
          const profilesMap = Object.fromEntries((patientProfiles || []).map((profile: any) => [profile.id, profile]));
          
          // Transform appointments to patients
          const transformedPatients: Patient[] = appointments.map((apt: any) => {
            const patientProfile = profilesMap[apt.patient_id] || {};
              // Appointment date object not needed here; using formatted values instead
            // Calculate age
            let age = 0;
            if (patientProfile?.date_of_birth) {
              const birthDate = new Date(patientProfile.date_of_birth);
              age = new Date().getFullYear() - birthDate.getFullYear();
              const monthDiff = new Date().getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) {
                age--;
              }
            }

            // Extract consultation data robustly
            let chiefComplaint = '';
            let consultation = apt.consultations;
            // Debug: log the consultation structure
            console.log('Consultation for appointment', apt.id, consultation);
            if (Array.isArray(consultation) && consultation.length > 0) {
              const formData = consultation[0]?.form_data || {};
              chiefComplaint = formData.cheifcomplaint || formData.chiefComplaint || '';
            } else if (consultation && typeof consultation === 'object') {
              const formData = consultation.form_data || {};
              chiefComplaint = formData.cheifcomplaint || formData.chiefComplaint || '';
            }
            if (!chiefComplaint && apt.notes) chiefComplaint = apt.notes;

            // Prefer AI-generated chief complaint if available from clinical_summaries
            const aiChief = clinicalSummaryMap?.[apt.consultation_id]?.summary_json?.chief_complaint;
            if (typeof aiChief === 'string' && aiChief.trim().length > 0) {
              chiefComplaint = aiChief.trim();
            }

            return {
              id: apt.id,
              name: patientProfile?.full_name || `${patientProfile?.first_name || ''} ${patientProfile?.last_name || ''}`.trim() || 'Unknown Patient',
              age: age,
              gender: patientProfile?.gender || '',
              appointmentDate: formatDateIST_DDMMMYYYY(apt.appointment_datetime),
              appointmentTime: formatTimeIST(apt.appointment_datetime),
              chiefComplaint: chiefComplaint,
              phone: patientProfile?.phone || '',
              email: patientProfile?.email || '',
              status: apt.status || 'scheduled'
            };
          });

          setPatients(transformedPatients);
        }
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient details when a patient is selected
  const fetchPatientDetails = async (appointmentId: string) => {
    try {
      // Get the appointment to find patient_id and consultation_id
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, consultations!appointments_consultation_id_fkey(*)')
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        console.error('Error fetching appointment:', appointmentError);
        return;
      }

      console.log('Appointment data:', appointment);

      // Track current consultation id for realtime filters
      setCurrentConsultationId(appointment.consultation_id || null);

      // Fetch patient profile (Patient Detail tab)
      const { data: patientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', appointment.patient_id)
        .single();

      if (profileError) {
        console.error('Error fetching patient profile:', profileError);
      } else {
        setPatientDetail(patientProfile);
      }

      // Extract complaint data from consultation (Complaint tab)
      const consultation = appointment.consultations;
      const formData = consultation?.form_data || {};
      
      const complaint: ComplaintData = {
        concern: formData.concern || '',
        symptomDuration: formData.symptomDuration || '',
        chronicIllness: formData.chronicIllness || '',
        medications: formData.medications || '',
        additionalNotes: formData.additionalNotes || '',
        chiefComplaint: formData.cheifcomplaint || formData.chiefComplaint || '',
        severityLevel: formData.severityLevel || 0,
        symptoms: formData.symptoms || [],
        additionalSymptoms: formData.additionalSymptoms || '',
        allergies: formData.allergies || '',
        chronicConditions: formData.chronicConditions || ''
      };

      // complaint data no longer stored in component state

      // Fetch patient documents
      console.log('Fetching documents for consultation_id:', appointment.consultation_id);
      let documents = null;
      let documentsError = null;

      // Try to fetch by consultation_id first
      if (appointment.consultation_id) {
        const { data, error } = await supabase
          .from('patient_files')
          .select('*')
          .eq('consultation_id', appointment.consultation_id)
          .order('uploaded_at', { ascending: false });
        
        documents = data;
        documentsError = error;
        console.log('Documents query by consultation_id result:', { documents, documentsError });
      }

      // If no documents found by consultation_id, try by patient_id
      if (!documents || documents.length === 0) {
        console.log('No documents found by consultation_id, trying patient_id:', appointment.patient_id);
        const { data, error } = await supabase
          .from('patient_files')
          .select('*')
          .eq('patient_id', appointment.patient_id)
          .order('uploaded_at', { ascending: false });
        
        documents = data;
        documentsError = error;
        console.log('Documents query by patient_id result:', { documents, documentsError });
      }
      
      if (documentsError) {
        console.error('Error fetching patient documents:', documentsError);
      } else {
        console.log('Setting patient documents:', documents);
        setPatientDocuments(documents || []);
        
        // Auto-expand first category and select first document if available
        if (documents && documents.length > 0) {
          const grouped = groupDocumentsByCategory(documents);
          const firstCategory = Object.keys(grouped)[0];
          if (firstCategory) {
            setExpandedCategories({ [firstCategory]: true });
          }
          setSelectedDocument(documents[0]);
        } else {
          setSelectedDocument(null);
          setExpandedCategories({});
        }
      }

      // Fetch clinical summary
      if (appointment.consultation_id) {
        const { data: summaryData, error: summaryError } = await supabase
          .from('clinical_summaries')
          .select('*')
          .eq('consultation_id', appointment.consultation_id)
          .single();

        if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching clinical summary:', summaryError);
        } else {
          setClinicalSummary(summaryData);
        }

        // Get AI processing status from appointment
        setAiProcessingStatus(appointment.ai_processing_status || 'pending');

        // If summary already exists and processing completed, ensure cards are visible
        if ((appointment.ai_processing_status === 'completed') && summaryData) {
          setRevealCards(true);
        } else {
          setRevealCards(false);
        }
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
    }
  };

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
      if (!profile || profile.role !== 'doctor') {
        navigate('/dashboard');
        return;
      }
      // setUserName(profile.full_name || '');
      await fetchAppointmentsForDate(selectedDate);
    };
    checkRole();
    testDatabaseConnection();
  }, [navigate]);

  // Profile dropdown removed (moved into sidebar)

  useEffect(() => {
    setPdfLoadError(false);
  }, [selectedDocument]);

  const handlePatientClick = async (patientId: string) => {
    setSelectedPatient(patientId);
    setActiveTab('tab4'); // Default to Clinical Summary tab
    await fetchPatientDetails(patientId);
  };

  // Realtime subscriptions for AI progress and summary updates
  useEffect(() => {
    if (!selectedPatient || !currentConsultationId) return;

    let mounted = true;
    const loadExisting = async () => {
      const { data } = await supabase
        .from('ai_progress_events')
        .select('*')
        .eq('appointment_id', selectedPatient)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      setProgressEvents(data || []);
      const maxP = Math.max(0, ...((data || []).map((d: any) => d.progress_percent)));
      setProgressPercent(isFinite(maxP) ? maxP : 0);
    };
    loadExisting();

    const ch = supabase.channel(`ai-progress-${selectedPatient}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_progress_events',
        filter: `appointment_id=eq.${selectedPatient}`
      }, (payload: any) => {
        setProgressEvents(prev => {
          const next = [...prev, payload.new];
          const maxP = Math.max(0, ...next.map((d: any) => d.progress_percent));
          setProgressPercent(isFinite(maxP) ? maxP : 0);
          if (isFinite(maxP) && maxP >= 100 && !hasShownCompletionHold) {
            setRevealCards(false);
            setShowCompletionHold(true);
            setHasShownCompletionHold(true);
            setTimeout(() => setShowCompletionHold(false), 3000);
          }
          return next;
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'clinical_summaries',
        filter: `consultation_id=eq.${currentConsultationId}`
      }, async (payload: any) => {
        const consultationId = payload.new?.consultation_id;
        if (!consultationId) return;
        const { data } = await supabase
          .from('clinical_summaries')
          .select('*')
          .eq('consultation_id', consultationId)
          .single();
        setClinicalSummary(data || null);
        setAiProcessingStatus('completed');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `id=eq.${selectedPatient}`
      }, (payload: any) => {
        const newStatus = payload.new?.ai_processing_status;
        if (newStatus) setAiProcessingStatus(newStatus);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [selectedPatient, currentConsultationId]);

  // Polling fallback every 1s to ensure visible live updates
  useEffect(() => {
    if (!selectedPatient) return;

    let mounted = true;
    const shouldPoll = aiProcessingStatus !== 'completed' || !clinicalSummary;
    if (!shouldPoll) return;

    const poll = async () => {
      if (!mounted) return;
      try {
        // Progress events
        const { data: events } = await supabase
          .from('ai_progress_events')
          .select('*')
          .eq('appointment_id', selectedPatient)
          .order('created_at', { ascending: true });
        if (mounted && events) {
          setProgressEvents(events);
          const maxP = Math.max(0, ...events.map((d: any) => d.progress_percent));
          setProgressPercent(isFinite(maxP) ? maxP : 0);
        }

        // Appointment status (keep UI in sync)
        const { data: apt } = await supabase
          .from('appointments')
          .select('ai_processing_status')
          .eq('id', selectedPatient)
          .single();
        if (mounted && apt?.ai_processing_status) {
          setAiProcessingStatus(apt.ai_processing_status);
        }

        // Clinical summary presence
        if (currentConsultationId && !clinicalSummary) {
          const { data: sum } = await supabase
            .from('clinical_summaries')
            .select('*')
            .eq('consultation_id', currentConsultationId)
            .single();
          if (mounted && sum) {
            setClinicalSummary(sum);
            setAiProcessingStatus('completed');
            if (!showCompletionHold) {
              setRevealCards(true);
            }
          }
        }
      } catch (_e) {
        // ignore network errors in polling
      }
    };

    // immediate tick then interval
    poll();
    const id = setInterval(poll, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [selectedPatient, currentConsultationId, aiProcessingStatus, clinicalSummary]);

  // Reveal cards immediately when completed and summary is present
  useEffect(() => {
    if (aiProcessingStatus === 'completed' && clinicalSummary && !showCompletionHold) {
      setRevealCards(true);
    }
  }, [aiProcessingStatus, clinicalSummary, showCompletionHold]);

  // After the 3s completion hold ends, reveal cards if data is ready
  useEffect(() => {
    if (!showCompletionHold && aiProcessingStatus === 'completed' && clinicalSummary) {
      setRevealCards(true);
    }
  }, [showCompletionHold, aiProcessingStatus, clinicalSummary]);

  // Reset transient hold flag when processing restarts or patient changes
  useEffect(() => {
    if (aiProcessingStatus !== 'completed') {
      setHasShownCompletionHold(false);
    }
  }, [aiProcessingStatus, selectedPatient]);

  // Navigate between patients for the same day (filteredPatients order)
  const goToAdjacentPatient = async (direction: 'prev' | 'next') => {
    if (!selectedPatient) return;
    const sameDayPatients = filteredPatients;
    const currentIndex = sameDayPatients.findIndex(p => p.id === selectedPatient);
    if (currentIndex === -1) return;
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= sameDayPatients.length) return;
    const nextPatient = sameDayPatients[newIndex];
    if (!nextPatient) return;
    // Set ID first to keep UI context, then load details and switch to Clinical Summary
    setSelectedPatient(nextPatient.id);
    await fetchPatientDetails(nextPatient.id);
    setActiveTab('tab4');
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setPatientDetail(null);
    setPatientDocuments([]);
    setSelectedDocument(null);
    setExpandedCategories({});
  };

  // Logout handled via sidebar (placeholder removed)

  const handleCheckPatient = async (appointmentId: string) => {
    try {
      // Optimistic UI update
      setPatients(prevPatients =>
        prevPatients.map(patient =>
          patient.id === appointmentId
            ? { ...patient, status: 'checked' as const }
            : patient
        )
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use enhanced service to update status directly with appointment ID
      await AppointmentStatusService.updateStatus({
        appointmentId: appointmentId,
        newStatus: 'checked',
        notes: 'Appointment completed by doctor'
      });

      // Invalidate cache for this doctor
      AppointmentCacheService.invalidateDoctorCache(user.id, selectedDate);

      alert('Appointment marked as checked!');
      console.log('Appointment marked as checked!');
    } catch (error) {
      console.error('Error marking appointment as checked:', error);
      alert('Failed to update appointment: ' + (error as Error).message);
      
      // Revert optimistic update
      await fetchAppointmentsForDate(selectedDate);
    }
  };

  const handleCancelPatient = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      // Optimistic UI update
      setPatients(prevPatients =>
        prevPatients.map(patient =>
          patient.id === appointmentId
            ? { ...patient, status: 'cancelled' as const }
            : patient
        )
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use enhanced service to update status directly with appointment ID
      await AppointmentStatusService.updateStatus({
        appointmentId: appointmentId,
        newStatus: 'cancelled',
        reason: 'Cancelled by doctor'
      });

      // Invalidate cache for this doctor
      AppointmentCacheService.invalidateDoctorCache(user.id, selectedDate);

      alert('Appointment cancelled successfully!');
      console.log('Appointment cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment: ' + (error as Error).message);
      
      // Revert optimistic update
      await fetchAppointmentsForDate(selectedDate);
    }
  };

  const toggleSection = (section: 'scheduled' | 'checked' | 'cancelled') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  // Removed quick action 'Go Today' handler (handled via date picker)

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'lab_report':
      case 'laboratory':
        return '🧪';
      case 'imaging':
      case 'xray':
      case 'mri':
      case 'ct':
        return '📷';
      case 'prescription':
      case 'medication':
        return '💊';
      case 'medical_record':
      case 'history':
        return '📋';
      case 'insurance':
      case 'billing':
        return '💳';
      default:
        return '📄';
    }
  };

  const getDocumentCategoryName = (category: string) => {
    switch (category.toLowerCase()) {
      case 'lab_report':
      case 'laboratory':
        return 'Lab Reports';
      case 'imaging':
      case 'xray':
      case 'mri':
      case 'ct':
        return 'Imaging';
      case 'prescription':
      case 'medication':
        return 'Prescriptions';
      case 'medical_record':
      case 'history':
        return 'Medical Records';
      case 'insurance':
      case 'billing':
        return 'Insurance & Billing';
      case 'discharge_summary':
        return 'Discharge Summaries';
      case 'medical_document':
        return 'Other Documents';
      default:
        return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const groupDocumentsByCategory = (documents: PatientDocument[]) => {
    const grouped: Record<string, PatientDocument[]> = {};
    
    documents.forEach(doc => {
      const category = doc.file_category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(doc);
    });
    
    return grouped;
  };

  // Test function to check all documents in database
  const testDatabaseConnection = async () => {
    console.log('Testing database connection...');
    const { data: allDocuments, error } = await supabase
      .from('patient_files')
      .select('*')
      .limit(10);
    
    console.log('All documents in database:', allDocuments);
    console.log('Error:', error);
  };

  // Filter patients for search
  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.phone.toLowerCase().includes(query) ||
      patient.chiefComplaint.toLowerCase().includes(query)
    );
  });

  // Helper function to sort document categories
  const sortDocumentCategories = (categories: string[]): string[] => {
    const priority = ['prescription', 'lab_report'];
    return categories.sort((a: string, b: string) => {
      const aIndex = priority.indexOf(a.toLowerCase());
      const bIndex = priority.indexOf(b.toLowerCase());
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  // Removed unused helpers

  // Use useEffect to fetch appointments when selectedDate changes
  useEffect(() => {
    fetchAppointmentsForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  if (selectedPatient) {
    const patient = patients.find(p => p.id === selectedPatient);
    if (!patient) return null;

    // legacy PDF generator removed

    const handleDownloadPDF = async () => {
      const html2canvasMod = await import('html2canvas');
      const html2canvas = html2canvasMod.default;

      let doctorName = 'Doctor';
      let doctorEmail = '';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          doctorEmail = user.email || '';
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          if (prof && prof.full_name) doctorName = prof.full_name;
        }
      } catch {}
      const doctorDisplayName = (() => {
        const n = (doctorName || '').trim();
        return /^dr\.?\s/i.test(n) ? n : n ? `Dr. ${n}` : 'Dr.';
      })();

      const sj = clinicalSummary?.summary_json as any | undefined;

      const computeStatus = (result: string | undefined, range: string | undefined): string => {
        if (!result || !range) return '—';
        const num = parseFloat(String(result).replace(/[^0-9.\-]/g, ''));
        const lt = /<\s*([0-9.]+)/.exec(range || '');
        const gt = />\s*([0-9.]+)/.exec(range || '');
        if (!isFinite(num)) return '—';
        if (lt) {
          const max = parseFloat(lt[1]);
          if (isFinite(max)) return num < max ? '✓ Normal' : '⚠️ High';
        }
        if (gt) {
          const min = parseFloat(gt[1]);
          if (isFinite(min)) return num > min ? '✓ Normal' : '⚠️ Low';
        }
        return '—';
      };

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '960px';

      const patientEmail = patientDetail?.email || patient.email || '';
      const dobText = patientDetail?.date_of_birth ? new Date(patientDetail.date_of_birth).toLocaleDateString() : '';
      const urgency = (sj?.urgency || '').toString().toLowerCase();
      const urgencyBadge = urgency === 'urgent' ? '⚠️ URGENT - Requires Immediate Attention' : '';

      const timeline = Array.isArray(sj?.past_medical_events) ? sj!.past_medical_events : [];
      const timelineHtml = (timeline || []).map((t: any) => {
        const date = t?.date || t?.when || '';
        const event = t?.event || t?.name || t?.description || t || '';
        return `<div class=\"timeline-item\"><div class=\"timeline-date\">${String(date)}</div><div class=\"timeline-event\">${String(event)}</div></div>`;
      }).join('');

      const labs = Array.isArray(sj?.past_investigations) ? sj!.past_investigations : [];
      const labRows = (labs || []).map((l: any) => {
        const test = l?.test || l?.name || '';
        const result = l?.result || l?.value || '';
        const ref = l?.reference_range || l?.range || '';
        const status = computeStatus(String(result), String(ref));
        const statusHtml = status.includes('High') || status.includes('Low')
          ? `<span class=\"result-abnormal\">${status}</span>`
          : status.includes('Normal') ? `<span class=\"result-normal\">${status}</span>` : '—';
        return `<tr class=\"page-avoid-break\"><td>${test}</td><td class=\"${status.includes('High')||status.includes('Low')?'result-abnormal':'result-normal'}\">${result || '—'}</td><td>${ref || '—'}</td><td>${statusHtml}</td></tr>`;
      }).join('');

      const medsActive: string[] = Array.isArray(sj?.medications?.active) ? sj!.medications!.active : [];
      const medsHtml = (medsActive && medsActive.length > 0 ? medsActive : ['None']).map(m => (
        `<div class=\"medication-item page-avoid-break\"><div class=\"med-icon\">💊</div><div class=\"med-details\"><div class=\"med-name\">${m}</div><div class=\"med-dose\"></div></div></div>`
      )).join('');

      const testsToConsider: string[] = sj?.ai_insights_and_suggestions?.next_steps?.tests_to_consider || [];
      const medsToReview: string[] = sj?.ai_insights_and_suggestions?.next_steps?.medications_to_review_start || [];
      const referrals: string[] = sj?.ai_insights_and_suggestions?.next_steps?.referrals_to_consider || [];

      const nowText = clinicalSummary?.created_at ? formatDateTimeIST_DDMMMYYYY(clinicalSummary.created_at) : new Date().toLocaleString();

      container.innerHTML = `
<div class=\"container\">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, .container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 40px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -50%; right: -10%; width: 40%; height: 200%; background: rgba(255,255,255,0.05); transform: rotate(35deg); }
    .header-content { position: relative; z-index: 1; text-align: center; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px; }
    .logo-text { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { font-size: 16px; opacity: 0.9; margin-top: 5px; }
    .urgency-badge { display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: #ff4757; color: white; padding: 10px 22px; border-radius: 9999px; font-size: 13px; font-weight: 700; margin-top: 15px; line-height: 1; min-height: 40px; white-space: nowrap; text-align: center; }
    .content { padding: 40px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin-bottom: 35px; }
    .info-card { background: #f8f9fa; border-radius: 15px; padding: 20px; border-left: 4px solid #667eea; }
    .card-title { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #6c757d; margin-bottom: 12px; font-weight: 600; }
    .card-icon { width: 24px; height: 24px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; }
    .card-content { font-size: 16px; color: #2c3e50; line-height: 1.6; }
    .card-content strong { color: #1a1a1a; font-weight: 600; }
    .section { margin-bottom: 35px; }
    .section-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .section-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }
    .clinical-synopsis { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 15px; padding: 25px; border-left: 4px solid #667eea; line-height: 1.8; color: #2c3e50; }
    .timeline { position: relative; padding-left: 30px; }
    .timeline-item { position: relative; padding-bottom: 20px; }
    .timeline-item::before { content: ''; position: absolute; left: -30px; top: 8px; width: 12px; height: 12px; background: #667eea; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .timeline-item::after { content: ''; position: absolute; left: -24px; top: 20px; width: 2px; height: calc(100% - 10px); background: #e9ecef; }
    .timeline-item:last-child::after { display: none; }
    .timeline-date { font-size: 13px; color: #6c757d; font-weight: 600; margin-bottom: 5px; }
    .timeline-event { font-size: 15px; color: #2c3e50; }
    .lab-table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .lab-table th { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; text-align: left; font-size: 14px; font-weight: 600; }
    .lab-table td { padding: 12px 15px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
    .lab-table tr:last-child td { border-bottom: none; }
    .lab-table tr:nth-child(even) { background: #f8f9fa; }
    .lab-table tr:hover { background: #e9ecef; }
    .result-abnormal { color: #ff4757; font-weight: 600; }
    .result-normal { color: #5f27cd; }
    .medication-list { display: grid; gap: 12px; }
    .medication-item { background: white; border: 1px solid #e9ecef; border-radius: 10px; padding: 15px; display: flex; align-items: center; gap: 15px; }
    /* hint to avoid splitting critical cards across pages */
    .page-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .med-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #48dbfb, #0abde3); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
    .med-details { flex: 1; }
    .med-name { font-weight: 600; color: #2c3e50; margin-bottom: 3px; }
    .med-dose { font-size: 13px; color: #6c757d; }
    .recommendation-card { background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); border-radius: 15px; padding: 20px; margin-bottom: 20px; }
    .recommendation-card h4 { color: #2d3436; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .recommendation-list { list-style: none; }
    .recommendation-list li { padding: 8px 0; padding-left: 25px; position: relative; color: #2d3436; }
    .recommendation-list li::before { content: '→'; position: absolute; left: 0; color: #d63031; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; font-size: 13px; }
    .footer-logo { font-weight: 700; color: #667eea; margin-bottom: 5px; }
  </style>
  <div class=\"header\">
    <div class=\"header-content\">
      <div class=\"logo\">
        <div>
          <div class=\"logo-text\">MedBrief AI</div>
          <div class=\"subtitle\">Integrated Medical Summary</div>
        </div>
      </div>
      ${urgencyBadge ? `<div class=\"urgency-badge\">${urgencyBadge}</div>` : ''}
    </div>
  </div>
  <div class=\"content\">
    <div class=\"info-grid\">
      <div class=\"info-card page-avoid-break\">
        <div class=\"card-title\"><div class=\"card-icon\">👤</div>Patient Information</div>
        <div class=\"card-content\">
          <strong>${patient.name || '—'}</strong><br>
          ${patient.age || '—'} years old, ${patient.gender || '—'}<br>
          ${dobText ? `DOB: ${dobText}<br>` : ''}
          ${patientEmail ? `📧 ${patientEmail}` : ''}
        </div>
      </div>
      <div class=\"info-card page-avoid-break\">
        <div class=\"card-title\"><div class=\"card-icon\">👨‍⚕️</div>Attending Physician</div>
        <div class=\"card-content\">
          <strong>${doctorDisplayName}</strong><br>
          Consultation Date: ${patient.appointmentDate || '—'}<br>
          Time: ${patient.appointmentTime || '—'}<br>
          ${doctorEmail ? `📧 ${doctorEmail}` : ''}
        </div>
      </div>
    </div>

    <div class=\"section\">
      <h3 class=\"section-title\"><div class=\"section-icon\">📋</div>Clinical Synopsis</h3>
      <div class=\"clinical-synopsis\">${sj?.short_clinical_synopsis || 'No AI synopsis available.'}</div>
    </div>

    ${timelineHtml ? `<div class=\"section\"><h3 class=\"section-title page-avoid-break\"><div class=\"section-icon\">📅</div>Medical Timeline</h3><div class=\"timeline\">${timelineHtml.replaceAll('class=\\"timeline-item\\"','class=\\"timeline-item page-avoid-break\\"')}</div></div>` : ''}

    ${labRows ? `<div class=\"section\"><h3 class=\"section-title\"><div class=\"section-icon\">🔬</div>Laboratory Results</h3><table class=\"lab-table\"><thead><tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Status</th></tr></thead><tbody>${labRows}</tbody></table></div>` : ''}

    <div class=\"section\">
      <h3 class=\"section-title\"><div class=\"section-icon\">💊</div>Current Medications</h3>
      <div class=\"medication-list\">${medsHtml}</div>
    </div>

    ${(testsToConsider?.length || medsToReview?.length || referrals?.length) ? `
    <div class=\"section\">
      <h3 class=\"section-title\"><div class=\"section-icon\">🏥</div>Cardiology Recommendations</h3>
      ${testsToConsider?.length ? `<div class=\"recommendation-card page-avoid-break\"><h4>⚡ Immediate Tests Required</h4><ul class=\"recommendation-list\">${testsToConsider.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
      ${medsToReview?.length ? `<div class=\"recommendation-card page-avoid-break\"><h4>💊 Medication Considerations</h4><ul class=\"recommendation-list\">${medsToReview.map(m => `<li>${m}</li>`).join('')}</ul></div>` : ''}
      ${referrals?.length ? `<div class=\"recommendation-card page-avoid-break\"><h4>👥 Referral Recommendations</h4><ul class=\"recommendation-list\">${referrals.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
    </div>` : ''}
  </div>
  <div class=\"footer\">
    <div class=\"footer-logo\">MedBrief AI</div>
    <div>Confidential Medical Document | Generated: ${nowText}</div>
    <div>This summary is intended for medical professionals only</div>
  </div>
</div>`;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // account for a small safe margin to avoid slicing through borders/shadows
      const pxPerMm = canvas.width / (pdfWidth);
      const pageHeightPx = Math.floor(pdfHeight * pxPerMm) - Math.floor(6 * pxPerMm);

      let renderedHeight = 0;
      let pageIndex = 0;
      while (renderedHeight < canvas.height) {
        let sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);
        // try to avoid slicing through mid-card by backing up to nearest whitespace row
        if (sliceHeight < canvas.height - renderedHeight) {
          const probeCanvas = document.createElement('canvas');
          probeCanvas.width = canvas.width;
          probeCanvas.height = 1;
          const pctx = probeCanvas.getContext('2d');
          if (pctx) {
            let backoff = 0;
            const maxBackoff = Math.floor(16 * pxPerMm); // ~16mm
            while (backoff < maxBackoff) {
              pctx.clearRect(0, 0, probeCanvas.width, 1);
              pctx.drawImage(canvas, 0, renderedHeight + sliceHeight - backoff, canvas.width, 1, 0, 0, canvas.width, 1);
              const row = pctx.getImageData(0, 0, probeCanvas.width, 1).data;
              // heuristic: if most pixels are very light, likely whitespace area for a clean break
              let dark = 0;
              for (let i = 0; i < row.length; i += 4) {
                const r = row[i], g = row[i+1], b = row[i+2];
                const lum = 0.2126*r + 0.7152*g + 0.0722*b;
                if (lum < 245) dark++;
              }
              if (dark < probeCanvas.width * 0.02) { // <2% non-white
                sliceHeight -= backoff;
                break;
              }
              backoff += 2; // step back 2px
            }
          }
        }
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
          const imgData = pageCanvas.toDataURL('image/png');
          if (pageIndex > 0) pdf.addPage();
          const imgHeightMm = (sliceHeight / pxPerMm);
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightMm, undefined, 'FAST');
        }
        renderedHeight += sliceHeight;
        pageIndex += 1;
      }

      const safeName = (patient.name || 'patient').replace(/[^a-z0-9_\- ]/gi, '_');
      pdf.save(`${safeName}_summary.pdf`);

      document.body.removeChild(container);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pl-16">
        <DoctorSidebar />
        {/* Header */}
        <DoctorTopNavbar />

        {/* Patient Details Card with Tabs inside */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[85px] pb-4">
          <div className="relative rounded-2xl p-[30px] shadow-sm mt-0 mb-1 flex flex-col bg-white">
            {/* Top-right previous/next controls */}
            <div className="absolute top-3 right-3 flex items-center space-x-2">
              {(() => {
                const sameDay = filteredPatients;
                const idx = selectedPatient ? sameDay.findIndex(p => p.id === selectedPatient) : -1;
                const hasPrev = idx > 0;
                const hasNext = idx !== -1 && idx < sameDay.length - 1;
                return (
                  <>
                    <button
                      onClick={() => hasPrev && goToAdjacentPatient('prev')}
                      title="Previous Patient"
                      className={`${hasPrev ? 'text-blue-600 hover:text-teal-600' : 'text-gray-300 cursor-not-allowed'} px-3 py-2 transition-colors duration-200`}
                      disabled={!hasPrev}
                    >
                      <span className="text-4xl font-bold leading-none">{'<'}</span>
                    </button>
                    <button
                      onClick={() => hasNext && goToAdjacentPatient('next')}
                      title="Next Patient"
                      className={`${hasNext ? 'text-blue-600 hover:text-teal-600' : 'text-gray-300 cursor-not-allowed'} px-3 py-2 transition-colors duration-200`}
                      disabled={!hasNext}
                    >
                      <span className="text-4xl font-bold leading-none">{'>'}</span>
                    </button>
                  </>
                );
              })()}
            </div>
            <div className="-mt-2 mb-2">
              <button
                onClick={handleBack}
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to List</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                {/* Patient image */}
                <ProfileImage imageUrl={patientDetail?.profile_image_url} size="lg" className="border-2 border-blue-200" alt={patient.name} />
                {/* Name + meta stacked to ensure left alignment under the name */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{patient.name}</h2>
                  <div className="flex flex-wrap items-center space-x-4 text-base mt-2">
                    <span className="text-gray-600">{patient.age} years, {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : ''}</span>
                    <span className="text-gray-400">|</span>
                    <span className="flex items-center space-x-1 text-gray-700"><Phone className="h-5 w-5 text-gray-500" /><span>{patient.phone}</span></span>
                    <span className="text-gray-400">|</span>
                    <span className="flex items-center space-x-1 text-gray-700"><Calendar className="h-5 w-5 text-gray-500" /><span>{patient.appointmentDate}</span></span>
                    <span className="text-gray-400">|</span>
                    <span className="flex items-center space-x-1 text-gray-700"><Clock className="h-5 w-5 text-gray-500" /><span>{patient.appointmentTime}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-2">
                  {patient.status === 'checked' && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-green-100 text-green-800 border border-green-200">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      Checked
                    </div>
                  )}
                  {patient.status === 'cancelled' && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-red-100 text-red-800 border border-red-200">
                      <X className="h-5 w-5 mr-1" />
                      Cancelled
                    </div>
                  )}
                  {patient.status !== 'checked' && patient.status !== 'cancelled' && (
                    <>
                      <button
                        onClick={() => handleCancelPatient(patient.id)}
                        className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors duration-200"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCheckPatient(patient.id)}
                        className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors duration-200"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark as Checked
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDownloadPDF}
                    title="Download PDF"
                    className="rounded-full p-2.5 bg-gradient-to-br from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-md transition-all duration-200 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4m-8 8h8" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs moved to bottom content */}
          </div>
        </div>

        {/* Main Content - Tab Panels */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="p-8">
            {/* Bottom Card Tabs Header - visually integrated with content */}
            <div className="bg-white rounded-t-xl rounded-b-none shadow-sm border border-gray-200 border-b-0 p-0 mb-0">
              <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('tab4')}
                    className={`flex items-center text-sm md:text-base font-semibold rounded-t-lg px-4 py-2 transition-colors duration-200 focus:outline-none shadow-sm ${
                      activeTab === 'tab4'
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                        : 'bg-transparent hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'tab4' ? (
                      <>
                        <Activity className="h-5 w-5 mr-2 text-white" />
                        <span>Clinical Summary</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                          <Activity className="h-4 w-4 text-white" />
                        </span>
                        <span className="bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">Clinical Summary</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('patient-detail')}
                    className={`flex items-center text-sm md:text-base font-semibold rounded-t-lg px-4 py-2 transition-colors duration-200 focus:outline-none shadow-sm ${
                      activeTab === 'patient-detail'
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                        : 'bg-transparent hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'patient-detail' ? (
                      <>
                        <User className="h-5 w-5 mr-2 text-white" />
                        <span>Patient Details</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                          <User className="h-4 w-4 text-white" />
                        </span>
                        <span className="bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">Patient Details</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('tab3')}
                    className={`flex items-center text-sm md:text-base font-semibold rounded-t-lg px-4 py-2 transition-colors duration-200 focus:outline-none shadow-sm ${
                      activeTab === 'tab3'
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                        : 'bg-transparent hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'tab3' ? (
                      <>
                        <FileText className="h-5 w-5 mr-2 text-white" />
                        <span>Patient Documents</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                          <FileText className="h-4 w-4 text-white" />
                        </span>
                        <span className="bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">Patient Documents</span>
                      </>
                    )}
                  </button>
                </div>
                {activeTab === 'tab4' && (
                  <button
                    onClick={() => {
                      const allExpanded = Object.values(expandedStatusGroups).every(v => v);
                      setExpandedStatusGroups(() => ({
                        clinicalSummary: !allExpanded,
                        urgency: !allExpanded,
                        currentSymptoms: !allExpanded,
                        pastMedicalEvents: !allExpanded,
                        pastInvestigations: !allExpanded,
                        currentMedications: !allExpanded,
                        pastMedications: !allExpanded,
                        urgencyFlags: !allExpanded,
                        conflictsGaps: !allExpanded,
                        cardiologyRelevance: !allExpanded,
                        testsToConsider: !allExpanded,
                        medicationsToReview: !allExpanded,
                        referralsToConsider: !allExpanded,
                        clinicalSynopsis: !allExpanded
                      }));
                    }}
                    className="text-sm text-gray-800 hover:text-black font-medium px-3 py-1 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    {Object.values(expandedStatusGroups).every(v => v) ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
              </div>
              <div className="mt-3 border-t border-gray-100" />
            </div>
            {/* Tab Content */}
            {activeTab === 'patient-detail' && patientDetail && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <User className="h-5 w-5 mr-3 text-blue-600" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="text-gray-700 font-medium">{patientDetail.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-gray-700 font-medium">{patientDetail.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="text-gray-700 font-medium">
                          {patientDetail.date_of_birth 
                            ? new Date(patientDetail.date_of_birth).toLocaleDateString()
                            : 'Not provided'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="text-gray-700 font-medium">{patientDetail.gender || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <Heart className="h-5 w-5 mr-3 text-red-600" />
                    Medical History
                  </h3>
                  <div className="space-y-4">
                    {patientDetail.family_history && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2">Family History</h4>
                        <p className="text-gray-600">{patientDetail.family_history}</p>
                      </div>
                    )}
                    {patientDetail.allergies && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2">Allergies</h4>
                        <p className="text-gray-600">{patientDetail.allergies}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <Activity className="h-5 w-5 mr-3 text-green-600" />
                    Lifestyle Factors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patientDetail.smoking_status && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Activity className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Smoking Status</p>
                          <p className="text-gray-700 font-medium">{patientDetail.smoking_status}</p>
                        </div>
                      </div>
                    )}
                    {patientDetail.alcohol_consumption && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Wine className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Alcohol Consumption</p>
                          <p className="text-gray-700 font-medium">{patientDetail.alcohol_consumption}</p>
                        </div>
                      </div>
                    )}
                    {patientDetail.exercise_frequency && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Dumbbell className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Exercise Frequency</p>
                          <p className="text-gray-700 font-medium">{patientDetail.exercise_frequency}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(patientDetail.weight || patientDetail.height || patientDetail.bmi) && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                      <Scale className="h-5 w-5 mr-3 text-purple-600" />
                      Physical Measurements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {patientDetail.weight && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Scale className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Weight</p>
                            <p className="text-gray-700 font-medium">{patientDetail.weight} kg</p>
                          </div>
                        </div>
                      )}
                      {patientDetail.height && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Ruler className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Height</p>
                            <p className="text-gray-700 font-medium">{patientDetail.height} cm</p>
                          </div>
                        </div>
                      )}
                      {patientDetail.bmi && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Activity className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">BMI</p>
                            <p className="text-gray-700 font-medium">{patientDetail.bmi}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              )}

            {/* Complaint tab removed */}

            {activeTab === 'tab3' && (
              <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 p-6">
                {patientDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">No Documents Uploaded</h4>
                    <p className="text-gray-500">Patient has not uploaded any medical documents yet.</p>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
                      <p>Debug Info:</p>
                      <p>Active Tab: {activeTab}</p>
                      <p>Documents Count: {patientDocuments.length}</p>
                      <p>Selected Document: {selectedDocument ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[600px]">
                    {/* Left Panel - Document List */}
                    <div className="border-r border-gray-200 pr-4" style={{ width: 'calc(33.333% - 30px)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-800 flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-600" />
                          Documents ({patientDocuments.length})
                        </h3>
                        <button
                          onClick={() => {
                            const grouped = groupDocumentsByCategory(patientDocuments);
                            const allExpanded = Object.keys(grouped).every(k => expandedCategories[k]);
                            if (allExpanded && Object.keys(grouped).length > 0) {
                              // Collapse all
                              setExpandedCategories({});
                            } else {
                              // Expand all
                              const nextState = Object.keys(grouped).reduce((acc, category) => {
                                acc[category] = true;
                                return acc;
                              }, {} as Record<string, boolean>);
                              setExpandedCategories(nextState);
                            }
                          }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-200"
                        >
                          {(() => {
                            const grouped = groupDocumentsByCategory(patientDocuments);
                            const allExpanded = Object.keys(grouped).length > 0 && Object.keys(grouped).every(k => expandedCategories[k]);
                            return allExpanded ? 'Collapse All' : 'Expand All';
                          })()}
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[550px] overflow-y-auto">
                        {sortDocumentCategories(Object.keys(groupDocumentsByCategory(patientDocuments))).map((category: string) => {
                          const documents = groupDocumentsByCategory(patientDocuments)[category];
                          return (
                            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setExpandedCategories(prev => ({
                                  ...prev,
                                  [category]: !prev[category]
                                }))}
                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between text-left"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{getDocumentCategoryIcon(category)}</span>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                      {getDocumentCategoryName(category)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {documents.length} document{documents.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                {expandedCategories[category] ? (
                                  <ChevronUp className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                              
                              {expandedCategories[category] && (
                                <div className="border-t border-gray-200 bg-white">
                                  {documents.map((doc) => (
                                    <div
                                      key={doc.id}
                                      onClick={() => setSelectedDocument(doc)}
                                      className={`p-3 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
                                        selectedDocument?.id === doc.id
                                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                          : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm">
                                            {doc.file_type.startsWith('image/') ? '🖼️' : 
                                             doc.file_type === 'application/pdf' ? '📄' : '📎'}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {doc.file_name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Panel - Document Viewer */}
                    <div className="flex-1 pl-4">
                      {selectedDocument ? (
                        <div className="h-full">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-700">
                              {selectedDocument.file_name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                {(() => {
                                  const d = new Date(selectedDocument.uploaded_at);
                                  const day = String(d.getDate()).padStart(2, '0');
                                  const month = d.toLocaleString('en-US', { month: 'short' });
                                  const year = d.getFullYear();
                                  const minutes = String(d.getMinutes()).padStart(2, '0');
                                  const hours24 = d.getHours();
                                  const ampm = hours24 >= 12 ? 'PM' : 'AM';
                                  const hours12 = hours24 % 12 || 12;
                                  return `${day}-${month}-${year} ${String(hours12).padStart(2, '0')}:${minutes} ${ampm}`;
                                })()}
                              </span>
                                                                   <div className="flex items-center space-x-2">
                                 <button
                                   onClick={() => window.open(selectedDocument.file_path, '_blank')}
                                   className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                                 >
                                   Open in New Tab
                                 </button>
                                 <button
                                   onClick={() => {
                                     const link = document.createElement('a');
                                     link.href = selectedDocument.file_path;
                                     link.download = selectedDocument.file_name;
                                     document.body.appendChild(link);
                                     link.click();
                                     document.body.removeChild(link);
                                   }}
                                   className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200"
                                 >
                                   Download
                                 </button>
                               </div>
                            </div>
                          </div>
                          
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-[500px]">
                            {selectedDocument.file_type.startsWith('image/') ? (
                              <div className="h-full flex items-center justify-center bg-white">
                                <img
                                  src={getPublicFileUrl(selectedDocument.file_path)}
                                  alt={selectedDocument.file_name}
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'flex items-center justify-center h-full text-gray-500';
                                    errorDiv.innerHTML = `
                                      <div class="text-center">
                                        <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                        </svg>
                                        <p class="text-sm">Failed to load image</p>
                                      </div>
                                    `;
                                    target.parentNode?.appendChild(errorDiv);
                                  }}
                                />
                              </div>
                            ) : selectedDocument.file_type === 'application/pdf' ? (
                              pdfLoadError ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                  <div className="text-center">
                                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">File is corrupted or can't be opened.</p>
                                    <p className="text-xs mt-1">Try downloading or opening in a new tab.</p>
                                  </div>
                                </div>
                              ) : (
                                <iframe
                                  src={`${getPublicFileUrl(selectedDocument.file_path)}#toolbar=0&navpanes=0&scrollbar=0`}
                                  className="w-full h-full border-0"
                                  title={selectedDocument.file_name}
                                  onError={() => setPdfLoadError(true)}
                                />
                              )
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                <div className="text-center">
                                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">Preview not available</p>
                                  <p className="text-xs mt-1">Click "Open in New Tab" to view</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Select a document to view</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tab4' && (
              <div className="space-y-6">
                {/* AI Summary Container */}
                <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 p-6">
                  {/* Removed top status card per spec; keep center progress state below */}

                  {/* Clinical Summary Content */}
                  {showCompletionHold ? (
                    <div className="py-6">
                      <AIGenerationProgress
                        percent={progressPercent}
                        events={progressEvents}
                        overrideMessage={'AI Analysis Completed Successfully'}
                      />
                    </div>
                  ) : clinicalSummary && clinicalSummary.summary_json ? (
                    <div className={`space-y-6 ${revealCards ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                      {/* Removed transient auto-refresh banner for a cleaner UI */}
                      {/* Clinical Synopsis moved to top */}
                      <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: '50ms' }}>
                        <div 
                          className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                          onClick={() => setExpandedStatusGroups(prev => ({ ...prev, clinicalSynopsis: !prev.clinicalSynopsis }))}
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-semibold text-gray-800 flex items-center">
                              <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                <FileText className="h-4 w-4 text-white" />
                              </span>
                              Clinical Synopsis
                              {clinicalSummary?.summary_json?.urgency && (
                                <span
                                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    clinicalSummary.summary_json.urgency === 'urgent' || clinicalSummary.summary_json.urgency === 'emergency'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {clinicalSummary.summary_json.urgency === 'emergency'
                                    ? 'Emergency'
                                    : clinicalSummary.summary_json.urgency === 'urgent'
                                    ? 'Urgent'
                                    : 'Routine'}
                                </span>
                              )}
                            </h5>
                            <div className="flex items-center gap-3">
                              {expandedStatusGroups.clinicalSynopsis ? (
                                <ChevronUp className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedStatusGroups.clinicalSynopsis && (
                          <div className="px-4 pb-4">
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {clinicalSummary.summary_json.short_clinical_synopsis}
                            </p>
                            {clinicalSummary.summary_json.ai_insights_and_suggestions?.urgency_flags?.length > 0 && (
                              <p className="text-gray-700 text-sm mt-2">
                                <span className="font-semibold">Urgency Flags:</span> {clinicalSummary.summary_json.ai_insights_and_suggestions.urgency_flags.join('; ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Removed Urgency Level and Current Symptoms cards as requested */}

                      {/* Two Column Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                          <div className="px-1">
                            <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg px-4 py-2 shadow-sm animate-fade-up" style={{ animationDelay: '100ms' }}>
                              <h4 className="font-semibold text-white text-center tracking-wide" style={{ fontSize: 'calc(1em + 4pt)' }}>
                                Clinical History
                              </h4>
                            </div>
                          </div>
                          {/* Past Medical Events */}
                          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: '180ms' }}>
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, pastMedicalEvents: !prev.pastMedicalEvents }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Heart className="h-4 w-4 text-white" />
                                  </span>
                                  Past Medical Events
                                </h5>
                                {expandedStatusGroups.pastMedicalEvents ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.pastMedicalEvents && (
                              <div className="px-4 pb-4">
                                {(() => {
                                  const list: any[] = Array.isArray(clinicalSummary.summary_json.past_medical_events)
                                    ? clinicalSummary.summary_json.past_medical_events
                                    : [];
                                  if (list.length === 0) {
                                    return (
                                      <p className="text-gray-500 text-sm italic">No past medical events recorded</p>
                                    );
                                  }
                                  const containsObjects = list.some(item => item && typeof item === 'object');
                                  if (!containsObjects) {
                                    return (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white rounded-lg overflow-hidden">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Event</th>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                            {list.map((item, index) => (
                                          <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm text-gray-700">{String(item)}</td>
                                            <td className="px-3 py-2 text-sm text-gray-500">-</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                    );
                                  }
                                  // Dynamic columns: infer from objects (and include 'value' if strings present)
                                  const normalizedRows: any[] = list.map(item => (item && typeof item === 'object') ? item : { value: item });
                                  const keySet = new Set<string>();
                                  normalizedRows.forEach(r => Object.keys(r || {}).forEach(k => keySet.add(k)));

                                  // Preferred ordering for readability
                                  const preferredOrder = ['date', 'when', 'occurred_on', 'performed_on', 'event', 'name', 'description', 'notes', 'details', 'comment', 'status', 'state', 'value'];
                                  const keys = Array.from(keySet);
                                  const keysSorted = keys.sort((a, b) => {
                                    const ia = preferredOrder.indexOf(a);
                                    const ib = preferredOrder.indexOf(b);
                                    if (ia !== -1 && ib !== -1) return ia - ib;
                                    if (ia !== -1) return -1;
                                    if (ib !== -1) return 1;
                                    return a.localeCompare(b);
                                  });

                                  const labelize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                  const valueToString = (v: any) => {
                                    if (v === null || v === undefined || v === '') return '-';
                                    if (typeof v === 'object') return JSON.stringify(v);
                                    return String(v);
                                  };

                                  return (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full bg-white rounded-lg overflow-hidden">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            {keysSorted.map(k => (
                                              <th key={k} className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{labelize(k)}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {normalizedRows.map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                              {keysSorted.map(k => (
                                                <td key={k} className="px-3 py-2 text-sm text-gray-700">{valueToString(row[k])}</td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Past Investigations */}
                          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: '260ms' }}>
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, pastInvestigations: !prev.pastInvestigations }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Scale className="h-4 w-4 text-white" />
                                  </span>
                                  Past Investigations
                                </h5>
                                {expandedStatusGroups.pastInvestigations ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.pastInvestigations && (
                              <div className="px-4 pb-4">
                                {(() => {
                                  const list: any[] = Array.isArray(clinicalSummary.summary_json.past_investigations)
                                    ? clinicalSummary.summary_json.past_investigations
                                    : [];
                                  if (list.length === 0) {
                                    return (
                                      <p className="text-gray-500 text-sm italic">No past investigations recorded</p>
                                    );
                                  }

                                  // Normalize to objects and pick known fields
                                  const normalizedRows = list.map((inv: any) => {
                                    const obj = (inv && typeof inv === 'object') ? inv : { name: inv };
                                    const name = obj?.name ?? obj?.investigation ?? obj?.test ?? obj?.type ?? '';
                                    const resultRaw = obj?.result ?? obj?.value ?? obj?.findings ?? '';
                                    const resultString = (resultRaw && typeof resultRaw === 'object') ? JSON.stringify(resultRaw) : String(resultRaw ?? '');
                                    const unit = obj?.unit ?? obj?.units ?? '';
                                    const referenceRange = obj?.reference_range ?? obj?.range ?? obj?.ref_range ?? '';
                                    const date = obj?.date ?? obj?.performed_on ?? obj?.when ?? '';
                                    const status = obj?.status ?? obj?.state ?? '';
                                    const notes = obj?.notes ?? obj?.comment ?? obj?.remark ?? '';
                                    return { name, resultString, unit, referenceRange, date, status, notes };
                                  });

                                  const toNumber = (val: any): number | null => {
                                    if (val === null || val === undefined) return null;
                                    if (typeof val === 'number' && !isNaN(val)) return val;
                                    const m = String(val).match(/-?\d*\.?\d+/);
                                    return m ? parseFloat(m[0]) : null;
                                  };

                                  const parseRange = (range: string): { low: number | null; high: number | null } => {
                                    if (!range) return { low: null, high: null };
                                    const s = String(range).trim();
                                    const between = s.match(/(-?\d*\.?\d+)\s*[-–]\s*(-?\d*\.?\d+)/);
                                    if (between) {
                                      return { low: parseFloat(between[1]), high: parseFloat(between[2]) };
                                    }
                                    const lte = s.match(/(?:<=|≤)\s*(-?\d*\.?\d+)/);
                                    if (lte) return { low: null, high: parseFloat(lte[1]) };
                                    const gte = s.match(/(?:>=|≥)\s*(-?\d*\.?\d+)/);
                                    if (gte) return { low: parseFloat(gte[1]), high: null };
                                    const lt = s.match(/<\s*(-?\d*\.?\d+)/);
                                    if (lt) return { low: null, high: parseFloat(lt[1]) };
                                    const gt = s.match(/>\s*(-?\d*\.?\d+)/);
                                    if (gt) return { low: parseFloat(gt[1]), high: null };
                                    // Try to find two numbers anywhere
                                    const nums = s.match(/-?\d*\.?\d+/g);
                                    if (nums && nums.length >= 2) {
                                      return { low: parseFloat(nums[0]), high: parseFloat(nums[1]) };
                                    }
                                    return { low: null, high: null };
                                  };

                                  const isOutOfRange = (resultStr: string, rangeStr: string): boolean => {
                                    const val = toNumber(resultStr);
                                    if (val === null) return false;
                                    const { low, high } = parseRange(rangeStr);
                                    if (low !== null && high !== null) return val < low || val > high;
                                    if (low !== null) return val < low; // assume ≥ low
                                    if (high !== null) return val > high; // assume ≤ high
                                    return false;
                                  };

                                  const directionArrow = (resultStr: string, rangeStr: string): {symbol: string; classes: string} | null => {
                                    const val = toNumber(resultStr);
                                    if (val === null) return null;
                                    const { low, high } = parseRange(rangeStr);
                                    if (low !== null && val < low) {
                                      return { symbol: '↓', classes: 'text-red-600' };
                                    }
                                    if (high !== null && val > high) {
                                      return { symbol: '↑', classes: 'text-black' };
                                    }
                                    return null;
                                  };

                                  return (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white rounded-lg overflow-hidden">
                                      <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Investigation</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Result</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Reference Range</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                          {normalizedRows.map((r, index) => {
                                            const highlight = isOutOfRange(r.resultString, r.referenceRange);
                                            return (
                                              <tr key={index} className={`${highlight ? 'bg-red-50' : ''} hover:bg-gray-50`}>
                                                <td className="px-3 py-2 text-sm text-gray-700">{r.date || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-700">
                                                  <div className="flex items-center">
                                                    <span className="inline-block w-5 text-center">
                                                      {(() => {
                                                        const dir = directionArrow(r.resultString, r.referenceRange);
                                                        if (dir) return <span className={`${dir.classes}`}>{dir.symbol}</span>;
                                                        const val = toNumber(r.resultString);
                                                        const { low, high } = parseRange(r.referenceRange);
                                                        const hasVal = val !== null;
                                                        const inRange = hasVal && (
                                                          (low !== null && high !== null && val! >= low && val! <= high) ||
                                                          (low !== null && high === null && val! >= low) ||
                                                          (high !== null && low === null && val! <= high)
                                                        );
                                                        return inRange ? <span className="text-gray-500">=</span> : <span className="opacity-0">=</span>;
                                                      })()}
                                                    </span>
                                                    <span className="ml-2 break-words">{r.name || '-'}</span>
                                                  </div>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-700">{r.resultString || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-700">{r.referenceRange || '-'}</td>
                                          </tr>
                                            );
                                          })}
                                      </tbody>
                                    </table>
                                  </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Current Medications */}
                          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, currentMedications: !prev.currentMedications }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Pill className="h-4 w-4 text-white" />
                                  </span>
                                  Current Medications
                                </h5>
                                {expandedStatusGroups.currentMedications ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.currentMedications && (
                              <div className="px-4 pb-4">
                                {clinicalSummary.summary_json.medications.active.length > 0 && clinicalSummary.summary_json.medications.active[0] !== "None" ? (
                                  <ul className="space-y-2">
                                    {clinicalSummary.summary_json.medications.active.map((medication, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span className="text-green-600 font-medium text-sm">•</span>
                                        <span className="text-gray-700 text-sm">{medication}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-500 text-sm italic">No current medications</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Past Medications */}
                          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, pastMedications: !prev.pastMedications }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Pill className="h-4 w-4 text-white" />
                                  </span>
                                  Past Medications
                                </h5>
                                {expandedStatusGroups.pastMedications ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.pastMedications && (
                              <div className="px-4 pb-4">
                                {clinicalSummary.summary_json.medications.past.length > 0 && clinicalSummary.summary_json.medications.past[0] !== "None" ? (
                                  <ul className="space-y-2">
                                    {clinicalSummary.summary_json.medications.past.map((medication, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span className="text-amber-600 font-medium text-sm">•</span>
                                        <span className="text-gray-700 text-sm">{medication}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-500 text-sm italic">No past medications recorded</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                          <div className="px-1">
                            <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg px-4 py-2 shadow-sm animate-fade-up" style={{ animationDelay: '420ms' }}>
                              <h4 className="font-semibold text-white text-center tracking-wide" style={{ fontSize: 'calc(1em + 4pt)' }}>
                                AI Summary
                              </h4>
                            </div>
                          </div>

                          {/* Potential Conflicts & Gaps */}
                          <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: '500ms' }}>
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, conflictsGaps: !prev.conflictsGaps }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <AlertTriangle className="h-4 w-4 text-white" />
                                  </span>
                                  Potential Conflicts & Gaps
                                </h5>
                                {expandedStatusGroups.conflictsGaps ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.conflictsGaps && (
                              <div className="px-4 pb-4">
                                <ul className="space-y-2">
                                  {clinicalSummary.summary_json.potential_conflicts_gaps.map((gap, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-orange-600 font-medium text-sm">⚠️</span>
                                      <span className="text-gray-700 text-sm">{gap}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Relevance to Specialty */}
                          <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, cardiologyRelevance: !prev.cardiologyRelevance }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Heart className="h-4 w-4 text-white" />
                                  </span>
                                  {(() => {
                                    const relevanceKeys = Object.keys(clinicalSummary.summary_json.ai_insights_and_suggestions || {}).filter(k => k.startsWith('relevance_to_'));
                                    if (relevanceKeys.length === 0) return 'Relevance';
                                    const slug = relevanceKeys[0].replace('relevance_to_', '');
                                    const title = slug.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                                    return `Relevance to ${title}`;
                                  })()}
                                </h5>
                                {expandedStatusGroups.cardiologyRelevance ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                  )}
                               </div>
                            </div>
                            {expandedStatusGroups.cardiologyRelevance && (
                              <div className="px-4 pb-4">
                                <ul className="space-y-2">
                                  {(Object.entries(clinicalSummary.summary_json.ai_insights_and_suggestions)
                                    .filter(([k, v]) => k.startsWith('relevance_to_') && Array.isArray(v))
                                    .flatMap(([_, list]) => (list as string[]))
                                  ).map((item, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-blue-600 font-medium text-sm">•</span>
                                      <span className="text-gray-700 text-sm">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Tests to Consider */}
                          <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, testsToConsider: !prev.testsToConsider }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Scale className="h-4 w-4 text-white" />
                                  </span>
                                  Tests to Consider
                                </h5>
                                {expandedStatusGroups.testsToConsider ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.testsToConsider && (
                              <div className="px-4 pb-4">
                                <ul className="space-y-2">
                                  {clinicalSummary.summary_json.ai_insights_and_suggestions.next_steps.tests_to_consider.map((test, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-emerald-600 font-medium text-sm">🔬</span>
                                      <span className="text-gray-700 text-sm">{test}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Medications to Review */}
                          <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, medicationsToReview: !prev.medicationsToReview }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <Pill className="h-4 w-4 text-white" />
                                  </span>
                                  Medications to Review
                                </h5>
                                {expandedStatusGroups.medicationsToReview ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.medicationsToReview && (
                              <div className="px-4 pb-4">
                                <ul className="space-y-2">
                                  {clinicalSummary.summary_json.ai_insights_and_suggestions.next_steps.medications_to_review_start.map((medication, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-purple-600 font-medium text-sm">💊</span>
                                      <span className="text-gray-700 text-sm">{medication}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Referrals to Consider */}
                          <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
                              onClick={() => setExpandedStatusGroups(prev => ({ ...prev, referralsToConsider: !prev.referralsToConsider }))}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-gray-800 flex items-center">
                                  <span className="mr-2 inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-r from-blue-500 to-teal-500">
                                    <User className="h-4 w-4 text-white" />
                                  </span>
                                  Referrals to Consider
                                </h5>
                                {expandedStatusGroups.referralsToConsider ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </div>
                            {expandedStatusGroups.referralsToConsider && (
                              <div className="px-4 pb-4">
                                <ul className="space-y-2">
                                  {clinicalSummary.summary_json.ai_insights_and_suggestions.next_steps.referrals_to_consider.map((referral, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-cyan-600 font-medium text-sm">👨‍⚕️</span>
                                      <span className="text-gray-700 text-sm">{referral}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Model Info */}
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                        <p>Generated by AI • {formatDateTimeIST_DDMMMYYYY(clinicalSummary.created_at)}</p>
                      </div>
                    </div>
                  ) : aiProcessingStatus === 'completed' ? (
                    <div className="text-center py-12">
                      <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h4 className="text-lg font-semibold text-gray-600 mb-2">No AI Summary Available</h4>
                      <p className="text-gray-500">AI analysis completed but no summary was generated.</p>
                    </div>
                  ) : (
                    <div className="py-6">
                      <AIGenerationProgress
                        percent={progressPercent}
                        events={progressEvents}
                        overrideMessage={undefined}
                      />
                      {/* Hide summary cards until we have data to avoid flash */}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Floating Chat Button visible only when a consultation is selected */}
        {currentConsultationId && (
          <FloatingChatButton onClick={() => setIsChatOpen(true)} />
        )}
        {/* Consultation Chat Widget */}
        <ConsultationChatWidget
          open={Boolean(isChatOpen && currentConsultationId)}
          onClose={() => setIsChatOpen(false)}
          patientName={patient.name}
          patientImageUrl={patientDetail?.profile_image_url}
          sessionTitle={clinicalSummary ? 'Consultation chat' : 'Consultation chat'}
          consultationId={currentConsultationId as string}
          doctorId={undefined}
          patientId={undefined}
          suggestedQuestions={[
            'Any red flags or urgent considerations for this case?',
            'What tests or referrals should I consider next?'
          ]}
        />
      </div>
    );
  }

  // Patient List View
  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <DoctorSidebar />
      {/* Header */}
      <DoctorTopNavbar />

      {/* Main Content */}
      <div className="pt-[90px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Removed welcome and quick action button */}

        {/* Search and Date Selection */}
        <div className="mb-8 flex gap-4">
          {/* Search Bar - 70% width */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name, phone, or complaint..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Date Selection - 30% width */}
          <div className="w-1/3 relative">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousDay}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </button>
              
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-center font-medium"
              >
                {formatDate(selectedDate)}
              </button>
              
              <button
                onClick={handleNextDay}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              >
                <ArrowRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            {/* Calendar Dropdown */}
            {showCalendar && (
              <div className="absolute left-0 right-0 z-50 mt-2">
                <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 max-w-xs mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Select Date</h3>
                    <button
                      onClick={() => setShowCalendar(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setShowCalendar(false);
                        fetchAppointmentsForDate(date);
                      }
                    }}
                    inline
                    calendarStartDay={1}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Popup */}
        {/* The calendar popup is now positioned absolutely below the date selection button */}

        {/* Patient List Section - Only this part shows loading spinner */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-blue-600">Loading patients...</div>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-gray-500 mb-4">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Patients Found</h3>
              <p className="text-gray-500">No appointments have been scheduled yet.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scheduled Patients Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <button
                onClick={() => toggleSection('scheduled')}
                className="w-full px-6 py-4 bg-gradient-to-r from-cyan-200 to-blue-200 text-cyan-900 flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5" />
                  <span className="text-lg font-semibold">Scheduled Patients</span>
                  <span className="bg-amber-50 text-cyan-800 px-2 py-1 rounded-full text-sm font-medium border border-cyan-200">
                    {filteredPatients.filter(p => p.status === 'scheduled' || p.status === 'in-progress').length}
                  </span>
                </div>
                {expandedSections.scheduled ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
              
              {expandedSections.scheduled && (
                <div className="p-6 space-y-4">
                  {filteredPatients.filter(p => p.status === 'scheduled' || p.status === 'in-progress').length > 0 ? (
                    filteredPatients.filter(p => p.status === 'scheduled' || p.status === 'in-progress').map((patient) => (
                      <div
                        key={patient.id}
                        className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-300 border-l-4 border-cyan-500 cursor-pointer"
                        onClick={() => handlePatientClick(patient.id)}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="text-lg font-bold text-gray-800">{patient.name}</h3>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelPatient(patient.id);
                                  }}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors duration-200"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCheckPatient(patient.id);
                                  }}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors duration-200"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Mark as Checked
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{patient.age} years, {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : ''}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{patient.appointmentDate}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{patient.appointmentTime}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>{patient.phone}</span>
                              </div>
                            </div>
                            
                            {/* Chief Complaint moved below the row to span full width */}
                          </div>
                          
                          <div className="mt-4 lg:mt-0 lg:ml-6">
                            <button 
                              onClick={() => handlePatientClick(patient.id)}
                              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all duration-300 font-semibold"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg mt-3 w-full">
                          <span className="text-gray-800 font-medium text-sm">Chief Complaint: </span>
                          <span className="text-blue-700 font-semibold text-base whitespace-normal break-words">{patient.chiefComplaint || 'Not provided'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Scheduled Patients</h3>
                      <p className="text-gray-500">No appointments are scheduled or in progress for this date.</p>
                    </div>
                  )}
                </div>
              )}
            </div>



            {/* Checked Patients Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <button
                onClick={() => toggleSection('checked')}
                className="w-full px-6 py-4 bg-gradient-to-r from-teal-200 to-green-200 text-teal-900 flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-lg font-semibold">Checked Patients</span>
                  <span className="bg-amber-50 text-teal-800 px-2 py-1 rounded-full text-sm font-medium border border-teal-200">
                    {filteredPatients.filter(p => p.status === 'checked').length}
                  </span>
                </div>
                {expandedSections.checked ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
              
              {expandedSections.checked && (
                <div className="p-6 space-y-4">
                  {filteredPatients.filter(p => p.status === 'checked').length > 0 ? (
                    filteredPatients.filter(p => p.status === 'checked').map((patient) => (
                      <div
                        key={patient.id}
                        className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-300 border-l-4 border-teal-500 cursor-pointer"
                        onClick={() => handlePatientClick(patient.id)}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="text-lg font-bold text-gray-800">{patient.name}</h3>
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Checked
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{patient.age} years, {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : ''}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{patient.appointmentDate}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{patient.appointmentTime}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>{patient.phone}</span>
                              </div>
                            </div>
                            
                            {/* Chief Complaint moved below the row to span full width */}
                          </div>
                          
                          <div className="mt-4 lg:mt-0 lg:ml-6">
                            <button 
                              onClick={() => handlePatientClick(patient.id)}
                              className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 font-semibold"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Checked Patients</h3>
                      <p className="text-gray-500">No patients have been marked as checked yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cancelled Patients Section - Only show if there are cancelled patients */}
            {filteredPatients.filter(p => p.status === 'cancelled').length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('cancelled')}
                  className="w-full px-6 py-4 bg-red-200 text-red-900 flex items-center justify-between transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <X className="h-5 w-5" />
                    <span className="text-lg font-semibold">Cancelled Patients</span>
                    <span className="bg-amber-50 text-red-800 px-2 py-1 rounded-full text-sm font-medium border border-red-200">
                      {filteredPatients.filter(p => p.status === 'cancelled').length}
                    </span>
                  </div>
                  {expandedSections.cancelled ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              
              {expandedSections.cancelled && (
                <div className="p-6 space-y-4">
                  {filteredPatients.filter(p => p.status === 'cancelled').length > 0 ? (
                    filteredPatients.filter(p => p.status === 'cancelled').map((patient) => (
                      <div
                        key={patient.id}
                        className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-300 border-l-4 border-red-500 cursor-pointer"
                        onClick={() => handlePatientClick(patient.id)}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="text-lg font-bold text-gray-800">{patient.name}</h3>
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                                <X className="h-4 w-4 mr-1" />
                                Cancelled
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{patient.age} years, {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : ''}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{patient.appointmentDate}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{patient.appointmentTime}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>{patient.phone}</span>
                              </div>
                            </div>
                            
                            {/* Chief Complaint moved below the row to span full width */}
                          </div>
                          
                          <div className="mt-4 lg:mt-0 lg:ml-6">
                            <button 
                              onClick={() => handlePatientClick(patient.id)}
                              className="bg-gradient-to-r from-red-500 to-teal-500 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-teal-600 transition-all duration-300 font-semibold"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <X className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cancelled Patients</h3>
                      <p className="text-gray-500">No appointments have been cancelled yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorViewPage; 
