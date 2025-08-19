import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProfileImage from './ProfileImage';
import { Home, BarChart2, MessageCircle, User, Settings, LogOut, Shield } from 'lucide-react';

interface Profile {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

const NAV_TOP = [
  { key: 'home', label: 'Home', icon: Home, to: '/dashboard/doctor' },
  { key: 'insights', label: 'Insights', icon: BarChart2, to: '/dashboard/doctor/insights' },
  { key: 'chats', label: 'Chats', icon: MessageCircle, to: '/dashboard/doctor/chats' },
];

const NAV_BOTTOM = [
  { key: 'profile', label: 'My Profile', icon: User, to: '/dashboard/doctor/profile' },
  { key: 'account', label: 'My Account', icon: Shield, to: '/dashboard/doctor/account' },
  { key: 'settings', label: 'Settings', icon: Settings, to: '/dashboard/doctor/settings' },
];

const DoctorSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('doctorSidebarProfile');
      return cached ? (JSON.parse(cached) as Profile) : null;
    } catch {
      return null;
    }
  });

  // Load persisted expansion state (optional future pinning)
  useEffect(() => {
    const persisted = localStorage.getItem('doctorSidebarExpanded');
    setIsExpanded(persisted === 'true' ? true : false);
  }, []);

  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    localStorage.setItem('doctorSidebarExpanded', 'false');
  };

  // Fetch current doctor's profile with cache hydration
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, profile_image_url')
        .eq('id', user.id)
        .single();
      if (!isMounted || !data) return;
      try {
        const cachedRaw = localStorage.getItem('doctorSidebarProfile');
        const cached: Profile | null = cachedRaw ? JSON.parse(cachedRaw) : null;
        const hasChanged = !cached ||
          cached.full_name !== data.full_name ||
          cached.first_name !== data.first_name ||
          cached.last_name !== data.last_name ||
          cached.profile_image_url !== data.profile_image_url;
        if (hasChanged) {
          setProfile(data as Profile);
          localStorage.setItem('doctorSidebarProfile', JSON.stringify(data));
        }
      } catch {
        setProfile(data as Profile);
        localStorage.setItem('doctorSidebarProfile', JSON.stringify(data));
      }
    };
    loadProfile();
    return () => { isMounted = false; };
  }, []);

  const displayName = useMemo(() => {
    if (!profile) return '';
    const first = (profile.first_name || '').trim();
    if (first) return first;
    const full = (profile.full_name || '').trim();
    if (full) return full.split(/\s+/)[0] || '';
    return '';
  }, [profile]);

  const isActive = (to: string) => {
    if (to === '/dashboard/doctor') {
      return location.pathname === '/dashboard/doctor';
    }
    return location.pathname.startsWith(to);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Widths: expanded reduced by 20px, collapsed fixed to fit avatar

  return (
    <aside
      className={`fixed left-0 top-0 h-full transition-all duration-300 ease-in-out bg-white border-r border-gray-200 z-[60] group`}
      style={{ width: isExpanded ? '210px' : '74px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Doctor sidebar navigation"
    >
      {/* Sidebar overlays header; no spacer */}

      {/* Profile block */}
      <div className="px-3">
        <div className={`flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors ${isExpanded ? 'gap-3 justify-start' : 'gap-0 justify-center'}`}>
          <ProfileImage imageUrl={profile?.profile_image_url} size="md" alt={displayName || 'Doctor'} />
          {isExpanded && (
            <div className="transition-opacity duration-200 opacity-100 ml-2">
              <p className="text-sm font-semibold text-gray-800 truncate">
                Dr. {displayName || 'Doctor'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top navigation */}
      <nav className="mt-4 px-2 space-y-1">
        {NAV_TOP.map(({ key, label, icon: Icon, to }) => {
          const active = isActive(to);
          return (
            <button
              key={key}
              onClick={() => {
                if (to === '/dashboard/doctor') {
                  if (location.pathname === '/dashboard/doctor') {
                    navigate('/dashboard/doctor', { state: { resetConsultation: true, _ts: Date.now() } });
                  } else {
                    navigate('/dashboard/doctor');
                  }
                } else {
                  navigate(to);
                }
              }}
              className={`group w-full flex items-center py-2 rounded-lg transition-colors text-sm font-medium ${isExpanded ? 'gap-3 px-3 justify-start' : 'gap-0 px-2 justify-center'}
                ${active ? 'bg-gradient-to-r from-blue-50 to-teal-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
              `}
            >
              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-md flex-shrink-0
                ${active ? 'bg-gradient-to-br from-blue-500 to-teal-500 text-white' : 'bg-gradient-to-br from-blue-100 to-teal-100 text-blue-600 group-hover:from-blue-200 group-hover:to-teal-200'}
              `}>
                <Icon className="h-4 w-4" />
              </span>
              {isExpanded && (
                <span className="transition-opacity duration-200 whitespace-nowrap opacity-100 ml-2">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="absolute bottom-3 left-0 right-0 px-2">
        {NAV_BOTTOM.map(({ key, label, icon: Icon, to }) => {
          const active = isActive(to);
          return (
            <button
              key={key}
              onClick={() => navigate(to)}
              className={`group w-full flex items-center py-2 rounded-lg transition-colors text-sm font-medium ${isExpanded ? 'gap-3 px-3 justify-start' : 'gap-0 px-2 justify-center'}
                ${active ? 'bg-gradient-to-r from-blue-50 to-teal-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
              `}
            >
              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-md flex-shrink-0
                ${active ? 'bg-gradient-to-br from-blue-500 to-teal-500 text-white' : 'bg-gradient-to-br from-blue-100 to-teal-100 text-blue-600 group-hover:from-blue-200 group-hover:to-teal-200'}
              `}>
                <Icon className="h-4 w-4" />
              </span>
              {isExpanded && (
                <span className="transition-opacity duration-200 whitespace-nowrap opacity-100 ml-2">{label}</span>
              )}
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className={`group w-full flex items-center py-2 rounded-lg transition-colors text-sm font-medium text-red-600 hover:bg-red-50 mt-1 ${isExpanded ? 'gap-3 px-3 justify-start' : 'gap-0 px-2 justify-center'}`}
        >
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-md flex-shrink-0 border border-red-200 bg-red-100 text-red-600 group-hover:bg-red-200">
            <LogOut className="h-4 w-4" />
          </span>
          {isExpanded && (
            <span className="transition-opacity duration-200 whitespace-nowrap opacity-100 ml-2">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;


