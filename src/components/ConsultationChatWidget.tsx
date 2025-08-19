import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, MoreHorizontal, Send, Bot, HeartPulse } from 'lucide-react';
import ProfileImage from './ProfileImage';
import RichText from './RichText';
import { supabase } from '../supabaseClient';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
	id: string;
	role: ChatRole;
	content: string;
	createdAt: string;
}

interface ConsultationChatWidgetProps {
	open: boolean;
	onClose: () => void;
	patientName: string;
	patientImageUrl?: string;
	sessionTitle?: string;
	consultationId: string;
	doctorId?: string;
	patientId?: string;
	suggestedQuestions?: string[];
}

const TYPING_PLACEHOLDER_ID = 'typing-indicator';

const ConsultationChatWidget: React.FC<ConsultationChatWidgetProps> = ({
	open,
	onClose,
	patientName,
	patientImageUrl,
	sessionTitle,
	consultationId,
	doctorId,
	patientId,
	suggestedQuestions
}) => {
	const [input, setInput] = useState('');
	const [sending, setSending] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
	const listRef = useRef<HTMLDivElement | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [serverSuggestions, setServerSuggestions] = useState<string[] | undefined>(suggestedQuestions);

	// Derived
	const lastFiveMessages = useMemo(() => messages.slice(-5), [messages]);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		(async () => {
			// Ensure session via RPC (RLS ensures doctor owns the consultation)
			const { data: session, error } = await supabase.rpc('get_or_create_chat_session', { p_consultation_id: consultationId });
			if (error || !session) {
				console.error('Failed to get/create chat session', error);
				return;
			}
			if (cancelled) return;
			setSessionId(session.id);
			// Load messages
			const { data: msgs } = await supabase
				.from('chat_messages')
				.select('id, role, content, created_at')
				.eq('session_id', session.id)
				.order('created_at', { ascending: true });
			if (cancelled) return;
			const mapped: ChatMessage[] = (msgs || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at }));
			setMessages(mapped);
			setShowSuggestions((mapped.length === 0));
			// Load suggestions from session
			const { data: sessRow } = await supabase.from('chat_sessions').select('suggested_questions').eq('id', session.id).single();
			if (!cancelled) setServerSuggestions(sessRow?.suggested_questions || suggestedQuestions);
		})();
		return () => { cancelled = true; };
	}, [open, consultationId]);

	// Auto-scroll on new messages
	useEffect(() => {
		if (!listRef.current) return;
		listRef.current.scrollTop = listRef.current.scrollHeight;
	}, [messages, open]);

	useEffect(() => {
		if (!listRef.current) return;
		listRef.current.scrollTop = listRef.current.scrollHeight;
	}, [messages, open]);

	const addTypingIndicator = () => {
		setMessages(prev => {
			if (prev.some(m => m.id === TYPING_PLACEHOLDER_ID)) return prev;
			return [...prev, { id: TYPING_PLACEHOLDER_ID, role: 'assistant', content: '...', createdAt: new Date().toISOString() }];
		});
	};

	const removeTypingIndicator = () => {
		setMessages(prev => prev.filter(m => m.id !== TYPING_PLACEHOLDER_ID));
	};

	const handleSend = async (text?: string) => {
		const content = (text ?? input).trim();
		if (!content || sending) return;
		setSending(true);
		setShowSuggestions(false);
		// Optimistic append
		setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() }]);
		setInput('');
		addTypingIndicator();

		try {
			// Call edge function; it will ensure session and insert assistant reply
			const { data, error } = await supabase.functions.invoke('consultation_chat', {
				body: { consultation_id: consultationId, question: content }
			});
			// Remove typing indicator before streaming
			removeTypingIndicator();
			if (error) {
				setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.', createdAt: new Date().toISOString() }]);
			} else {
				const sid = data?.session_id || sessionId;
				if (sid) setSessionId(sid);
				const finalText: string = String(data?.answer || '').trim();
				// If we have the final text, simulate a streaming effect
				if (finalText) {
					const streamId = crypto.randomUUID();
					setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: '', createdAt: new Date().toISOString() }]);
					await new Promise<void>((resolve) => {
						let index = 0;
						const step = 4; // characters per tick
						const interval = 20; // ms per tick
						const timer = setInterval(() => {
							index = Math.min(index + step, finalText.length);
							const next = finalText.slice(0, index);
							setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: next } : m));
							if (index >= finalText.length) {
								clearInterval(timer);
								resolve();
							}
						}, interval);
					});
				} else {
					// Fallback: sync from DB
					const { data: msgs } = await supabase
						.from('chat_messages')
						.select('id, role, content, created_at')
						.eq('session_id', sid || sessionId)
						.order('created_at', { ascending: true });
					const mapped: ChatMessage[] = (msgs || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at }));
					setMessages(mapped);
				}
			}
		} catch (e) {
			removeTypingIndicator();
			setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.', createdAt: new Date().toISOString() }]);
		} finally {
			setSending(false);
		}
	};

	const handleSuggestionClick = (q: string) => {
		handleSend(q);
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[80] flex items-end justify-end pointer-events-none">
			{/* Overlay area only captures close when clicking outside the panel */}
			<div className="absolute inset-0" onClick={onClose} />
			<div className="pointer-events-auto w-full sm:max-w-md m-4 rounded-2xl shadow-2xl bg-white border border-gray-200 overflow-hidden">
				{/* Header */}
				<div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
							<Bot className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-semibold">AI Assistant</p>
							<p className="text-xs opacity-90">{sessionTitle || 'Consultation chat'}</p>
						</div>
					</div>
					<button onClick={onClose} aria-label="Close chat" className="p-1 rounded-md hover:bg-white/10">
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Messages */}
				<div ref={listRef} className="max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gray-50">
					{messages.length === 0 && (
						<div className="text-xs text-gray-500">Start the conversation or pick a suggestion below. Only the last 5 messages are considered by AI.</div>
					)}
					{messages.map(m => (
						<div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
							<div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
								{m.content === '...' ? (
									<span className="inline-flex items-center gap-2 text-gray-500">
										<HeartPulse className="h-5 w-5 heartbeat-shimmer" />
									</span>
								) : (
									m.role === 'assistant' ? (
										<RichText text={m.content} />
									) : (
										<span className="whitespace-pre-wrap">{m.content}</span>
									)
								)}
							</div>
						</div>
					))}
				</div>

				{/* Suggestions */}
				{showSuggestions && ((serverSuggestions?.length || 0) > 0 || (suggestedQuestions?.length || 0) > 0) && (
					<div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 bg-white border-t border-gray-100">
						{(serverSuggestions && serverSuggestions.length > 0 ? serverSuggestions : (suggestedQuestions || [])).slice(0, 2).map((q, idx) => (
							<button key={idx} onClick={() => handleSuggestionClick(q)} className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50">
								{q}
							</button>
						))}
					</div>
				)}

				{/* Composer */}
				<div className="p-3 bg-white border-t border-gray-200">
					<div className="flex items-end gap-2">
						<textarea
							value={input}
							onChange={e => setInput(e.target.value)}
							rows={1}
							placeholder="Ask about this consultation..."
							className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
						/>
						<button
							onClick={() => handleSend()}
							disabled={sending || input.trim().length === 0}
							className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<Send className="h-4 w-4" />
							<span>Send</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConsultationChatWidget;


