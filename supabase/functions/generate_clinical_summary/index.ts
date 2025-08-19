// Types: declare Deno for linter while running in Supabase Edge
// Types: declare Deno for linter while running in Supabase Edge
// deno-lint-ignore no-var
declare const Deno: any;
// @ts-ignore - Remote Deno import is resolved at runtime in Supabase Edge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Progress tracking helper with canonical status mapping and safety checks
async function emitProgress(params) {
  try {
    // Canonicalize status: only emit values known to pass CHECK based on files function
    const inputStatus = String(params?.status || '').toLowerCase();
    const status = inputStatus === 'error' || inputStatus === 'failed' ? 'error' : 'completed';
    // Clamp progress and ensure 0..100
    let progress = Number(params?.progress ?? 0);
    if (!Number.isFinite(progress)) progress = 0;
    progress = Math.max(0, Math.min(100, Math.round(progress)));
    const { error } = await supabase.from('ai_progress_events').insert({
      appointment_id: params.appointmentId,
      stage: params.stage,
      step_index: params.stepIndex,
      step_key: params.stepKey,
      status,
      message: params.message,
      progress_percent: progress,
      meta: params.meta ?? null
    });
    if (error) {
      console.warn(`emitProgress failed to insert: ${error.message}. This will not halt execution.`);
    } else {
      console.log(`📊 Progress: ${params.stage} step ${params.stepIndex} ${status} - ${progress}%`);
    }
  } catch (err) {
    console.warn(`emitProgress encountered an unexpected error: ${err.message}. This will not halt execution.`);
  }
}
// Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
// Enhanced prompt templates for medical AI
const SYSTEM_PROMPT = `You are a clinical-grade medical summarizer with expertise in analyzing patient data and creating comprehensive clinical summaries. You must provide accurate, structured medical assessments based on the provided patient information, symptoms, and parsed texts from documents. Always maintain medical confidentiality and provide evidence-based recommendations.`;
const DEVELOPER_PROMPT = `Analyze the provided patient data including medical history, current symptoms, and parsed text from documents to create a structured clinical summary. Focus on identifying key clinical findings, potential differential diagnoses, and appropriate diagnostic recommendations.`;
const FEW_SHOT_PROMPT = `Here is an example of a high-quality clinical summary in the exact JSON format you must return:

{
  "short_clinical_synopsis": "65-year-old male with a history of hypertension and hypercholesterolemia, presenting with new onset dyspnea on exertion and fatigue. Relevant labs indicate possible anemia and elevated blood sugar. No current treatment for hypercholesterolemia or elevated blood sugar.",
  "urgency": "urgent",
  "chief_complaint": "New onset dyspnea on exertion and fatigue",
  "past_medical_events": [
    {
      "date": "2015",
      "event": "Diagnosed with Hypertension"
    },
    {
      "date": "2018",
      "event": "Diagnosed with Hypercholesterolemia"
    }
  ],
  "past_investigations": [
    {
      "test": "Total Cholesterol",
      "result": "260 mg/dL",
      "reference_range": "< 200 mg/dL",
      "date": "Jan 2024"
    },
    {
      "test": "Hemoglobin (Hb)",
      "result": "10.5 g/dL",
      "reference_range": "13.0–17.0 g/dL",
      "date": "Jan 2024"
    }
  ],
  "current_symptoms": [
    "Breathlessness while walking short distances (100–200 meters)",
    "Fatigue noted over the past few weeks"
  ],
  "medications": {
    "active": [
      "Amlodipine 5mg OD (for Hypertension)"
    ],
    "past": [
      "None reported"
    ]
  },
  "potential_conflicts_gaps": [
    "No current treatment for hypercholesterolemia",
    "No treatment for newly elevated blood glucose"
  ],
  "ai_insights_and_suggestions": {
    "urgency_flags": [
      "Moderate exertional dyspnea in a hypertensive male"
    ],
    "relevance_to_cardiology": [
      "Breathlessness may be due to: Cardiac ischemia (given age + risk profile)"
    ],
    "next_steps": {
      "tests_to_consider": [
        "ECG and 2D Echocardiography",
        "Repeat CBC, Lipid Profile, HbA1c"
      ],
      "medications_to_review_start": [
        "Statin therapy initiation"
      ],
      "referrals_to_consider": [
        "Endocrinologist (for possible early diabetes)"
      ]
    }
  }
}`;
const AUTO_REPAIR_PROMPT = `IMPORTANT: You must return ONLY valid JSON matching the exact schema provided. If your response is not in the correct JSON format, fix it immediately. The response must be parseable JSON with the exact field names specified.`;
Deno.serve(async (req)=>{
  let appointmentId = null;
  let consultationId = null;
  let patientId = null;
  let summaryId = null;
  try {
    const requestPayload = await req.json();
    if (requestPayload.appointment_id && requestPayload.triggered_by) {
      appointmentId = requestPayload.appointment_id;
      const { data: appointment, error: appointmentError } = await supabase.from('appointments').select('*').eq('id', appointmentId).single();
      if (appointmentError || !appointment) {
        throw new Error(`Failed to fetch appointment: ${appointmentError?.message}`);
      }
      consultationId = appointment.consultation_id;
      patientId = appointment.patient_id;
    } else {
      const { record } = requestPayload;
      if (!record || (record?.table || requestPayload.table) !== 'appointments') {
        return new Response(JSON.stringify({
          message: 'Ignored: Not an appointment record.'
        }), {
          status: 200
        });
      }
      appointmentId = record.id;
      consultationId = record.consultation_id;
      patientId = record.patient_id;
    }
    if (!consultationId || !patientId || !appointmentId) {
      throw new Error('Missing required appointment, consultation, or patient ID.');
    }
    console.log(`Processing summary for appointment: ${appointmentId}`);
    // Stage initialized at 50% (files covered the first half)
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 0,
      stepKey: 'init',
      status: 'completed',
      message: 'Clinical summary started',
      progress: 50
    });
    // Step 1: Collect all clinical data
    const clinicalData = await collectClinicalData(consultationId, patientId);
    if (!clinicalData) throw new Error('Failed to collect clinical data');
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 1,
      stepKey: 'collect_data',
      status: 'completed',
      message: 'Patient data collected successfully',
      progress: 60
    });
    // Step 2: Get extracted text from patient files
    const extractedFilesData = await getExtractedFilesData(consultationId);
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 2,
      stepKey: 'synthesize_documents',
      status: 'completed',
      message: `Synthesized ${extractedFilesData.length} document(s)`,
      progress: 70
    });
    // Step 3: Get additional patient data
    const additionalPatientData = await getAdditionalPatientData(patientId);
    // Data sufficiency validation
    const hasFiles = extractedFilesData?.length > 0;
    const hasPatientInput = clinicalData.form_data && Object.keys(clinicalData.form_data).length > 0;
    const hasVoiceData = clinicalData.voice_data && Object.keys(clinicalData.voice_data).length > 0;
    if (!hasFiles && !hasPatientInput && !hasVoiceData) {
      await updateAppointmentStatus(appointmentId, 'failed', 'Insufficient data for clinical summary generation');
      throw new Error('Insufficient data for clinical summary generation');
    }
    // Step 4: Build the prompt for Gemini
    const prompt = await buildClinicalPrompt(clinicalData, extractedFilesData, additionalPatientData);
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 3,
      stepKey: 'build_prompt',
      status: 'completed',
      message: 'AI instructions built successfully',
      progress: 80
    });
    // Step 5: Call Gemini API (announce analysis started)
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 4,
      stepKey: 'reasoning_start',
      status: 'completed',
      message: 'AI analysis started',
      progress: 85
    });
    const aiResponse = await callGeminiAPI(prompt);
    // Step 5.5: Store the raw AI response BEFORE validation
    summaryId = await storeRawAIOutput(consultationId, patientId, aiResponse);
    if (!summaryId) {
      throw new Error('Failed to create an entry for the raw AI response.');
    }
    console.log(`Raw AI response stored successfully with summary ID: ${summaryId}`);
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 4,
      stepKey: 'reasoning_complete',
      status: 'completed',
      message: 'AI reasoning completed successfully',
      progress: 90
    });
    // Step 6: Validate and update the record with the parsed response
    console.log('Step 6: Validating and storing parsed response...');
    const validatedSummary = validateAndParseResponse(aiResponse);
    await updateParsedSummary(summaryId, validatedSummary);
    // Step 7: Update appointment status
    await updateAppointmentStatus(appointmentId, 'completed', undefined);
    console.log('Clinical summary generation completed successfully');
    await emitProgress({
      appointmentId,
      stage: 'summary',
      stepIndex: 5,
      stepKey: 'publish',
      status: 'completed',
      message: 'Clinical summary published successfully',
      progress: 100
    });
    return new Response(JSON.stringify({
      success: true,
      message: 'Clinical summary generated successfully',
      consultation_id: consultationId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in clinical summary generation:', {
      message: error.message,
      stack: error.stack,
      appointmentId,
      consultationId,
      patientId
    });
    if (appointmentId) {
      await emitProgress({
        appointmentId,
        stage: 'summary',
        stepIndex: 4,
        stepKey: 'reasoning',
        status: 'error',
        message: `AI analysis failed: ${error.message || 'Unknown error'}`,
        progress: 90
      });
      await updateAppointmentStatus(appointmentId, 'failed', error.message);
    }
    if (summaryId) {
      await supabase.from('clinical_summaries').update({
        processing_status: 'failed'
      }).eq('id', summaryId);
    }
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: {
        appointmentId,
        consultationId,
        patientId
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
async function collectClinicalData(consultationId: string, _patientId?: string) {
  // Added optional second parameter in callers; keep signature flexible
  try {
    console.log(`Collecting clinical data for consultation: ${consultationId}`);
    // 1. Attempt to fetch from the materialized view without .single()
    const { data: viewData, error: viewError } = await supabase.from('ai_clinical_data').select('*').eq('consultation_id', consultationId);
    if (viewError) {
      console.warn(`Error querying ai_clinical_data view: ${viewError.message}`);
    // Fall through to direct queries
    }
    if (viewData && viewData.length > 0) {
      if (viewData.length > 1) {
        console.warn(`Warning: Found multiple rows in ai_clinical_data for consultation ${consultationId}. Using the first one.`);
      }
      console.log('Successfully fetched data from ai_clinical_data view.');
      return viewData[0];
    }
    // 2. Fallback to direct queries if view returns no data
    console.log('Could not fetch from ai_clinical_data view, falling back to direct queries.');
    const { data: consultationData, error: consultationError } = await supabase.from('consultations').select('id, patient_id, doctor_id, form_data, voice_data').eq('id', consultationId).single();
    if (consultationError) {
      throw new Error(`Fallback failed: Could not fetch consultation data: ${consultationError.message}`);
    }
    // You might want to fetch patient profile data here as well if the view normally provides it
    console.log('Successfully fetched data via direct queries.');
    return {
      consultation_id: consultationId,
      patient_id: consultationData.patient_id,
      doctor_id: consultationData.doctor_id,
      form_data: consultationData.form_data,
      voice_data: consultationData.voice_data
    };
  } catch (error) {
    console.error(`Critical error in collectClinicalData: ${error.message}`);
    return null;
  }
}
async function getExtractedFilesData(consultationId) {
  const { data, error } = await supabase.from('patient_files').select('file_name, file_type, parsed_text').eq('consultation_id', consultationId).eq('processed', true).not('parsed_text', 'is', null);
  if (error) {
    console.error('Error fetching extracted files data:', error);
    return [];
  }
  return data || [];
}
async function getAdditionalPatientData(patientId) {
  if (!patientId) return null;
  const { data, error } = await supabase.from('profiles').select('gender, date_of_birth, family_history, smoking_status, tobacco_use, allergies, alcohol_consumption, exercise_frequency, bmi').eq('id', patientId).single();
  if (error) {
    console.error(`Error fetching additional patient data for ${patientId}:`, error);
    return null;
  }
  let age = 0;
  if (data?.date_of_birth) {
    const birthDate = new Date(data.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || m === 0 && today.getDate() < birthDate.getDate()) {
      age--;
    }
  }
  return {
    ...data,
    age
  };
}
async function getDoctorSpecialityById(doctorId) {
  if (!doctorId) return null;
  const { data, error } = await supabase.from('profiles').select('doctor_speciality').eq('id', doctorId).single();
  if (error) {
    console.warn('Error fetching doctor speciality:', error.message);
    return null;
  }
  return data?.doctor_speciality || null;
}
function toSpecialitySlug(name) {
  if (!name || typeof name !== 'string') return 'general_medicine';
  return name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').trim();
}
function truncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 20) + '... [truncated]';
}
async function buildClinicalPrompt(clinicalData, extractedFilesData, additionalPatientData) {
  const chiefComplaint = clinicalData.form_data?.concern || 'Not specified';
  const MAX_DOC_CHARS = 4000;
  let documentContext = extractedFilesData.length > 0
    ? '\n\nUPLOADED MEDICAL DOCUMENTS:\n' + extractedFilesData.map((file, i)=>`--- Document ${i + 1}: ${file.file_name} (${file.file_type}) ---\nEXTRACTED CONTENT:\n${truncate(file.parsed_text || '[No text extracted]', MAX_DOC_CHARS)}\n`).join('\n')
    : '\n\nUPLOADED MEDICAL DOCUMENTS:\nNo documents available.\n';
  const doctorSpeciality = await getDoctorSpecialityById(clinicalData?.doctor_id);
  const specialitySlug = toSpecialitySlug(doctorSpeciality || 'general_medicine');
  const specialityTitle = doctorSpeciality || 'General Medicine';
  return `
${SYSTEM_PROMPT}
${DEVELOPER_PROMPT}
${FEW_SHOT_PROMPT}

🚨 CRITICAL: CHIEF COMPLAINT PRIORITY 🚨
The patient's PRIMARY CHIEF COMPLAINT is: "${chiefComplaint}". This MUST be the focus.

PATIENT INFORMATION:
Age: ${additionalPatientData?.age || 'Not specified'} years
Gender: ${additionalPatientData?.gender || 'Not specified'}
Family History: ${additionalPatientData?.family_history || 'Not specified'}
Smoking Status: ${additionalPatientData?.smoking_status || 'Not specified'}
Allergies: ${additionalPatientData?.allergies || 'Not specified'}
Alcohol: ${additionalPatientData?.alcohol_consumption || 'Not specified'}
Tobacco Use: ${additionalPatientData?.tobacco_use || 'Not specified'}
Exercise Frequency: ${additionalPatientData?.exercise_frequency || 'Not specified'}
BMI: ${additionalPatientData?.bmi ?? 'Not specified'}

CURRENT SYMPTOMS & INPUT:
${truncate(JSON.stringify(clinicalData.form_data, null, 2), 8000)}

${documentContext}

${AUTO_REPAIR_PROMPT}

IMPORTANT INSTRUCTIONS:
1.  Focus analysis on the chief complaint: "${chiefComplaint}".
2.  The consulting doctor's speciality is "${specialityTitle}". The relevance field MUST be named "relevance_to_${specialitySlug}".
3.  Return ONLY valid JSON matching this exact schema (pay close attention to the object arrays for events and investigations):
{
  "short_clinical_synopsis": "string",
  "urgency": "routine" | "urgent" | "emergency",
  "chief_complaint": "string",
  "past_medical_events": [
    { "date": "string", "event": "string" }
  ],
  "past_investigations": [
    { "test": "string", "result": "string", "reference_range": "string", "date": "string" }
  ],
  "current_symptoms": ["string"],
  "medications": { "active": ["string"], "past": ["string"] },
  "potential_conflicts_gaps": ["string"],
  "ai_insights_and_suggestions": {
    "urgency_flags": ["string"],
    "relevance_to_${specialitySlug}": ["string"],
    "next_steps": {
      "tests_to_consider": ["string"],
      "medications_to_review_start": ["string"],
      "referrals_to_consider": ["string"]
    }
  }
}`;
}
async function callGeminiAPI(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const maxRetries = 3;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      });
      if (!response.ok) throw new Error(`API error: ${response.status} ${await response.text()}`);
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        throw new Error('Gemini response missing text content');
      }
      return text;
    } catch (error) {
      console.error(`Gemini attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      // Linear backoff for attempt 1->2, and a 60s pause before final attempt
      const delayMs = attempt === 2 ? 60_000 : 1000 * attempt;
      console.log(`Waiting ${delayMs}ms before next attempt...`);
      await new Promise((res)=>setTimeout(res, delayMs));
    }
  }
}
function extractLikelyJsonString(input) {
  if (!input) return input;
  const fenced = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const firstBrace = input.indexOf('{');
  if (firstBrace >= 0) {
    let depth = 0;
    for(let i = firstBrace; i < input.length; i++){
      const ch = input[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return input.slice(firstBrace, i + 1);
        }
      }
    }
  }
  return input.trim();
}
function validateAndParseResponse(aiResponse) {
  try {
    let summaryObject;
    let jsonString = aiResponse;
    let initialParse;
    try {
      initialParse = JSON.parse(jsonString);
    } catch (_e) {
      jsonString = extractLikelyJsonString(jsonString);
      initialParse = JSON.parse(jsonString);
    }
    // Check if the response is wrapped in a {"response": "..."} structure
    if (initialParse.response && typeof initialParse.response === 'string') {
      console.log("Detected a wrapped response. Parsing inner JSON.");
      const inner = extractLikelyJsonString(initialParse.response);
      summaryObject = JSON.parse(inner);
    } else {
      console.log("Detected a direct JSON response.");
      summaryObject = initialParse;
    }
    // --- Proceed with validation on the final summaryObject ---
    if (!summaryObject.short_clinical_synopsis || !summaryObject.chief_complaint) {
      throw new Error("Parsed JSON is missing required fields like 'short_clinical_synopsis' or 'chief_complaint'.");
    }
    // Sanitize and return the full object (add your detailed sanitization logic here)
    const sanitizedSummary = {
      short_clinical_synopsis: String(summaryObject.short_clinical_synopsis || ''),
      urgency: [
        'routine',
        'urgent',
        'emergency'
      ].includes(summaryObject.urgency) ? summaryObject.urgency : 'routine',
      chief_complaint: String(summaryObject.chief_complaint || ''),
      past_medical_events: Array.isArray(summaryObject.past_medical_events) ? summaryObject.past_medical_events.filter((e)=>e && typeof e === 'object').map((e)=>({
          date: String(e.date || ''),
          event: String(e.event || '')
        })) : [],
      past_investigations: Array.isArray(summaryObject.past_investigations) ? summaryObject.past_investigations.filter((e)=>e && typeof e === 'object').map((e)=>({
          test: String(e.test || ''),
          result: String(e.result || ''),
          reference_range: String(e.reference_range || ''),
          date: String(e.date || '')
        })) : [],
      current_symptoms: Array.isArray(summaryObject.current_symptoms) ? summaryObject.current_symptoms.map((s)=>String(s)) : [],
      medications: summaryObject.medications && typeof summaryObject.medications === 'object' ? {
        active: Array.isArray(summaryObject.medications.active) ? summaryObject.medications.active.map((s)=>String(s)) : [],
        past: Array.isArray(summaryObject.medications.past) ? summaryObject.medications.past.map((s)=>String(s)) : []
      } : {
        active: [],
        past: []
      },
      potential_conflicts_gaps: Array.isArray(summaryObject.potential_conflicts_gaps) ? summaryObject.potential_conflicts_gaps.map((s)=>String(s)) : [],
      ai_insights_and_suggestions: summaryObject.ai_insights_and_suggestions && typeof summaryObject.ai_insights_and_suggestions === 'object' ? {
        urgency_flags: Array.isArray(summaryObject.ai_insights_and_suggestions.urgency_flags) ? summaryObject.ai_insights_and_suggestions.urgency_flags.map((s)=>String(s)) : [],
        ...summaryObject.ai_insights_and_suggestions
      } : {}
    };
    return sanitizedSummary;
  } catch (error) {
    console.error('Error parsing AI response:', error.message);
    console.error('Raw response received:', aiResponse);
    throw new Error(`Failed to parse the AI-generated JSON summary. Reason: ${error.message}`);
  }
}
// Store the raw AI output and return the new row's ID
async function storeRawAIOutput(consultationId, patientId, rawOutput) {
  try {
    const { data, error } = await supabase.from('clinical_summaries').insert({
      consultation_id: consultationId,
      patient_id: patientId,
      raw_output: rawOutput,
      summary_json: {},
      processing_status: 'parsing'
    }).select('id').single();
    if (error) {
      console.error("Error in storeRawAIOutput:", error);
      throw error;
    }
    console.log('Raw AI output stored with ID:', data.id);
    return data.id;
  } catch (error) {
    // Log the detailed error but return null to be handled by the caller
    console.error('Caught exception in storeRawAIOutput:', error);
    return null;
  }
}
// Update the summary with the parsed JSON
async function updateParsedSummary(summaryId, summaryJson) {
  try {
    const { error } = await supabase.from('clinical_summaries').update({
      summary_json: summaryJson,
      processing_status: 'completed'
    }).eq('id', summaryId);
    if (error) throw error;
    console.log('Parsed clinical summary stored successfully for ID:', summaryId);
  } catch (error) {
    console.error('Error in updateParsedSummary:', error);
    throw error;
  }
}
// Update appointment status
async function updateAppointmentStatus(appointmentId: string, status: string, errorMessage?: string) {
  try {
    const updateData: Record<string, any> = {
      ai_processing_status: status
    };
    if (errorMessage) {
      updateData.error_message = errorMessage.substring(0, 500);
    }
    const { error } = await supabase.from('appointments').update(updateData).eq('id', appointmentId);
    if (error) console.error('Error updating appointment status:', error);
  } catch (error) {
    console.error('Error in updateAppointmentStatus:', error);
  }
}
