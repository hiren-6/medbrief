import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Calendar, Clock, Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { createISTDateTime, formatTimeIST, getCurrentISTTime, getCurrentISTDateString, isTimeSlotInPast } from '../utils/timezone';

interface AppointmentSchedulerProps {
  doctorId: string;
  onAppointmentSelected: (date: string, time: string, datetime: string) => void;
  onBack: () => void;
  currentStep?: number;
}

interface TimeSlot {
  date: string;
  time: string;
  datetime: string;
  available: boolean;
  isBreakTime?: boolean;
  isBooked?: boolean;
  unavailableReason?: string;
}

// Interface moved to AppointmentSettings working_hours type

interface WorkingHours {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks: Array<{ startTime: string; endTime: string }>;
}

interface Vacation {
  start_date: string;
  end_date: string;
  reason?: string;
}

interface AppointmentSettings {
  appointment_duration: number;
  working_hours: WorkingHours[];
  start_date: string;
  end_date: string;
  vacations: Vacation[];
}

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  doctorId,
  onAppointmentSelected,
  onBack,
  currentStep = 2
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  // Existing appointments state removed - handled in generateTimeSlotsAndDays
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Function to fetch available time slots (with fallback)
  const fetchOptimizedTimeSlots = async () => {
    try {
      console.log('Fetching time slots for doctor:', doctorId);
      
      // Try optimized function first
      try {
        const { data: slots, error } = await supabase
          .rpc('get_available_appointment_slots', {
            doctor_uuid: doctorId,
            p_start_date: getCurrentISTDateString(), // Use IST date
            days_ahead: 7
          });

        if (error) throw error;
        
        console.log('Raw slots from database:', slots);
        
        // Define interface for database slot
        interface DatabaseSlot {
          slot_date: string;
          slot_time: string;
          slot_datetime: string;
          is_available: boolean;
          unavailable_reason?: string;
        }
        
        // Process slots efficiently
        const processedSlots = (slots as DatabaseSlot[])?.map(slot => ({
          date: slot.slot_date,
          time: slot.slot_time?.slice(0, 5) || '', // Format time safely
          datetime: slot.slot_datetime,
          available: slot.is_available,
          unavailableReason: slot.unavailable_reason,
          isBooked: slot.unavailable_reason === 'Slot Booked',
          isBreakTime: slot.unavailable_reason === 'Break Time'
        })) || [];
        
        console.log('Processed slots:', processedSlots);
        
        // Filter out past time slots and extract available days
        const filteredSlots = processedSlots.filter(slot => {
          // Filter out past time slots even if database function missed them (NO BUFFER)
          if (isTimeSlotInPast(slot.date, slot.time?.slice(0, 5) || '')) {
            return false;
          }
          return true;
        });
        
        const uniqueDays = [...new Set(
          filteredSlots
            .filter(slot => slot.available)
            .map(slot => slot.date)
        )];
        
        return { slots: filteredSlots, availableDays: uniqueDays };
        
      } catch (functionError) {
        console.warn('Optimized function failed, falling back to legacy method:', functionError);
        
        // Fallback to legacy method
        const existingTimes = await fetchExistingAppointments();
        
        if (!settings) {
          throw new Error('No appointment settings available');
        }
        
        const { slots, availableDaysList } = generateTimeSlotsAndDays(settings, existingTimes);
        return { slots, availableDays: availableDaysList };
      }
      
    } catch (err: any) {
      console.error('Error fetching time slots:', err);
      throw new Error('Failed to load appointment slots: ' + err.message);
    }
  };

  // Legacy function for fallback
  const fetchExistingAppointments = async () => {
    const todayIST = getCurrentISTTime(); // Use IST time
    const nextWeekIST = new Date(todayIST.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    console.log('Fetching appointments for doctor:', doctorId);
    
    // Fetch future appointments (for blocking slots)
    const { data: futureAppointments, error: futureError } = await supabase
      .from('appointments')
      .select('appointment_datetime, doctor_id, patient_id, status')
      .eq('doctor_id', doctorId)
      .gte('appointment_datetime', todayIST.toISOString())
      .lte('appointment_datetime', nextWeekIST.toISOString());

    if (futureError) {
      throw new Error('Failed to load existing appointments: ' + futureError.message);
    }

    console.log('Future appointments:', futureAppointments);
    
    // Define interface for appointment data
    interface AppointmentData {
      appointment_datetime: string;
      status: string;
    }
    
    // Only consider slots booked if status is 'scheduled' or 'in-progress'
    const bookedAppointments = (futureAppointments as AppointmentData[] || []).filter(
      apt => apt.status === 'scheduled' || apt.status === 'in-progress'
    ).map(apt => apt.appointment_datetime);

    return bookedAppointments;
  };

  // Function to refresh appointment data
  const refreshAppointmentData = async () => {
    try {
      console.log('Refreshing appointment data...');
      const { slots, availableDays: availableDaysList } = await fetchOptimizedTimeSlots();
      setTimeSlots(slots);
      setAvailableDays(availableDaysList);
      setLastRefresh(new Date());
      console.log('Appointment data refreshed at:', new Date().toISOString());
    } catch (err) {
      console.error('Error refreshing appointment data:', err);
    }
  };

  // Function to validate slot availability in real-time
  const validateSlotAvailability = async (datetime: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('appointment_datetime', datetime)
        .limit(1);

      if (error) {
        console.error('Error validating slot:', error);
        return false;
      }

      // If no appointment exists for this datetime, the slot is available
      return data.length === 0;
    } catch (err) {
      console.error('Error validating slot availability:', err);
      return false;
    }
  };

  // Function to manually check specific appointment
  const checkSpecificAppointment = async () => {
    console.log('=== MANUAL CHECK FOR JULY 14, 12:20 ===');
    
    // Check if July 14, 2024 is within our date range
    const july14 = new Date('2024-07-14T12:20:00');
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    console.log('Date check:', {
      july14: july14.toISOString(),
      today: today.toISOString(),
      nextWeek: nextWeek.toISOString(),
      isInRange: july14 >= today && july14 <= nextWeek,
      july14Formatted: july14.toLocaleDateString(),
      todayFormatted: today.toLocaleDateString(),
      nextWeekFormatted: nextWeek.toLocaleDateString()
    });
    
    // Check if July 14 is in the past (which would explain why it's not showing)
    console.log('Date comparison:', {
      july14IsPast: july14 < today,
      july14IsFuture: july14 > today,
      daysDifference: Math.floor((july14.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    });
    
    // Query for the specific appointment
    const { data: specificAppointment, error: specificError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('appointment_datetime', july14.toISOString());
    
    console.log('Specific appointment query:', {
      data: specificAppointment,
      error: specificError,
      query: `doctor_id = ${doctorId} AND appointment_datetime = ${july14.toISOString()}`
    });
    
    // Query for all appointments for this doctor
    const { data: allAppointments, error: allError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId);
    
    console.log('All appointments for doctor:', {
      data: allAppointments,
      error: allError,
      count: allAppointments?.length || 0
    });
    
    // Query for appointments around July 14 (broader range)
    const julyStart = new Date('2024-07-01T00:00:00');
    const julyEnd = new Date('2024-07-31T23:59:59');
    
    const { data: julyAppointments, error: julyError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('appointment_datetime', julyStart.toISOString())
      .lte('appointment_datetime', julyEnd.toISOString());
    
    console.log('July appointments for doctor:', {
      data: julyAppointments,
      error: julyError,
      count: julyAppointments?.length || 0
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('Fetching settings for doctor ID:', doctorId);
        
        // Fetch doctor's appointment settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('appointment_settings')
          .select('*')
          .eq('doctor_id', doctorId);

        console.log('Settings fetch result:', { settingsData, settingsError, doctorId });

        if (settingsError) {
          console.error('Settings fetch error:', settingsError);
          setError('Failed to load doctor settings: ' + settingsError.message);
          return;
        }

        if (!settingsData || settingsData.length === 0) {
          console.log('No settings found for doctor:', doctorId);
          setError('This doctor has not set up their appointment settings yet. The doctor needs to configure their working hours and appointment duration in their portal. Please try selecting a different doctor or contact the doctor to set up their schedule.');
          return;
        }

        if (settingsData.length > 1) {
          console.warn('Multiple appointment settings found for doctor:', doctorId);
          // Use the most recent settings
          settingsData.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        }

        const settings = settingsData[0];
        console.log('Using settings:', settings);

        setSettings(settings);

        // Fetch available time slots using optimized function
        const { slots, availableDays: availableDaysList } = await fetchOptimizedTimeSlots();
        console.log('Generated slots:', slots);
        console.log('Available days:', availableDaysList);
        setTimeSlots(slots);
        setAvailableDays(availableDaysList);
        
        // Run manual check for debugging
        await checkSpecificAppointment();

      } catch (err: any) {
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [doctorId]);

  // Auto-refresh appointment data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (settings && !loading) {
        refreshAppointmentData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [settings, loading]);

  // Helper to compare slot and appointment datetimes by date and hour:minute only
  function isSameSlot(slotDatetime: string, appointmentDatetime: string) {
    // Both are ISO strings
    const slot = new Date(slotDatetime);
    const apt = new Date(appointmentDatetime);
    return (
      slot.getFullYear() === apt.getFullYear() &&
      slot.getMonth() === apt.getMonth() &&
      slot.getDate() === apt.getDate() &&
      slot.getHours() === apt.getHours() &&
      slot.getMinutes() === apt.getMinutes()
    );
  }

  const generateTimeSlotsAndDays = (settings: AppointmentSettings, existingAppointments: string[]) => {
    const slots: TimeSlot[] = [];
    const availableDaysList: string[] = [];
    const nowIST = getCurrentISTTime(); // Get current IST time
    
    console.log('🕐 FIXED IST TIME DEBUG:', {
      currentISTTime: nowIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      currentISTHour: nowIST.getHours(),
      currentISTMinute: nowIST.getMinutes(),
      userLocalTime: new Date().toLocaleString(),
      message: 'Generating slots based purely on IST - no local time influence'
    });
    
    // Generate slots for next 7 days based on IST
    for (let i = 0; i < 7; i++) {
      // Create each date in IST timezone properly
      const today = new Date();
      const currentDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateString = getCurrentISTDateString(); // Get proper IST date string for today
      
      // For days other than today, calculate the date properly
      const actualDateString = i === 0 ? dateString : (() => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        return futureDate.toLocaleDateString('en-CA', { 
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit'
        });
      })();
      
      // Get day name in IST timezone
      const dayName = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: 'Asia/Kolkata'
      });
      
      console.log(`📅 Processing day ${i}: ${actualDateString} (${dayName}) in IST`);
      
      // Check if doctor is available on this date
      const isAvailableOnDate = isDoctorAvailableOnDate(settings, actualDateString);
      
      if (!isAvailableOnDate) {
        console.log(`❌ Doctor not available on ${actualDateString}`);
        continue; // Skip this date if doctor is not available
      }
      
      const workingDay = settings.working_hours.find(wh => wh.day === dayName);
      
      if (workingDay && workingDay.isWorking) {
        const startTime = new Date(`2000-01-01T${workingDay.startTime}`);
        const endTime = new Date(`2000-01-01T${workingDay.endTime}`);
        const duration = settings.appointment_duration;
        
        let currentTime = new Date(startTime);
        let dayHasSlots = false;
        
        while (currentTime < endTime) {
          const timeString = currentTime.toTimeString().slice(0, 5);
          
          // Create datetime in IST timezone using our utility function
          // This ensures that 7:30 PM IST is properly stored as UTC
          const datetime = createISTDateTime(actualDateString, timeString);
          
          console.log(`🕐 Slot Debug: ${timeString} on ${actualDateString} -> ${datetime}`, {
            date: actualDateString,
            time: timeString,
            datetime: datetime,
            displayTime: formatTimeIST(datetime)
          });
          
          // Check if slot conflicts with breaks
          const isBreakTime = workingDay.breaks.some(breakTime => {
            const breakStart = new Date(`2000-01-01T${breakTime.startTime}`);
            const breakEnd = new Date(`2000-01-01T${breakTime.endTime}`);
            const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
            return currentTime < breakEnd && slotEnd > breakStart;
          });
          
          // Check if slot is already booked
          const isBooked = existingAppointments.some(aptTime => isSameSlot(datetime, aptTime));
          console.log(`Slot ${timeString} on ${actualDateString}:`, { 
            datetime, 
            isBooked, 
            existingAppointments,
            dateString: actualDateString,
            timeString
          });
          
          let available = true;
          let unavailableReason = '';
          
          // ROBUST FIX: Use our new utility function for past time checking (NO BUFFER)
          const isSlotInPast = isTimeSlotInPast(actualDateString, timeString); // NO BUFFER - immediate next slot
          
          console.log(`🕐 IST CHECK: ${timeString} on day ${i}`, {
            slotDate: actualDateString,
            slotTime: timeString,
            isToday: i === 0,
            isSlotInPast,
            willShow: !isSlotInPast
          });
          
          if (isSlotInPast) {
            available = false;
            unavailableReason = 'Booking not allowed - past time';
          }
          // Check if slot is during a break
          if (isBreakTime) {
            available = false;
            unavailableReason = 'Break Time';
          }
          // Check if slot is booked
          if (isBooked) {
            available = false;
            unavailableReason = 'Slot Booked';
          }
          const slot = {
            date: actualDateString,
            time: timeString,
            datetime,
            available,
            isBreakTime,
            isBooked,
            unavailableReason
          };
          
          slots.push(slot);
          
          if (slot.available) {
            dayHasSlots = true;
          }
          
          // Move to next slot
          currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);
        }
        
        // Add to available days if there are available slots
        if (dayHasSlots) {
          availableDaysList.push(actualDateString);
        }
      }
    }
    
    return { slots, availableDaysList };
  };

  const isDoctorAvailableOnDate = (settings: AppointmentSettings, dateString: string): boolean => {
    const date = new Date(dateString);
    const startDate = new Date(settings.start_date);
    const endDate = new Date(settings.end_date);
    
    // Check if date is within the doctor's working period
    if (date < startDate || date > endDate) {
      return false;
    }
    
    // Check if date is in vacations
    for (const vacation of settings.vacations || []) {
      const vacationStart = new Date(vacation.start_date);
      const vacationEnd = new Date(vacation.end_date);
      if (date >= vacationStart && date <= vacationEnd) {
        return false;
      }
    }
    
    return true;
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;

    setBookingInProgress(true);
    setError('');

    try {
      // Real-time validation before proceeding
      const isSlotAvailable = await validateSlotAvailability(selectedSlot.datetime);
      
      if (!isSlotAvailable) {
        setError('This time slot has just been booked by another patient. Please select a different time.');
        
        // Refresh the appointment data to show updated availability
        await refreshAppointmentData();
        
        setSelectedSlot(null);
        return;
      }

      // If slot is still available, proceed with booking
      onAppointmentSelected(selectedSlot.date, selectedSlot.time, selectedSlot.datetime);
    } catch (err: any) {
      setError('Error validating appointment slot: ' + err.message);
    } finally {
      setBookingInProgress(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTimeToAMPM = (time24: string): string => {
    if (!time24) return '';
    
    // Parse the time string (format: "HH:MM")
    const [hours, minutes] = time24.split(':').map(Number);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    // Format with leading zero for minutes if needed
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${formattedMinutes} ${period}`;
  };

  // IST Timezone utility functions are now imported from utils/timezone.ts

  const getCurrentDaySlots = () => {
    if (availableDays.length === 0) return [];
    const currentDate = availableDays[currentDayIndex];
    return timeSlots.filter(slot => slot.date === currentDate);
  };

  const handlePreviousDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
      setSelectedSlot(null); // Clear selection when changing days
    }
  };

  const handleNextDay = () => {
    if (currentDayIndex < availableDays.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
      setSelectedSlot(null); // Clear selection when changing days
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center">
          <div className="text-blue-600">Loading available time slots...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
          <button
            onClick={onBack}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (availableDays.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center">
          <div className="text-gray-600 mb-4">No available time slots found for the next 7 days.</div>
          <button
            onClick={onBack}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentDaySlots = getCurrentDaySlots();
  const currentDate = availableDays[currentDayIndex];

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8">
      <div className="mb-8 flex items-start justify-between">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Select Appointment</h1>
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

      {/* Calendar Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
          <button
            onClick={handlePreviousDay}
            disabled={currentDayIndex === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              currentDayIndex === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {formatDate(currentDate)}
              </div>
              <div className="text-sm text-gray-500">
                {currentDayIndex + 1} of {availableDays.length} available days
              </div>
            </div>
          </div>

          <button
            onClick={handleNextDay}
            disabled={currentDayIndex === availableDays.length - 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              currentDayIndex === availableDays.length - 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Available Times for {formatShortDate(currentDate)}
          </h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {currentDaySlots.filter(s => s.available && !isTimeSlotInPast(s.date, s.time)).length} available, {currentDaySlots.filter(s => s.isBooked && !isTimeSlotInPast(s.date, s.time)).length} booked
            </div>
            <button
              onClick={refreshAppointmentData}
              disabled={loading}
              className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
              title="Refresh availability"
            >
              ↻ Refresh
            </button>
            <div className="text-xs text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} IST
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mb-4 flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
            <span>Booked</span>
          </div>
        </div>
        
        {currentDaySlots.filter(slot => !isTimeSlotInPast(slot.date, slot.time)).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No available time slots for this day.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {currentDaySlots.filter(slot => {
              // Simple check: don't show past time slots
              return !isTimeSlotInPast(slot.date, slot.time);
            }).map((slot, index) => (
              <button
                key={index}
                onClick={() => slot.available && handleSlotSelect(slot)}
                disabled={!slot.available || bookingInProgress}
                className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedSlot?.datetime === slot.datetime
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : slot.available
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    : slot.isBooked
                    ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-200'
                    : 'bg-yellow-50 text-yellow-600 cursor-not-allowed border border-yellow-200'
                }`}
                title={slot.available ? `Book appointment at ${formatTimeToAMPM(slot.time)}` : slot.isBooked ? `Slot unavailable - already booked` : `Not available`}
              >
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    {slot.available ? (
                      <Clock className="h-4 w-4" />
                    ) : slot.unavailableReason === 'Slot Booked' ? (
                      <div className="h-4 w-4 rounded-full bg-red-400 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">×</span>
                      </div>
                    ) : slot.unavailableReason === 'Break Time' ? (
                      <div className="h-4 w-4 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">B</span>
                      </div>
                    ) : slot.unavailableReason === 'Booking not allowed' ? (
                      <div className="h-4 w-4 rounded-full bg-gray-400 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">NA</span>
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-gray-400 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">NA</span>
                      </div>
                    )}
                    <span>{formatTimeToAMPM(slot.time)}</span>
                  </div>
                  {/* Show 'Slot booked' label for booked slots */}
                  {!slot.available && slot.isBooked && (
                    <span className="text-xs text-red-500 font-semibold mt-1">Slot booked</span>
                  )}
                  {/* Show 'Break' label for break slots */}
                  {!slot.available && slot.isBreakTime && (
                    <span className="text-xs text-yellow-600 font-semibold mt-1">Break</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={bookingInProgress}
          className="flex items-center space-x-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!selectedSlot || bookingInProgress}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
            selectedSlot && !bookingInProgress
              ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {bookingInProgress ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Validating...</span>
            </>
          ) : (
            <>
              <span>Confirm Appointment</span>
              <Check className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Selected Slot Display */}
      {selectedSlot && (
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center space-x-3 text-blue-800">
            <Check className="h-6 w-6" />
            <div>
              <span className="font-medium">
                Selected: {formatDate(selectedSlot.date)} at {formatTimeToAMPM(selectedSlot.time)}
              </span>
              <div className="text-sm text-blue-600">
                {settings?.appointment_duration} minute appointment
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentScheduler; 