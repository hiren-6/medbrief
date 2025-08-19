import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatDateIST } from '../utils/timezone';

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_datetime: string;
  status: string;
  created_at: string;
}

interface AppointmentChartWithControlsProps {
  appointments: Appointment[];
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday as start
  return d;
}

function getMonthStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function formatDateLabel(date: Date, mode: 'week' | 'month') {
  if (mode === 'week') {
    const end = new Date(date);
    end.setDate(date.getDate() + 6);
    return `${date.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  } else {
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }
}

const AppointmentChartWithControls: React.FC<AppointmentChartWithControlsProps> = ({ appointments }) => {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Group appointments by week or month
  function groupAppointments() {
    const grouped: Record<string, { total: number; pending: number; completed: number; } & { label: string }> = {};
    appointments.forEach(app => {
      const date = new Date(app.appointment_datetime);
      let key: string;
      let label: string;
      if (mode === 'week') {
        const weekStart = getWeekStart(date);
        key = weekStart.toISOString();
        label = formatDateLabel(weekStart, 'week');
      } else {
        const monthStart = getMonthStart(date);
        key = monthStart.toISOString();
        label = formatDateLabel(monthStart, 'month');
      }
      if (!grouped[key]) {
        grouped[key] = { total: 0, pending: 0, completed: 0, label };
      }
      grouped[key].total++;
      if (app.status === 'pending') grouped[key].pending++;
      if (app.status === 'completed') grouped[key].completed++;
    });
    // Sort by key (date)
    return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label));
  }

  const groupedData = groupAppointments();

  // For slider: get all unique week/month keys
  const allPeriods = groupedData.map(d => d.label);
  const currentPeriodIndex = allPeriods.length > 0 ? allPeriods.length - 1 : 0;
  const [sliderIndex, setSliderIndex] = useState(currentPeriodIndex);

  // Show only selected period
  const chartData = groupedData[sliderIndex] ? [groupedData[sliderIndex]] : [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium border ${mode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setMode('week')}
          >
            Week
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium border ${mode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setMode('month')}
          >
            Month
          </button>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={allPeriods.length - 1}
          value={sliderIndex}
          onChange={e => setSliderIndex(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-sm text-gray-600 text-center mt-1">
          {allPeriods[sliderIndex] || 'No data'}
        </div>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="pending" stackId="a" fill="#fbbf24" name="Pending" />
            <Bar dataKey="completed" stackId="a" fill="#34d399" name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AppointmentChartWithControls; 