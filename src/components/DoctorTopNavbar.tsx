import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { supabase } from '../supabaseClient';

interface DoctorTopNavbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

const DoctorTopNavbar: React.FC<DoctorTopNavbarProps> = ({ left, right }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; created_at: string }>>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('doctor_notifications')
        .select('id, message, created_at, read')
        .eq('doctor_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = (data || []).map((n: any) => ({ id: n.id, message: n.message, created_at: n.created_at }));
      setNotifications(list);
      setHasUnread(list.length > 0);
    };
    load();
  }, []);

  const handleBellClick = () => setShowNotifications(v => !v);
  const handleClose = () => setShowNotifications(false);
  const handleNotificationClick = async (id: string) => {
    const { error } = await supabase.from('doctor_notifications').update({ read: true }).eq('id', id);
    if (error) return;
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      setHasUnread(updated.length > 0);
      return updated;
    });
  };

  const defaultRight = (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        onClick={handleBellClick}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-md bg-gradient-to-br from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 shadow-sm transition-colors"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>
      <NotificationDropdown
        notifications={notifications}
        show={showNotifications}
        onClose={handleClose}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200 h-[70px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="relative h-full">
          {/* Left content (optional) */}
          <div className="h-full flex items-center">
            {left}
          </div>
          {/* Centered Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-32 h-12 rounded-xl overflow-hidden">
              <img src="/Picture3.svg" alt="MedBrief AI Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          {/* Right content (optional) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
            {right ?? defaultRight}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorTopNavbar;


