import React, { useEffect, useRef } from 'react';

interface NotificationDropdownProps {
  notifications: Array<{ id: string; message: string; created_at: string }>;
  show: boolean;
  onClose: () => void;
  onNotificationClick: (id: string) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ notifications, show, onClose, onNotificationClick }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose]);

  if (!show) return null;
  const safeNotifications = notifications || [];
  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 z-50 origin-top-right bg-white border border-gray-200 rounded-xl shadow-xl transition-all duration-300 ease-out transform opacity-100 scale-100 animate-dropdown"
      style={{ minWidth: '320px' }}
    >
      {/* Arrow at the top */}
      <div className="absolute -top-2 right-6 w-4 h-4 bg-white border-t border-l border-gray-200 rotate-45 z-50"></div>
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <span className="font-bold text-gray-800 text-lg">Notifications</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
      </div>
      <div className="overflow-y-auto max-h-96">
        {safeNotifications.length === 0 ? (
          <div className="p-6 text-gray-500 text-center text-base">No notifications for you</div>
        ) : (
          safeNotifications.map(n => (
            <button
              key={n.id}
              onClick={() => onNotificationClick(n.id)}
              className="w-full text-left px-4 py-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors duration-200"
            >
              <div className="text-gray-800 text-base">{n.message}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown; 