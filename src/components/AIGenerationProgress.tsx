import React from 'react';
import { Loader } from 'lucide-react';

type ProgressEvent = {
  stage: 'files' | 'summary';
  step_index: number;
  step_key: string;
  status: 'started' | 'completed' | 'error';
  message?: string;
  progress_percent: number;
  created_at: string;
};

export default function AIGenerationProgress({
  percent,
  events,
  overrideMessage
}: { percent: number; events: ProgressEvent[]; overrideMessage?: string }) {
  const stepLabels: Record<string, string> = {
    init: 'Initializing workflow',
    collect_files: 'Collecting files',
    extract: 'Extracting medical content',
    persist: 'Saving results',
    trigger_summary: 'Triggering AI analysis',
    collect_data: 'Collecting patient data',
    synthesize_documents: 'Synthesizing documents',
    build_prompt: 'Building instructions',
    reasoning: 'Reasoning initiated',
    reasoning_start: 'AI analysis started',
    reasoning_complete: 'AI reasoning completed',
    publish: 'Publishing clinical summary'
  };

  const latest = events[events.length - 1] as ProgressEvent | undefined;
  const fallback = 'Preparing analysis...';
  const computed = latest?.message || (latest?.step_key ? stepLabels[latest.step_key] : fallback);
  const currentText = overrideMessage || computed;
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="space-y-3">
      <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full progress-gradient with-shimmer transition-[width] duration-500 ease-out"
          style={{ width: `${safePercent}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        {safePercent < 100 ? (
          <Loader className="h-4 w-4 text-blue-400 animate-spin" />
        ) : (
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
        )}
        <div className="text-sm shimmer-text">
          {currentText || (safePercent >= 100 ? 'Finalizing...' : 'Working...')}
        </div>
      </div>
    </div>
  );
}


