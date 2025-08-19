import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Users, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DashboardStats from '../components/DashboardStats';
import UserManagement from '../components/UserManagement';
import AppointmentManagement from '../components/AppointmentManagement';
import Toast, { ToastType } from '../components/Toast';
import UserDetailsCard from '../components/UserDetailsCard';
import AppointmentChartWithControls from '../components/AppointmentChartWithControls';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_datetime: string;
  status: string;
  created_at: string;
}

type TabType = 'overview' | 'users' | 'appointments';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userRole, setUserRole] = useState('');
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Get current user's role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile || profile.role !== 'admin') {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }

        setUserRole(profile.role);

        // Fetch all profiles
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, created_at')
          .order('created_at', { ascending: false });

        if (profilesError) {
          throw new Error('Failed to fetch users: ' + profilesError.message);
        }

        setProfiles(allProfiles || []);

        // Fetch all appointments
        const { data: allAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: false });

        if (appointmentsError) {
          throw new Error('Failed to fetch appointments: ' + appointmentsError.message);
        }

        setAppointments(allAppointments || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      setToast({
        show: true,
        message: 'Failed to logout',
        type: 'error'
      });
    }
  };

  const handleUserUpdate = (updatedUser: Profile) => {
    setProfiles(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
  };

  const handleUserDelete = (userId: string) => {
    setProfiles(prev => prev.filter(user => user.id !== userId));
  };

  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setAppointments(prev => prev.map(appointment => 
      appointment.id === updatedAppointment.id ? updatedAppointment : appointment
    ));
  };

  const handleAppointmentDelete = (appointmentId: string) => {
    setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId));
  };

  // Calculate stats
  const stats = {
    totalUsers: profiles.length,
    totalDoctors: profiles.filter(p => p.role === 'doctor').length,
    totalPatients: profiles.filter(p => p.role === 'patient').length,
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter(a => a.status === 'pending').length,
    completedAppointments: appointments.filter(a => a.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as TabType)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      currentTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'overview' && (
          <div className="animate-fade-in flex flex-col md:flex-row gap-8">
            {/* User Details - Left Side */}
            <div className="w-full md:w-1/3">
              <UserDetailsCard users={profiles} />
            </div>
            {/* Appointment Chart - Right Side */}
            <div className="w-full md:w-2/3">
              <AppointmentChartWithControls appointments={appointments} />
            </div>
          </div>
        )}

        {currentTab === 'users' && (
          <div className="animate-slide-in">
            <UserManagement
              users={profiles}
              onUserUpdate={handleUserUpdate}
              onUserDelete={handleUserDelete}
            />
          </div>
        )}

        {currentTab === 'appointments' && (
          <div className="animate-slide-in">
            <AppointmentManagement
              appointments={appointments}
              users={profiles}
              onAppointmentUpdate={handleAppointmentUpdate}
              onAppointmentDelete={handleAppointmentDelete}
            />
          </div>
        )}
      </div>

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

export default AdminDashboardPage; 