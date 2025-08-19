import React, { useMemo } from 'react';
import PatientSidebar from '../components/PatientSidebar';
import PatientTopNavbar from '../components/PatientTopNavbar';
import { Activity, Heart, Pill, Droplet, CalendarCheck, BookOpen, Brain, Stethoscope, Apple, Dumbbell, AlertCircle } from 'lucide-react';

const PatientEducationPage: React.FC = () => {
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const waterIntakeGlasses = [8, 6, 9, 5, 7, 10, 8];
  const dailySteps = [5200, 8600, 7100, 4000, 9800, 12000, 8300];
  const adherencePercent = 86; // medication adherence

  const maxGlasses = 12;
  const maxSteps = useMemo(() => Math.max(...dailySteps, 12000), [dailySteps]);

  const linePoints = useMemo(() => {
    const width = 320;
    const height = 120;
    const paddingX = 12;
    const paddingY = 10;
    const stepX = (width - paddingX * 2) / (dailySteps.length - 1);
    return dailySteps
      .map((v, i) => {
        const x = paddingX + i * stepX;
        const y = paddingY + (height - paddingY * 2) * (1 - v / maxSteps);
        return `${x},${y}`;
      })
      .join(' ');
  }, [dailySteps, maxSteps]);

  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <PatientSidebar />
      <PatientTopNavbar />
      <div className="pt-[100px] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
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
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Patient Education</h1>
                  <p className="text-gray-600 mt-2">Evidence-based tips, guides, and visual insights to support your health journey.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <Droplet className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-blue-700">Hydration</div>
                      <div className="text-sm font-semibold text-blue-800">8 glasses</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="text-xs text-emerald-700">Steps</div>
                      <div className="text-sm font-semibold text-emerald-800">8.3k</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                    <Pill className="h-5 w-5 text-violet-600" />
                    <div>
                      <div className="text-xs text-violet-700">Adherence</div>
                      <div className="text-sm font-semibold text-violet-800">86%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <CalendarCheck className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="text-xs text-amber-700">Next visit</div>
                      <div className="text-sm font-semibold text-amber-800">Tue 4 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: articles/topics */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-600" /> Featured Guides</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: 'Understanding Your Prescription', desc: 'Decode dosage, timing, and warnings safely.', icon: Pill, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { title: 'Preparing for a Doctor Visit', desc: 'Maximize time with the right questions.', icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { title: 'Healthy Heart Basics', desc: 'Habits that support cardiovascular health.', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { title: 'Nutrition Fundamentals', desc: 'Build balanced meals and smart snacks.', icon: Apple, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { title: 'Exercise Starter Plan', desc: 'Simple routines to get moving safely.', icon: Dumbbell, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { title: 'Managing Stress', desc: 'Practical techniques to stay centered.', icon: Brain, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                  ].map((card, idx) => (
                    <div key={idx} className={`group p-5 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-200 ${card.bg}`}>
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white border ${card.color}`}>
                          <card.icon className={`h-5 w-5 ${card.color}`} />
                        </span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 leading-snug">{card.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{card.desc}</p>
                          <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Read more →</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-600" /> Healthy Habits This Week</h2>
                </div>
                {/* Bar chart: water intake */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Water Intake</span>
                      <span className="text-sm font-medium text-gray-800">Goal: 10 glasses/day</span>
                    </div>
                    <div className="h-44 w-full rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-end justify-between">
                      {waterIntakeGlasses.map((v, i) => {
                        const h = Math.max(6, Math.round((v / maxGlasses) * 100));
                        return (
                          <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-8 bg-gradient-to-t from-blue-200 to-blue-500 rounded-t-lg" style={{ height: `${h}%` }} />
                            <span className="text-xs text-gray-500">{weekLabels[i]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Line chart: steps */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Daily Steps</span>
                      <span className="text-sm font-medium text-gray-800">Target: 10k</span>
                    </div>
                    <div className="h-44 w-full rounded-xl bg-gray-50 border border-gray-200 p-4">
                      <svg viewBox="0 0 320 120" className="w-full h-full">
                        <defs>
                          <linearGradient id="gradSteps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
                          </linearGradient>
                        </defs>
                        <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={linePoints} />
                        <polyline fill="url(#gradSteps)" stroke="none" points={`0,120 ${linePoints} 320,120`} />
                      </svg>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        {weekLabels.map((d, i) => (
                          <span key={d} className={i === 0 ? '' : 'ml-2'}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: adherence donut and quick links */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800">Medication Adherence</h2>
                <div className="mt-4 flex items-center justify-center">
                  <div className="relative h-40 w-40">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#8b5cf6 ${adherencePercent}%, #e5e7eb 0)`
                      }}
                    />
                    <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-800">{adherencePercent}%</div>
                        <div className="text-xs text-gray-500">last 7 days</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-violet-500"></span><span className="text-gray-600">Taken</span><span className="ml-auto font-medium text-gray-800">86%</span></div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gray-300"></span><span className="text-gray-600">Missed</span><span className="ml-auto font-medium text-gray-800">14%</span></div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800">Quick Tips</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Droplet className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-gray-700">Drink a glass of water with every meal to build routine hydration.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Pill className="h-4 w-4 text-violet-600 mt-0.5" />
                    <p className="text-gray-700">Use a pill organizer and set alarms for consistent medication timing.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <p className="text-gray-700">Aim for short walks after meals to support blood sugar control.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientEducationPage;


