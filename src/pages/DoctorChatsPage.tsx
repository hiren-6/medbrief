import React, { useEffect, useMemo, useState } from 'react';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorTopNavbar from '../components/DoctorTopNavbar';
import ProfileImage from '../components/ProfileImage';
import { Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import RichText from '../components/RichText';

interface LocalSession {
	consultationId: string;
	sessionId: string;
	patientName: string;
	patientImageUrl?: string;
	title?: string;
	lastMessageAt?: string;
}

async function fetchSessions(): Promise<LocalSession[]> {
	const { data: sessions, error } = await supabase
		.from('chat_sessions')
		.select('id, consultation_id, patient_id, title, last_message_at')
		.order('last_message_at', { ascending: false });
	if (error) {
		console.error('Failed to fetch sessions', error);
		return [];
	}
	const patientIds = Array.from(new Set((sessions || []).map((s: any) => s.patient_id)));
	let profiles: Record<string, { full_name?: string; profile_image_url?: string }> = {};
	if (patientIds.length > 0) {
		const { data: profs } = await supabase
			.from('profiles')
			.select('id, full_name, profile_image_url')
			.in('id', patientIds);
		profiles = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
	}
	return (sessions || []).map((s: any) => ({
		sessionId: s.id,
		consultationId: s.consultation_id,
		patientName: profiles[s.patient_id]?.full_name ? `Patient: ${profiles[s.patient_id].full_name}` : 'Patient',
		patientImageUrl: profiles[s.patient_id]?.profile_image_url,
		title: s.title || 'Consultation chat',
		lastMessageAt: s.last_message_at || undefined
	}));
}

const DoctorChatsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pl-16">
      <DoctorSidebar />
      {/* Header */}
      <DoctorTopNavbar />

      {/* Content */}
      <div className="pt-[90px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History shelf */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-teal-500">
              <h2 className="text-white font-semibold">Chat history</h2>
            </div>
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-gray-500" />
                <SearchBox />
              </div>
            </div>
            <HistoryList />
          </div>
          {/* Detailed view */}
          <DetailPanel />
        </div>
      </div>
    </div>
  );
};

export default DoctorChatsPage;



const HistoryList: React.FC = () => {
	const [sessions, setSessions] = useState<LocalSession[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [query, setQuery] = useState<string>('');

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			const data = await fetchSessions();
			if (!cancelled) setSessions(data);
		};
		load();
		const refresh = () => load();
		window.addEventListener('refresh-history', refresh as any);
		return () => {
			cancelled = true;
			window.removeEventListener('refresh-history', refresh as any);
		};
	}, []);

	useEffect(() => {
		const handler = (e: CustomEvent<string>) => setSelectedId(e.detail);
		window.addEventListener('select-session' as any, handler as any);
		return () => window.removeEventListener('select-session' as any, handler as any);
	}, []);

	useEffect(() => {
		const handler = (e: CustomEvent<string>) => setQuery(e.detail || '');
		window.addEventListener('search-query' as any, handler as any);
		return () => window.removeEventListener('search-query' as any, handler as any);
	}, []);

	const filtered = sessions.filter(s => {
		const q = query.toLowerCase();
		return (
			(s.patientName || '').toLowerCase().includes(q) ||
			(s.title || '').toLowerCase().includes(q)
		);
	});

	if (filtered.length === 0) {
		return <div className="p-4 text-gray-500 text-sm">No chat history found.</div>;
	}

	return (
		<ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
			{filtered.map((s) => (
				<li
					key={s.sessionId}
					onClick={() => {
						setSelectedId(s.sessionId);
						window.dispatchEvent(new CustomEvent('open-session', { detail: s.sessionId }));
					}}
					className={`p-3 hover:bg-gray-50 cursor-pointer ${selectedId === s.sessionId ? 'bg-gray-50' : ''}`}
				>
					<div className="flex items-center gap-3">
						<ProfileImage imageUrl={s.patientImageUrl} size="sm" alt={s.patientName} />
						<div className="min-w-0">
							<p className="text-sm font-medium text-gray-800 truncate">{s.title || 'Consultation chat'}</p>
							<p className="text-xs text-gray-500 truncate">{s.patientName}</p>
						</div>
						<div className="ml-auto text-[11px] text-gray-400">{s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : ''}</div>
					</div>
				</li>
			))}
		</ul>
	);
};

const SearchBox: React.FC = () => {
	const [value, setValue] = useState('');
	return (
		<input
			value={value}
			onChange={(e) => {
				setValue(e.target.value);
				window.dispatchEvent(new CustomEvent('search-query', { detail: e.target.value }));
			}}
			placeholder="Search by patient or title"
			className="flex-1 bg-transparent outline-none text-sm"
		/>
	);
};

const DetailPanel: React.FC = () => {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Array<{ role: string; content: string; created_at: string }>>([]);
	const sessionTitle = useMemo(() => {
		return 'Consultation chat';
	}, [selectedId]);

	useEffect(() => {
		const handler = (e: CustomEvent<string>) => setSelectedId(e.detail);
		window.addEventListener('open-session' as any, handler as any);
		return () => window.removeEventListener('open-session' as any, handler as any);
	}, []);

	useEffect(() => {
		if (!selectedId) return;
		let cancelled = false;
		(async () => {
			const { data: msgs } = await supabase
				.from('chat_messages')
				.select('role, content, created_at')
				.eq('session_id', selectedId)
				.order('created_at', { ascending: true });
			if (!cancelled) setMessages(msgs || []);
		})();
		return () => { cancelled = true; };
	}, [selectedId]);

	return (
		<div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col">
			<div className="px-4 py-3 border-b border-gray-100">
				<h3 className="text-gray-800 font-semibold">{sessionTitle}</h3>
			</div>
			<div className="flex-1 p-4 space-y-3 bg-gray-50 overflow-y-auto">
				{(messages || []).map((m, idx) => (
					<div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
						<div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
							{m.role === 'assistant' ? (
								<RichText text={m.content} />
							) : (
								<span className="whitespace-pre-wrap">{m.content}</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};