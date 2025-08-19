import React from 'react';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorTopNavbar from '../components/DoctorTopNavbar';
import AppointmentSettingsPage from './AppointmentSettingsPage';

const DoctorSettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <DoctorSidebar />
      {/* Header */}
      <DoctorTopNavbar />

      {/* Content */}
      <div className="pt-[90px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6">
          <AppointmentSettingsPage />
        </div>
      </div>
    </div>
  );
};

export default DoctorSettingsPage;


