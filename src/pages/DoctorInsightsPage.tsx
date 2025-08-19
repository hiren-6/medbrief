import React from 'react';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorTopNavbar from '../components/DoctorTopNavbar';
import { 
  Users,
  Clock,
  Calendar,
  Heart,
  TrendingUp,
  Activity,
  Stethoscope,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const DoctorInsightsPage: React.FC = () => {
  // Dummy data for demonstration
  const monthlyData = [
    { month: 'Jan', patients: 65, revenue: 5200 },
    { month: 'Feb', patients: 59, revenue: 4800 },
    { month: 'Mar', patients: 80, revenue: 6400 },
    { month: 'Apr', patients: 81, revenue: 6500 },
    { month: 'May', patients: 56, revenue: 4500 },
    { month: 'Jun', patients: 55, revenue: 4400 },
    { month: 'Jul', patients: 40, revenue: 3200 },
    { month: 'Aug', patients: 65, revenue: 5200 },
    { month: 'Sep', patients: 59, revenue: 4800 },
    { month: 'Oct', patients: 80, revenue: 6400 },
    { month: 'Nov', patients: 81, revenue: 6500 },
    { month: 'Dec', patients: 56, revenue: 4500 }
  ];

  const consultationTypes = [
    { type: 'In-Person', count: 156, percentage: 65, color: 'from-blue-500 to-blue-600' },
    { type: 'Video Call', count: 72, percentage: 30, color: 'from-teal-500 to-teal-600' },
    { type: 'Phone Call', count: 12, percentage: 5, color: 'from-purple-500 to-purple-600' }
  ];

  const topDiagnoses = [
    { name: 'Hypertension', count: 45, trend: '+12%' },
    { name: 'Type 2 Diabetes', count: 38, trend: '+8%' },
    { name: 'Anxiety Disorder', count: 32, trend: '+15%' },
    { name: 'Common Cold', count: 28, trend: '-5%' },
    { name: 'Back Pain', count: 25, trend: '+3%' }
  ];

  const recentActivities: { action: string; time: string; type: 'success' | 'info' | 'warning' }[] = [
    { action: 'New patient registration', time: '2 hours ago', type: 'success' },
    { action: 'Completed consultation', time: '4 hours ago', type: 'info' },
    { action: 'Updated medical records', time: '6 hours ago', type: 'warning' },
    { action: 'Prescription renewed', time: '8 hours ago', type: 'success' },
    { action: 'Follow-up scheduled', time: '1 day ago', type: 'info' }
  ];

  const getActivityIcon = (type: 'success' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'info':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <DoctorSidebar />
      {/* Header */}
      <DoctorTopNavbar />

      {/* Content */}
      <div className="pt-[90px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Under Construction / Demo Banner */}
        <div className="mb-6">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-teal-50 p-4">
            <div className="flex items-start">
              <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-teal-500">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Under Construction — Demo View</p>
                <p className="text-sm text-gray-700">This page uses sample data and UI only. Live analytics integration is in progress.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Practice Insights</h1>
          <p className="text-gray-600">Comprehensive analytics and trends from your medical practice</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              icon: Users,
              title: 'Total Patients',
              value: '1,247',
              trend: '+12%',
              trendColor: 'text-green-500',
              bgColor: 'from-blue-500 to-blue-600'
            },
            {
              icon: Clock,
              title: 'Avg. Wait Time',
              value: '12 mins',
              trend: '-8%',
              trendColor: 'text-green-500',
              bgColor: 'from-teal-500 to-teal-600'
            },
            {
              icon: Calendar,
              title: 'This Week',
              value: '48',
              trend: '+5%',
              trendColor: 'text-green-500',
              bgColor: 'from-purple-500 to-purple-600'
            },
            {
              icon: Heart,
              title: 'Satisfaction',
              value: '4.8/5',
              trend: '+2%',
              trendColor: 'text-green-500',
              bgColor: 'from-pink-500 to-pink-600'
            }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.bgColor}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <span className={`text-sm font-medium ${stat.trendColor}`}>{stat.trend}</span>
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-600">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Patient Trends Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Patient Volume Trends</h3>
              <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="h-64 bg-gray-50 rounded-lg p-4">
              <div className="flex items-end justify-between h-full">
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="w-8 bg-gradient-to-t from-blue-500 to-teal-500 rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${(data.patients / 100) * 200}px` }}
                    ></div>
                    <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Monthly patient visits showing steady growth</p>
            </div>
          </div>

          {/* Consultation Types */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Consultation Types</h3>
              <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-2 rounded-lg">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              {consultationTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${type.color}`}></div>
                    <span className="text-gray-700">{type.type}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">{type.count}</span>
                    <span className="text-sm text-gray-500">({type.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                <strong>65%</strong> of consultations are in-person, showing patient preference for traditional visits
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Diagnoses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 text-blue-500 mr-2" />
              Top Diagnoses
            </h3>
            <div className="space-y-4">
              {topDiagnoses.map((diagnosis, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">{diagnosis.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{diagnosis.count}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        diagnosis.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {diagnosis.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Demographics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 text-teal-500 mr-2" />
              Patient Demographics
            </h3>
            <div className="space-y-4">
              {[
                { age: '18-30', percentage: 25, color: 'from-blue-400 to-blue-500' },
                { age: '31-50', percentage: 40, color: 'from-teal-400 to-teal-500' },
                { age: '51-70', percentage: 28, color: 'from-purple-400 to-purple-500' },
                { age: '70+', percentage: 7, color: 'from-pink-400 to-pink-500' }
              ].map((demo, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Age {demo.age}</span>
                    <span className="text-sm font-medium text-gray-900">{demo.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${demo.color}`} style={{ width: `${demo.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 text-purple-500 mr-2" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Patient Engagement</h4>
              <p className="text-sm text-blue-800">
                Your patient satisfaction score of 4.8/5 indicates excellent care quality. Consider expanding video
                consultation hours to meet growing demand.
              </p>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Practice Growth</h4>
              <p className="text-sm text-purple-800">
                Patient volume increased by 12% this month. Peak consultation hours are 9-11 AM and 2-4 PM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorInsightsPage;


