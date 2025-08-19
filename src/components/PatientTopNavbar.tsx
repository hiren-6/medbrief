import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { supabase } from '../supabaseClient';

const PatientTopNavbar: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; created_at: string }>>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('patient_notification')
        .select('id, message, created_at, read')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = (data || []).map((n: any) => ({ id: n.id, message: n.message, created_at: n.created_at }));
      setNotifications(list);
      setHasUnread(((data || []).some((n: any) => !n.read)));
    };
    load();
  }, []);

  const handleBellClick = () => setShowNotifications(v => !v);
  const handleClose = () => setShowNotifications(false);
  const handleNotificationClick = async (id: string) => {
    await supabase.from('patient_notification').update({ read: true }).eq('id', id);
    setHasUnread(false);
    setShowNotifications(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200 h-[70px]">
      <div className="max-w-4xl mx-auto px-4 h-full">
        <div className="relative h-full">
          {/* Centered Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-32 h-12 rounded-xl overflow-hidden">
              <img src="/Picture3.svg" alt="MedBrief AI Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          {/* Right: Notification bell */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTopNavbar;


