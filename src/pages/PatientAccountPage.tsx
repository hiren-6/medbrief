import React from 'react';
import PatientSidebar from '../components/PatientSidebar';
import PatientTopNavbar from '../components/PatientTopNavbar';
import AccountPage from './AccountPage';

const PatientAccountPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <PatientSidebar />
      <PatientTopNavbar />
      <div className="pt-[90px] max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6">
          <AccountPage />
        </div>
      </div>
    </div>
  );
};

export default PatientAccountPage;


