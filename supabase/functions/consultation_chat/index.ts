// Types: declare Deno for linter while running in Supabase Edge
// deno-lint-ignore no-var
declare const Deno: any;

// @ts-ignore - Remote Deno import is resolved at runtime in Supabase Edge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Model config
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// CORS
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  const baseHeaders = { 'Content-Type': 'application/json', ...corsHeaders } as Record<string, string>;
  const merged = { status: 200, headers: baseHeaders, ...(init || {}) } as ResponseInit;
  if (merged.headers) {
    merged.headers = { ...baseHeaders, ...(merged.headers as Record<string, string>) } as any;
  }
  return new Response(JSON.stringify(body), merged);
}

// Helper: create authed client using the caller's JWT for RLS
function createAuthedClient(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
}

interface AskPayload {
  mode?: 'ask' | 'webhook';
  consultation_id?: string;
  session_id?: string;
  question?: string;
  message_id?: string; // for webhook mode
}

type ChatRole = 'user' | 'assistant' | 'system';

async function fetchConsultationContext(supabase: any, consultationId: string) {
  const [{ data: consultation, error: cErr }, { data: summary }, { data: files }] = await Promise.all([
    supabase
      .from('consultations')
      .select('id, doctor_id, patient_id, form_data')
      .eq('id', consultationId)
      .single(),
    supabase
      .from('clinical_summaries')
      .select('summary_json')
      .eq('consultation_id', consultationId)
      .maybeSingle(),
    supabase
      .from('patient_files')
      .select('id, file_name, file_type, file_category, ai_summary, parsed_text')
      .eq('consultation_id', consultationId)
  ]);

  if (cErr) throw new Error(`Failed to fetch consultation: ${cErr.message}`);
  if (!consultation) throw new Error('Consultation not found');

  return { consultation, summary: summary || null, files: files || [] };
}

function buildPrompt(params: { consultation: any; summary: any; files: any[]; lastFive: Array<{ role: ChatRole; content: string }>; question: string; }) {
  const { consultation, summary, files, lastFive, question } = params;

  const system = `You are a clinical-grade AI assistant helping a doctor during a consultation. Be concise, clinically safe, and evidence-informed. Do not diagnose beyond provided data. If uncertain, say so. Prefer structured bullet points. Do not expose PHI in logs.`;

  const formData = consultation?.form_data || {};
  const summaryJson = summary?.summary_json || {};

  const filesSnippet = (files || [])
    .slice(0, 10)
    .map((f: any) => `- ${f.file_name} (${f.file_type}, ${f.file_category})${f.ai_summary ? `\n  ai_summary: ${String(f.ai_summary).slice(0, 400)}` : ''}${f.parsed_text ? `\n  parsed_excerpt: ${String(f.parsed_text).slice(0, 400)}` : ''}`)
    .join('\n');

  const context = `Consultation Context\n- consultation_id: ${consultation?.id}\n- patient_id: ${consultation?.patient_id}\n- doctor_id: ${consultation?.doctor_id}\n\nForm Data (excerpt):\n${JSON.stringify(formData, null, 2).slice(0, 1800)}\n\nClinical Summary (excerpt):\n${JSON.stringify(summaryJson, null, 2).slice(0, 1800)}\n\nFiles (up to 10, with excerpts):\n${filesSnippet}`;

  const historyText = lastFive
    .map(m => `${m.role === 'assistant' ? 'Assistant' : 'Doctor'}: ${m.content}`)
    .join('\n');

  const userText = `Doctor question: ${question}`;

  const fullText = `${system}\n\n${context}\n\nRecent Chat (last 5 exchanges max):\n${historyText || '(none)'}\n\n${userText}\n\nRespond clearly with focused, clinically relevant guidance.`;

  return fullText;
}

async function callGemini(prompt: string) {
  const body = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  } as any;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${res.status} ${res.statusText} - ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response at this time.';
  return text as string;
}

async function ensureSuggestions(supabase: any, sessionId: string, consultation: any, summary: any) {
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, suggested_questions')
    .eq('id', sessionId)
    .single();
  if (Array.isArray(session?.suggested_questions) && session.suggested_questions.length >= 2) return;

  const base = `Given the consultation data below, propose two short, common questions a doctor might ask to progress care. Keep under 120 characters each. Return as a bullet list, two lines.\n\nForm Data: ${JSON.stringify(consultation?.form_data || {})}\n\nClinical Summary: ${JSON.stringify(summary?.summary_json || {})}`;
  try {
    const text = await callGemini(base);
    const lines = String(text).split(/\n+/).map((l: string) => l.replace(/^[-*\s]+/, '').trim()).filter(Boolean).slice(0, 2);
    if (lines.length === 0) return;
    await supabase
      .from('chat_sessions')
      .update({ suggested_questions: lines })
      .eq('id', sessionId);
  } catch {}
}

async function handleAsk(req: Request) {
  const authed = createAuthedClient(req);

  let payload: AskPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, { status: 400 });
  }

  const consultationId = payload.consultation_id;
  const question = (payload.question || '').trim();
  if (!consultationId || !question) {
    return jsonResponse({ error: 'consultation_id and question are required' }, { status: 400 });
  }

  const { data: session, error: sessErr } = await authed
    .rpc('get_or_create_chat_session', { p_consultation_id: consultationId });
  if (sessErr || !session) {
    return jsonResponse({ error: `Failed to get/create session: ${sessErr?.message || 'unknown'}` }, { status: 403 });
  }

  const { error: insErr } = await authed
    .from('chat_messages')
    .insert({ session_id: session.id, role: 'user', content: question });
  if (insErr) {
    return jsonResponse({ error: `Failed to insert message: ${insErr.message}` }, { status: 400 });
  }

  const { data: msgs, error: mErr } = await authed
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(20);
  if (mErr) {
    return jsonResponse({ error: `Failed to fetch messages: ${mErr.message}` }, { status: 400 });
  }
  const lastFive = (msgs || [])
    .map((m: any) => ({ role: m.role as ChatRole, content: String(m.content || '') }))
    .slice(-5);

  let context;
  try {
    context = await fetchConsultationContext(authed, consultationId);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Failed to fetch context' }, { status: 400 });
  }

  const prompt = buildPrompt({ consultation: context.consultation, summary: context.summary, files: context.files, lastFive, question });

  let answer = '';
  try {
    answer = await callGemini(prompt);
  } catch (err: any) {
    const fallback = 'Sorry, I could not generate an answer right now. Please try again in a moment.';
    await authed
      .from('chat_messages')
      .insert({ session_id: session.id, role: 'assistant', content: fallback, error: { message: String(err?.message || 'unknown') } });
    return jsonResponse({ session_id: session.id, answer: fallback }, { status: 200 });
  }

  await authed
    .from('chat_messages')
    .insert({ session_id: session.id, role: 'assistant', content: answer, model: GEMINI_MODEL });

  ensureSuggestions(authed, session.id, context.consultation, context.summary).catch(() => {});

  return jsonResponse({ session_id: session.id, answer }, { status: 200 });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
  return await handleAsk(req);
});


