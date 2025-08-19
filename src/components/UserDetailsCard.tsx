import React from 'react';
import { User as UserIcon, UserPlus, UserCheck } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserDetailsCardProps {
  users: User[];
}

const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length === 1) return names[0][0];
  return names[0][0] + names[names.length - 1][0];
};

const roleColors: Record<string, string> = {
  doctor: 'bg-blue-100 text-blue-700',
  patient: 'bg-green-100 text-green-700',
  admin: 'bg-yellow-100 text-yellow-700',
};

const UserDetailsCard: React.FC<UserDetailsCardProps> = ({ users }) => {
  const totalUsers = users.length;
  const totalDoctors = users.filter(u => u.role === 'doctor').length;
  const totalPatients = users.filter(u => u.role === 'patient').length;
  const recentUsers = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <UserIcon className="h-6 w-6 text-blue-500" /> User Details
      </h3>
      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3">
          <UserIcon className="h-6 w-6 text-blue-600 mb-1" />
          <span className="text-xs text-gray-500">Total Users</span>
          <span className="text-lg font-bold text-gray-800">{totalUsers}</span>
        </div>
        <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3">
          <UserCheck className="h-6 w-6 text-blue-700 mb-1" />
          <span className="text-xs text-gray-500">Doctors</span>
          <span className="text-lg font-bold text-blue-700">{totalDoctors}</span>
        </div>
        <div className="flex flex-col items-center bg-green-50 rounded-lg p-3">
          <UserPlus className="h-6 w-6 text-green-700 mb-1" />
          <span className="text-xs text-gray-500">Patients</span>
          <span className="text-lg font-bold text-green-700">{totalPatients}</span>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Users</h4>
        <ul className="divide-y divide-gray-100">
          {recentUsers.map(user => (
            <li key={user.id} className="flex items-center py-3 gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center text-lg font-bold text-blue-700">
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">{user.full_name}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold capitalize ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>{user.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserDetailsCard; 