import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Save, CheckCircle, AlertCircle, Settings, User, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface BreakTime {
  startTime: string;
  endTime: string;
}

interface WorkingHours {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakTime[];
}

interface Vacation {
  start_date: string;
  end_date: string;
  reason?: string;
}

interface AppointmentSettings {
  id?: string;
  doctor_id: string;
  appointment_duration: number; // in minutes
  working_hours: WorkingHours[];
  start_date: string;
  end_date: string;
  vacations: Vacation[];
  created_at?: string;
  updated_at?: string;
}

const AppointmentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inDoctorLayout = location.pathname.startsWith('/dashboard/doctor');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [settings, setSettings] = useState<AppointmentSettings>({
    doctor_id: '',
    appointment_duration: 30,
    working_hours: [
      { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      { day: 'Saturday', isWorking: false, startTime: '09:00', endTime: '17:00', breaks: [] },
      { day: 'Sunday', isWorking: false, startTime: '09:00', endTime: '17:00', breaks: [] }
    ],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '2099-12-31',
    vacations: []
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a doctor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'doctor') {
        navigate('/dashboard');
        return;
      }

      setDoctorId(user.id);
      setSettings(prev => ({ ...prev, doctor_id: user.id }));

      // Load existing settings
      const { data: existingSettings } = await supabase
        .from('appointment_settings')
        .select('*')
        .eq('doctor_id', user.id)
        .single();

      if (existingSettings) {
        setSettings(existingSettings);
      }
    };

    checkUser();
  }, [navigate]);

  const handleWorkingHoursChange = (dayIndex: number, field: keyof WorkingHours, value: any) => {
    setSettings(prev => ({
      ...prev,
      working_hours: prev.working_hours.map((hour, index) => 
        index === dayIndex ? { ...hour, [field]: value } : hour
      )
    }));
  };

  const addBreak = (dayIndex: number) => {
    setSettings(prev => ({
      ...prev,
      working_hours: prev.working_hours.map((hour, index) => 
        index === dayIndex ? { ...hour, breaks: [...hour.breaks, { startTime: '12:00', endTime: '13:00' }] } : hour
      )
    }));
  };

  const removeBreak = (dayIndex: number, breakIndex: number) => {
    setSettings(prev => ({
      ...prev,
      working_hours: prev.working_hours.map((hour, index) => 
        index === dayIndex ? { ...hour, breaks: hour.breaks.filter((_, bIndex) => bIndex !== breakIndex) } : hour
      )
    }));
  };

  const updateBreak = (dayIndex: number, breakIndex: number, field: keyof BreakTime, value: string) => {
    setSettings(prev => ({
      ...prev,
      working_hours: prev.working_hours.map((hour, index) => 
        index === dayIndex ? {
          ...hour,
          breaks: hour.breaks.map((breakTime, bIndex) => 
            bIndex === breakIndex ? { ...breakTime, [field]: value } : breakTime
          )
        } : hour
      )
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate settings
      const workingDays = settings.working_hours.filter(h => h.isWorking);
      if (workingDays.length === 0) {
        setError('Please select at least one working day');
        return;
      }

      if (settings.appointment_duration < 5 || settings.appointment_duration > 120) {
        setError('Appointment duration must be between 5 and 120 minutes');
        return;
      }

      // Check for time validation
      for (const day of settings.working_hours) {
        if (day.isWorking) {
          const start = new Date(`2000-01-01T${day.startTime}`);
          const end = new Date(`2000-01-01T${day.endTime}`);
          if (start >= end) {
            setError(`${day.day}: End time must be after start time`);
            return;
          }
        }
      }

      // Validate doctor_id
      if (!settings.doctor_id) {
        setError('Doctor ID is missing. Please refresh the page and try again.');
        return;
      }

      // Prepare data for saving
      const dataToSave = {
        doctor_id: settings.doctor_id,
        appointment_duration: settings.appointment_duration,
        working_hours: settings.working_hours,
        start_date: settings.start_date,
        end_date: settings.end_date,
        vacations: settings.vacations,
        updated_at: new Date().toISOString()
      };

      console.log('Saving data:', dataToSave);

      // Save to database
      const { data: savedData, error } = await supabase
        .from('appointment_settings')
        .upsert(dataToSave, {
          onConflict: 'doctor_id'
        })
        .select();

      console.log('Save result:', { savedData, error });

      if (error) {
        console.error('Supabase error:', error);
        setError('Failed to save settings: ' + (error.message || 'Unknown error'));
        return;
      }

      console.log('Settings saved successfully:', savedData);

      setSuccess('Appointment settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError('Error: ' + (err.message || 'Unknown error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const generateTimeSlots = (startTime: string, endTime: string, duration: number, breaks: BreakTime[] = []) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    while (current < end) {
      const currentTime = current.toTimeString().slice(0, 5);
      
      // Check if current time is within any break
      const isInBreak = breaks.some(breakTime => {
        const breakStart = new Date(`2000-01-01T${breakTime.startTime}`);
        const breakEnd = new Date(`2000-01-01T${breakTime.endTime}`);
        const currentDate = new Date(`2000-01-01T${currentTime}`);
        return currentDate >= breakStart && currentDate < breakEnd;
      });
      
      if (!isInBreak) {
        slots.push(currentTime);
      }
      
      current.setMinutes(current.getMinutes() + duration);
    }
    
    return slots;
  };

  const getDayColor = (isWorking: boolean) => {
    return isWorking ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200';
  };

  const getDayTextColor = (isWorking: boolean) => {
    return isWorking ? 'text-blue-800' : 'text-gray-500';
  };

  const calculateTotalSlots = () => {
    let totalSlots = 0;
    settings.working_hours.forEach(day => {
      if (day.isWorking) {
        const slots = generateTimeSlots(day.startTime, day.endTime, settings.appointment_duration, day.breaks);
        totalSlots += slots.length;
      }
    });
    return totalSlots;
  };

  const calculateAverageSlotsPerDay = () => {
    const workingDays = settings.working_hours.filter(h => h.isWorking);
    if (workingDays.length === 0) return 0;
    
    let totalSlots = 0;
    workingDays.forEach(day => {
      const slots = generateTimeSlots(day.startTime, day.endTime, settings.appointment_duration, day.breaks);
      totalSlots += slots.length;
    });
    
    return Math.round(totalSlots / workingDays.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        {inDoctorLayout ? (
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Appointment Settings</h1>
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
            
            <h1 className="text-3xl font-bold text-gray-800">Appointment Settings</h1>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* First Row: Appointment Duration + Settings Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            {/* Appointment Duration - 60% width */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Appointment Duration</h2>
                    <p className="text-gray-600">Set the duration for each appointment slot</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <select
                      value={settings.appointment_duration}
                      onChange={(e) => setSettings(prev => ({ ...prev, appointment_duration: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                      <option value={120}>120 minutes</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• System automatically creates appointment slots based on this duration</li>
                      <li>• Patients can only book available time slots</li>
                      <li>• Each slot will be exactly {settings.appointment_duration} minutes long</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Summary - 40% width */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Settings Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Appointment Duration</span>
                    <span className="font-semibold text-blue-800">{settings.appointment_duration} minutes</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Working Days</span>
                    <span className="font-semibold text-green-600">
                      {settings.working_hours.filter(h => h.isWorking).length}/7
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Avg Slots/Day</span>
                    <span className="font-semibold text-blue-800">
                      {calculateAverageSlotsPerDay()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Slots/Week</span>
                    <span className="font-semibold text-blue-800">
                      {calculateTotalSlots()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row: Date Range and Vacations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Date Range */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Availability Period</h2>
                  <p className="text-gray-600">Set when you'll start accepting appointments</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date (When you'll start accepting appointments)
                  </label>
                  <input
                    type="date"
                    value={settings.start_date}
                    onChange={(e) => setSettings(prev => ({ ...prev, start_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional - leave as is for indefinite availability)
                  </label>
                  <input
                    type="date"
                    value={settings.end_date}
                    onChange={(e) => setSettings(prev => ({ ...prev, end_date: e.target.value }))}
                    min={settings.start_date}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Vacations */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Vacations & Time Off</h2>
                  <p className="text-gray-600">Add periods when you won't be available</p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    vacations: [...prev.vacations, {
                      start_date: new Date().toISOString().split('T')[0],
                      end_date: new Date().toISOString().split('T')[0],
                      reason: ''
                    }]
                  }))}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Add Vacation Period
                </button>

                {settings.vacations.length > 0 ? (
                  <div className="space-y-3">
                    {settings.vacations.map((vacation, index) => (
                      <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={vacation.start_date}
                              onChange={(e) => {
                                const newVacations = [...settings.vacations];
                                newVacations[index].start_date = e.target.value;
                                setSettings(prev => ({ ...prev, vacations: newVacations }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={vacation.end_date}
                              onChange={(e) => {
                                const newVacations = [...settings.vacations];
                                newVacations[index].end_date = e.target.value;
                                setSettings(prev => ({ ...prev, vacations: newVacations }));
                              }}
                              min={vacation.start_date}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Reason (Optional)</label>
                          <input
                            type="text"
                            value={vacation.reason || ''}
                            onChange={(e) => {
                              const newVacations = [...settings.vacations];
                              newVacations[index].reason = e.target.value;
                              setSettings(prev => ({ ...prev, vacations: newVacations }));
                            }}
                            placeholder="e.g., Annual leave, Conference"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            vacations: prev.vacations.filter((_, i) => i !== index)
                          }))}
                          className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No vacation periods added</p>
                )}
              </div>
            </div>
          </div>

          {/* Third Row: Working Hours - Full Width */}
          <div className="w-full">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Working Hours</h2>
                  <p className="text-gray-600">Set your availability for each day of the week</p>
                </div>
              </div>

              <div className="space-y-4">
                {settings.working_hours.map((day, index) => (
                  <div key={day.day} className={`border rounded-lg p-4 transition-all duration-200 ${getDayColor(day.isWorking)}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={day.isWorking}
                          onChange={(e) => handleWorkingHoursChange(index, 'isWorking', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className={`font-medium ${getDayTextColor(day.isWorking)}`}>
                          {day.day}
                        </span>
                      </div>
                      {day.isWorking && (
                        <span className="text-sm text-green-600 font-medium">Working Day</span>
                      )}
                    </div>

                    {day.isWorking && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => handleWorkingHoursChange(index, 'startTime', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) => handleWorkingHoursChange(index, 'endTime', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {day.isWorking && (
                      <>
                        {/* Break Times */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Break Times:</h4>
                            <button
                              onClick={() => addBreak(index)}
                              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                              Add Break
                            </button>
                          </div>
                          
                          {day.breaks.length > 0 ? (
                            <div className="space-y-3">
                              {day.breaks.map((breakTime, breakIndex) => (
                                <div key={breakIndex} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="flex-1 grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                                      <input
                                        type="time"
                                        value={breakTime.startTime}
                                        onChange={(e) => updateBreak(index, breakIndex, 'startTime', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                                      <input
                                        type="time"
                                        value={breakTime.endTime}
                                        onChange={(e) => updateBreak(index, breakIndex, 'endTime', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeBreak(index, breakIndex)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No breaks configured</p>
                          )}
                        </div>

                        {/* Available Time Slots */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Time Slots:</h4>
                          <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              {generateTimeSlots(day.startTime, day.endTime, settings.appointment_duration, day.breaks).map((slot, slotIndex) => (
                                <div key={slotIndex} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center">
                                  {slot}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 disabled:opacity-50 transition-all duration-200 font-medium"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentSettingsPage; 