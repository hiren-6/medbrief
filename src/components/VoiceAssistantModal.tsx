import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientFirstName: string;
  onComplete: (answers: {
    concern: string;
    symptomDuration: string;
    chronicIllness: string;
    medications: string;
    additionalNotes: string;
  }) => void;
}

type RecorderState = 'idle' | 'playing' | 'recording' | 'processing' | 'completed' | 'error' | 'cancelled';

const TTS_VOICE_PROMPT_SUFFIX = '';

const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, patientFirstName, onComplete }) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const bargeInRequestedRef = useRef<boolean>(false);
  const abortSessionRef = useRef<boolean>(false);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
  const baseUrl = `${supabaseUrl}/functions/v1/appointment_audio_assist`;

  // Enhanced voice visualization: large animated orb + taller bars
  const VoiceBars = () => (
    <div className="flex flex-col items-center">
      <div className={`relative w-48 h-48 mb-6`}>
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-blue-100 via-cyan-100 to-teal-200`}></div>
        <div className={`absolute inset-0 rounded-full animate-[pulse_2s_ease-in-out_infinite] bg-gradient-to-tr from-blue-200/60 to-teal-200/40`}></div>
        <div className={`absolute inset-2 rounded-full ring-2 ring-white/50`}></div>
        <div className={`absolute inset-0 rounded-full`} style={{
          boxShadow: state === 'recording' ? '0 0 60px 8px rgba(20,160,140,0.35)' : state === 'playing' ? '0 0 40px 6px rgba(37,99,235,0.25)' : '0 0 24px 4px rgba(148,163,184,0.20)'
        }}></div>
      </div>
      <div className="flex items-end space-x-2 h-16">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`w-1.5 rounded bg-gradient-to-b from-blue-500 to-teal-500 ${state === 'playing' || state === 'recording' ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}
            style={{ height: state === 'recording' ? `${12 + (i % 4) * 10}px` : state === 'playing' ? `${14 + (i % 7) * 8}px` : '8px' }}
          />
        ))}
      </div>
    </div>
  );

  useEffect(() => {
    let mounted = true;
    const ensureAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const token = data?.session?.access_token || '';
        setAuthToken(token);
      } catch {
        setAuthToken('');
      }
    };
    ensureAuth();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setState('idle');
    setError('');
    abortSessionRef.current = false;
    // Start session on open
    startSession().catch(err => {
      setError(err?.message || 'Unexpected error');
      setState('error');
    });
    // Cleanup on close
    return () => {
      abortSessionRef.current = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopAll = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    gainNodeRef.current = null;
    sourceNodeRef.current = null;
  };

  async function speak(text: string) {
    setState('playing');
    bargeInRequestedRef.current = false;
    try { if (audioContextRef.current && audioContextRef.current.state === 'suspended') { await audioContextRef.current.resume(); } } catch {}
    const res = await fetch(`${baseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ text, voice: 'verse', format: 'mp3' })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TTS failed: ${res.status} ${res.statusText} ${errText}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (!audioRef.current) audioRef.current = new Audio();
    return await new Promise<void>((resolve, reject) => {
      if (!audioRef.current) return reject(new Error('Audio element missing'));
      const el = audioRef.current;
      const cleanup = () => {
        el.onended = null;
        el.onerror = null;
        el.onpause = null;
        el.onplaying = null;
      };
      // Mic-based barge-in monitor
      let rafId = 0;
      let speechStartMs = 0;
      const analyser = analyserRef.current;
      const bufferLength = analyser ? analyser.fftSize : 0;
      const dataArray = analyser ? new Uint8Array(bufferLength) : null;
      const speechThreshold = 0.04; // RMS threshold to consider voice present
      const speechHoldMs = 150; // require ~150ms of speech before barge-in
      const monitor = () => {
        if (!analyser || el.paused) return;
        analyser.getByteTimeDomainData(dataArray as Uint8Array);
        let sumSquares = 0;
        for (let i = 0; i < (dataArray as Uint8Array).length; i++) {
          const v = ((dataArray as Uint8Array)[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / (dataArray as Uint8Array).length);
        const now = performance.now();
        if (rms > speechThreshold) {
          if (speechStartMs === 0) speechStartMs = now;
          if (now - speechStartMs >= speechHoldMs) {
            bargeInRequestedRef.current = true;
            try { el.pause(); } catch {}
            return;
          }
        } else {
          speechStartMs = 0;
        }
        rafId = requestAnimationFrame(monitor);
      };
      el.onended = () => {
        URL.revokeObjectURL(url);
        cleanup();
        if (rafId) cancelAnimationFrame(rafId);
        resolve();
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        cleanup();
        if (rafId) cancelAnimationFrame(rafId);
        reject(new Error('Audio playback error'));
      };
      el.onpause = () => {
        // If barge-in requested, resolve quickly so we can move on to recording
        if (bargeInRequestedRef.current) {
          try { URL.revokeObjectURL(url); } catch {}
          cleanup();
          if (rafId) cancelAnimationFrame(rafId);
          resolve();
        }
      };
      el.onplaying = () => {
        speechStartMs = 0;
        if (analyser) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(monitor);
        }
      };
      el.src = url;
      el.play().catch(reject);
    });
  }

  async function ensureMic(): Promise<MediaStream> {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      } as any);
      mediaStreamRef.current = stream;
      // Setup Web Audio graph for level monitoring
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gainNodeRef.current = gain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.08;
      analyserRef.current = analyser;
      source.connect(gain).connect(analyser);
      return stream;
    } catch (err: any) {
      throw new Error('Microphone access denied. Please allow mic permission.');
    }
  }

  async function recordOnce(maxDurationMs = 12000): Promise<Blob> {
    const stream = await ensureMic();
    setState('recording');
    recordedChunksRef.current = [];
    return await new Promise<Blob>((resolve, reject) => {
      try {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        const rec = new MediaRecorder(stream, { mimeType: mime });
        mediaRecorderRef.current = rec;
        const timeout = setTimeout(() => {
          try { rec.stop(); } catch {}
        }, maxDurationMs);

        // End-of-speech detection: stop after ~2s of near-silence
        const analyser = analyserRef.current;
        const silenceThreshold = 0.015; // RMS threshold (empirical)
        const silenceMsRequired = 2000;
        let silenceStart = 0;
        let rafId = 0;
        const bufferLength = analyser ? analyser.fftSize : 0;
        const dataArray = analyser ? new Uint8Array(bufferLength) : null;
        const checkSilence = (ts: number) => {
          if (!analyser || rec.state !== 'recording') return;
          analyser.getByteTimeDomainData(dataArray as Uint8Array);
          // Compute RMS
          let sumSquares = 0;
          for (let i = 0; i < (dataArray as Uint8Array).length; i++) {
            const v = ((dataArray as Uint8Array)[i] - 128) / 128;
            sumSquares += v * v;
          }
          const rms = Math.sqrt(sumSquares / (dataArray as Uint8Array).length);
          const isSilent = rms < silenceThreshold;
          const now = performance.now();
          if (isSilent) {
            if (silenceStart === 0) silenceStart = now;
            if (now - silenceStart >= silenceMsRequired) {
              try { rec.stop(); } catch {}
              return;
            }
          } else {
            silenceStart = 0;
          }
          rafId = requestAnimationFrame(checkSilence);
        };

        if (analyser) {
          rafId = requestAnimationFrame(checkSilence);
        }
        rec.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          clearTimeout(timeout);
          if (rafId) cancelAnimationFrame(rafId);
          const blob = new Blob(recordedChunksRef.current, { type: mime });
          resolve(blob);
        };
        rec.onerror = (ev) => {
          clearTimeout(timeout);
          if (rafId) cancelAnimationFrame(rafId);
          reject(new Error('Recording error'));
        };
        rec.start();
      } catch (err) {
        reject(err as any);
      }
    });
  }

  async function transcribe(blob: Blob): Promise<string> {
    setState('processing');
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    const res = await fetch(`${baseUrl}/stt`, {
      method: 'POST',
      headers: {
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: form
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`STT failed: ${res.status} ${res.statusText} ${errText}`);
    }
    const data = await res.json();
    return String(data?.transcript || '').trim();
  }

  async function askAndCapture(prompt: string, retryPrompt?: string): Promise<string> {
    if (abortSessionRef.current) return '';
    await speak(prompt + TTS_VOICE_PROMPT_SUFFIX);
    if (abortSessionRef.current) return '';
    // Minimal delay before recording to avoid clipping the user's first word
    await new Promise(r => setTimeout(r, 150));
    const blob = await recordOnce();
    if (abortSessionRef.current) return '';
    try {
      const text = await transcribe(blob);
      if (text) return text;
    } catch {}
    if (retryPrompt) {
      try {
        await speak(retryPrompt);
      } catch {}
      await new Promise(r => setTimeout(r, 150));
      const retryBlob = await recordOnce(10000);
      try {
        const text2 = await transcribe(retryBlob);
        return text2;
      } catch {
        return '';
      }
    }
    return '';
  }

  async function startSession() {
    try {
      // Pre-check microphone to surface permission UI early
      await ensureMic();
      const name = (patientFirstName || 'there').split(' ')[0];
      const greeting = `Hey ${name}! I'm here to help you complete your medical form before your appointment. This information will help your doctor give you the best possible care. Let me ask you a few important questions.`;
      const q1 = `What is your main health concern for today's visit?`;
      const q2 = `When did these symptoms first start?`;
      const q3 = `Are you having any chronic illness?`;
      const q4 = `Are you currently taking any medications?`;
      const q5 = `Is there anything else you'd like your doctor should know before your appointment?`;

      await speak(greeting);

      const a1 = await askAndCapture(q1, `I didn't catch that. Please briefly say your main health concern.`);
      const a2 = await askAndCapture(q2, `Please repeat when the symptoms started.`);
      const a3 = await askAndCapture(q3, `Please repeat any chronic illnesses, or say none.`);
      const a4 = await askAndCapture(q4, `Please list your medications, or say none.`);
      const a5 = await askAndCapture(q5, `Share any final important detail for your doctor, or say no.`);

      // Start closing TTS while we transition out quickly
      const closing = `Thanks ${name}, I've captured your answers. Please review them before submitting.`;
      try { await speak(closing); } catch {}

      setState('completed');
      stopAll();
      onComplete({
        concern: a1 || '',
        symptomDuration: a2 || '',
        chronicIllness: a3 || '',
        medications: a4 || '',
        additionalNotes: a5 || ''
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setState('error');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => { abortSessionRef.current = true; stopAll(); onClose(); }} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Jerry</span>
            <span className="text-sm text-gray-500">— the Voice Assistant</span>
          </div>
          <button
            aria-label="Close"
            onClick={() => { abortSessionRef.current = true; stopAll(); setState('cancelled'); onClose(); }}
            className="p-2 rounded hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="flex flex-col items-center text-center py-6">
          <VoiceBars />
          {error ? (
            <div className="mt-4 text-red-600 text-sm">{error}</div>
          ) : (
            <div className="mt-4 text-gray-500 text-sm">
              Your voice is not stored. Jerry will fill your form and close.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantModal;


