import { supabase } from '../supabaseClient';

export interface StatusUpdateRequest {
  appointmentId: string;
  newStatus: 'scheduled' | 'checked' | 'cancelled';
  reason?: string;
  notes?: string;
}

export interface StatusHistoryEntry {
  id: string;
  appointment_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
  notes?: string;
}

export interface AppointmentStatusSummary {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_datetime: string;
  current_status: string;
  status_changed_at: string;
  status_changed_by: string;
  cancellation_reason?: string;
  completion_notes?: string;
  status_change_count: number;
  last_status_change: string;
}

export class AppointmentStatusService {
  // Valid status transitions
  private static validTransitions = {
    'scheduled': ['checked', 'cancelled'],
    'checked': [], // Terminal state
    'cancelled': [] // Terminal state
  };

  /**
   * Update appointment status with validation and audit trail
   */
  static async updateStatus(request: StatusUpdateRequest): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch current appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', request.appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('Failed to fetch appointment:', fetchError);
      console.error('Appointment ID:', request.appointmentId);
      throw new Error('Appointment not found');
    }

    console.log('Found appointment:', appointment);

    // Validate status transition
    if (!this.isValidTransition(appointment.status, request.newStatus)) {
      throw new Error(`Invalid status transition from ${appointment.status} to ${request.newStatus}`);
    }

    // Prepare update data
    const updateData: any = {
      status: request.newStatus,
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Add specific fields based on status
    if (request.newStatus === 'cancelled') {
      updateData.cancellation_reason = request.reason;
    } else if (request.newStatus === 'checked') {
      updateData.completion_notes = request.notes;
    }

    // Update appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', request.appointmentId);

    if (updateError) {
      console.error('Failed to update appointment status:', updateError);
      console.error('Update data that was sent:', updateData);
      console.error('Appointment ID:', request.appointmentId);
      throw new Error(`Failed to update appointment status: ${updateError.message}`);
    }

    console.log(`Appointment ${request.appointmentId} status updated to ${request.newStatus}`);
    return true;
  }

  /**
   * Check if a status transition is valid
   */
  private static isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowedTransitions = this.validTransitions[currentStatus as keyof typeof this.validTransitions];
    return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
  }

  /**
   * Get status history for an appointment
   */
  static async getStatusHistory(appointmentId: string): Promise<StatusHistoryEntry[]> {
    const { data, error } = await supabase
      .from('appointment_status_history')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch status history:', error);
      throw new Error('Failed to fetch status history');
    }

    return data || [];
  }

  /**
   * Get appointment status summary
   */
  static async getAppointmentStatusSummary(appointmentId: string): Promise<AppointmentStatusSummary | null> {
    const { data, error } = await supabase
      .from('appointment_status_summary')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error) {
      console.error('Failed to fetch appointment status summary:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all appointments for a doctor with status information
   */
  static async getDoctorAppointments(doctorId: string, date?: Date): Promise<any[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        consultations!appointments_consultation_id_fkey(*),
        profiles!appointments_patient_id_fkey(
          id,
          full_name,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth,
          gender
        )
      `)
      .eq('doctor_id', doctorId);

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('appointment_datetime', startOfDay.toISOString())
        .lte('appointment_datetime', endOfDay.toISOString());
    }

    query = query.order('appointment_datetime', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch doctor appointments:', error);
      throw new Error('Failed to fetch appointments');
    }

    return data || [];
  }

  /**
   * Get all appointments for a patient with status information
   */
  static async getPatientAppointments(patientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        consultations!appointments_consultation_id_fkey(*),
        profiles!appointments_doctor_id_fkey(
          id,
          full_name,
          doctor_speciality
        )
      `)
      .eq('patient_id', patientId)
      .order('appointment_datetime', { ascending: false });

    if (error) {
      console.error('Failed to fetch patient appointments:', error);
      throw new Error('Failed to fetch appointments');
    }

    return data || [];
  }

  /**
   * Subscribe to real-time appointment updates for a doctor
   */
  static subscribeToDoctorAppointments(doctorId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`doctor_appointments_${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to real-time appointment updates for a patient
   */
  static subscribeToPatientAppointments(patientId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`patient_appointments_${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to status history updates
   */
  static subscribeToStatusHistory(appointmentId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`status_history_${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointment_status_history',
          filter: `appointment_id=eq.${appointmentId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Get appointment statistics for a doctor
   */
  static async getDoctorAppointmentStats(doctorId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    let query = supabase
      .from('appointments')
      .select('status, appointment_datetime')
      .eq('doctor_id', doctorId);

    if (dateRange) {
      query = query
        .gte('appointment_datetime', dateRange.start.toISOString())
        .lte('appointment_datetime', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch appointment stats:', error);
      throw new Error('Failed to fetch appointment statistics');
    }

    const stats = {
      total: data?.length || 0,
      scheduled: data?.filter(a => a.status === 'scheduled').length || 0,
      checked: data?.filter(a => a.status === 'checked').length || 0,
      cancelled: data?.filter(a => a.status === 'cancelled').length || 0
    };

    return stats;
  }
} 