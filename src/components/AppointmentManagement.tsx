import React, { useState } from 'react';
import { Search, Edit, Trash2, Calendar, Filter, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ConfirmDialog from './ConfirmDialog';
import Toast, { ToastType } from './Toast';
import { formatDateTimeIST } from '../utils/timezone';

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_datetime: string;
  status: string;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
}

interface AppointmentManagementProps {
  appointments: Appointment[];
  users: any[];
  onAppointmentUpdate: (updatedAppointment: Appointment) => void;
  onAppointmentDelete: (appointmentId: string) => void;
}

const AppointmentManagement: React.FC<AppointmentManagementProps> = ({ 
  appointments, 
  users, 
  onAppointmentUpdate, 
  onAppointmentDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'info'
  });

  // Enhance appointments with doctor and patient names
  const enhancedAppointments = appointments.map(appointment => {
    const doctor = users.find(user => user.id === appointment.doctor_id);
    const patient = users.find(user => user.id === appointment.patient_id);
    return {
      ...appointment,
      doctor_name: doctor?.full_name || 'Unknown Doctor',
      patient_name: patient?.full_name || 'Unknown Patient'
    };
  });

  const filteredAppointments = enhancedAppointments.filter(appointment => {
    const matchesSearch = 
      appointment.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      const updatedAppointment = enhancedAppointments.find(a => a.id === appointmentId);
      if (updatedAppointment) {
        onAppointmentUpdate({ ...updatedAppointment, status: newStatus });
      }

      setToast({
        show: true,
        message: 'Appointment status updated successfully',
        type: 'success'
      });
    } catch (error) {
      setToast({
        show: true,
        message: 'Failed to update appointment status',
        type: 'error'
      });
    }
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentToDelete);

      if (error) throw error;

      onAppointmentDelete(appointmentToDelete);
      setToast({
        show: true,
        message: 'Appointment deleted successfully',
        type: 'success'
      });
    } catch (error) {
      setToast({
        show: true,
        message: 'Failed to delete appointment',
        type: 'error'
      });
    } finally {
      setShowDeleteDialog(false);
      setAppointmentToDelete(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return formatDateTimeIST(dateTime);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <Calendar className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Appointment Management</h3>
          </div>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Appointment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAppointments.map((appointment) => (
              <tr key={appointment.id} className="table-row-hover">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    #{appointment.id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(appointment.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {appointment.doctor_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {appointment.patient_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(appointment.appointment_datetime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={appointment.status}
                    onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                    className={`px-2 py-1 text-xs font-medium rounded-full status-badge ${getStatusBadgeColor(appointment.status)} border-0 focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleDeleteAppointment(appointment.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredAppointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No appointments have been scheduled yet.'
            }
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setAppointmentToDelete(null);
        }}
        type="danger"
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
};

export default AppointmentManagement; 