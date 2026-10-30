import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { getRelevantContext, GURGAON_KNOWLEDGE_BASE } from './knowledge_engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

// Environment / Stored Keys for Free Cloud AIs
let GROQ_API_KEY = process.env.GROQ_API_KEY || '';
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Load saved config if exists
const configPath = path.join(__dirname, 'data', 'ai_config.json');
try {
  if (fs.existsSync(configPath)) {
    const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (saved.groqKey) GROQ_API_KEY = saved.groqKey;
    if (saved.geminiKey) GEMINI_API_KEY = saved.geminiKey;
  }
} catch (e) {}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));


// Read default Gurgaon Real Estate master script
const defaultScriptPath = path.join(__dirname, 'data', 'gurgaon_real_estate_script.txt');
let defaultGurgaonScript = '';
try {
  defaultGurgaonScript = fs.readFileSync(defaultScriptPath, 'utf8');
} catch (e) {
  console.log('Default script not found.');
}

const PERSONA_PROMPTS = {
  raghav: `You are Raghav Sharma, Senior Luxury Real Estate Closer with Gurgaon Prime Realty.
You are talking directly to a prospective high-net-worth buyer or investor on a LIVE AUDIO PHONE CALL.

STRICT SPOKEN PHONE CALL RULES:
1. Speak in fluent, polished Delhi/Gurgaon conversational Hinglish (Hindi with natural English real estate terms).
2. Maximum 1 to 2 SHORT, PUNCHY SPOKEN SENTENCES per turn!
3. NEVER use bullet points, numbered lists, hyphens, asterisks (**), or markdown!
4. NEVER invent low rental yields or wrong figures. Use ONLY the verified data provided.
5. Tone: Confident, energetic, respectful, market-insider.
6. CLOSING: Always qualify the buyer (budget or 3BHK vs 4BHK) and propose a site visit this Saturday or Sunday!

FEW-SHOT EXAMPLES OF NATURAL PHONE CONVERSATION:
Caller: "Bhai Camellias mein kya rate chal raha hai?"
Raghav: "Sir Camellias toh Golf Course Road ka absolute crown jewel hai, entry hi 70 se 75 Crore se shuru hoti hai! Agar aap 12 se 15 Crore ke budget mein dekh rahe hain toh The Crest sabse luxury option rahega. Aap personal rehne ke liye dekh rahe hain ya investment?"

Caller: "Dwarka Expressway pe investment kaisi rahegi?"
Raghav: "Sir Dwarka Expressway abhi Gurgaon ka fastest-growing corridor hai, direct airport se 15 minute ki connectivity hai! Sector 113 mein Smart World One DXP aur Sector 108 mein Sobha City dono 18 se 20 percent appreciation de rahe hain. Main Saturday ko aapka sample flat walk-through schedule karoon?"

Caller: "Rates girne ke chances hain kya?"
Raghav: "Sir Gurgaon koi speculative bubble nahi hai, yahan Fortune 500 CXOs aur genuine HNIs actual buyers hain! Supply bohot limited hai aur infrastructure tezi se expand ho raha hai, isiliye prices constantly harden ho rahe hain."`,

  riya: `You are Riya, Senior Client Relationship Manager with Gurgaon Prime Realty.
You are speaking directly to a client on a LIVE AUDIO PHONE CALL.

STRICT SPOKEN PHONE CALL RULES:
1. Speak in warm, polite, professional conversational Hindi/Hinglish.
2. Maximum 1 to 2 SPOKEN SENTENCES. 
3. NEVER use bullet points, markdown (**), or lists. Spoken conversation only!
4. Strictly quote verified rates and rental figures from the provided knowledge.
5. Always offer to share the society brochure on WhatsApp and invite them for a site visit this weekend.`
};

// Clean text for natural human speech
function sanitizeSpokenChunk(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/[*_#`~\[\]<>]/g, '')
    .replace(/^[-•*]\s+/gm, '')
    .replace(/\n\s*[-•*]\s+/g, ', ')
    .replace(/\n+/g, ' ');
}

// Status endpoint
app.get('/api/status', async (req, res) => {
  let ollamaOnline = false;
  let models = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      ollamaOnline = true;
      models = data.models || [];
    }
  } catch (err) {
    ollamaOnline = false;
  }

  res.json({
    status: 'online',
    ollamaOnline,
    hasGroqKey: !!GROQ_API_KEY,
    hasGeminiKey: !!GEMINI_API_KEY,
    activeModel: GROQ_API_KEY ? 'Groq Llama-3.3-70B (Free Tier)' : (ollamaOnline ? 'Local Llama 3.2 (3B)' : 'Gurgaon Knowledge Engine'),
    voices: [
      { id: 'hi-IN-MadhurNeural', name: 'Raghav (Madhur) - Confident Male Closer 🇮🇳', persona: 'raghav' },
      { id: 'hi-IN-SwaraNeural', name: 'Riya (Swara) - Warm Female Relationship Mgr 🇮🇳', persona: 'riya' }
    ]
  });
});

// Configure API keys
app.post('/api/config', (req, res) => {
  const { groqKey, geminiKey } = req.body;
  if (groqKey !== undefined) GROQ_API_KEY = groqKey.trim();
  if (geminiKey !== undefined) GEMINI_API_KEY = geminiKey.trim();

  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ groqKey: GROQ_API_KEY, geminiKey: GEMINI_API_KEY }, null, 2));
  } catch (e) {}

  res.json({
    success: true,
    hasGroqKey: !!GROQ_API_KEY,
    hasGeminiKey: !!GEMINI_API_KEY
  });
});

// Fetch master script
app.get('/api/default-script', (req, res) => {
  res.json({
    title: "Master Sales Playbook & Inventory: Gurgaon Real Estate",
    script: defaultGurgaonScript
  });
});

// Main Conversational AI Chat Endpoint (SSE Streaming)
app.post('/api/chat', async (req, res) => {
  const { 
    message, 
    persona = 'raghav',
    history = [], 
    customScript = '',
    provider = 'auto', // 'groq', 'gemini', 'ollama', or 'auto'
    clientGroqKey = '',
    clientGeminiKey = ''
  } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const effectiveGroqKey = clientGroqKey || GROQ_API_KEY;
  const effectiveGeminiKey = clientGeminiKey || GEMINI_API_KEY;

  // Retrieve exact verified facts for this query to eliminate hallucinations
  const verifiedContext = getRelevantContext(message, customScript);
  const effectiveScript = customScript || defaultGurgaonScript;

  let systemPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.raghav;
  systemPrompt += `\n\n============================================================
VERIFIED GURGAON REAL ESTATE FACTS (USE EXACT NUMBERS, ZERO HALLUCINATIONS):
${verifiedContext}
============================================================
MANDATORY RULES:
1. Respond strictly in 1 to 2 SPOKEN sentences. No essays!
2. Absolutely NO markdown (**), NO bullet points, NO lists. Output pure conversational spoken words.
3. If caller asks about rates/rent/societies, use the verified figures above.
4. Always close by qualifying or inviting for a sample flat site visit this Saturday/Sunday!`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  // Try Providers in Order: Groq 70B -> Gemini -> Local Ollama -> Instant Knowledge Fallback
  let streamSuccess = false;

  // 1. Try Groq (Llama 3.3 70B - Lightning Fast, Zero Hallucination, Free Tier)
  if (!streamSuccess && effectiveGroqKey && (provider === 'auto' || provider === 'groq')) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveGroqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: messages,
          temperature: 0.5,
          max_tokens: 120,
          stream: true
        })
      });

      if (groqRes.ok) {
        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          const lines = raw.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                const cleanToken = sanitizeSpokenChunk(token);
                fullText += cleanToken;
                res.write(`data: ${JSON.stringify({ chunk: cleanToken, done: false, model: 'Groq Llama 3.3 (70B)' })}\n\n`);
              }
            } catch (e) {}
          }
        }

        res.write(`data: ${JSON.stringify({ done: true, full: fullText, model: 'Groq Llama 3.3 (70B)' })}\n\n`);
        streamSuccess = true;
        return res.end();
      }
    } catch (err) {
      console.warn('Groq cloud call failed, falling back to local/gemini:', err.message);
    }
  }

  // 2. Try Gemini Free Tier
  if (!streamSuccess && effectiveGeminiKey && (provider === 'auto' || provider === 'gemini')) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveGeminiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-1.5-flash',
          messages: messages,
          temperature: 0.5,
          max_tokens: 120,
          stream: true
        })
      });

      if (geminiRes.ok) {
        const reader = geminiRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const raw = decoder.decode(value, { stream: true });
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                const cleanToken = sanitizeSpokenChunk(token);
                fullText += cleanToken;
                res.write(`data: ${JSON.stringify({ chunk: cleanToken, done: false, model: 'Gemini 1.5 Flash' })}\n\n`);
              }
            } catch (e) {}
          }
        }
        res.write(`data: ${JSON.stringify({ done: true, full: fullText, model: 'Gemini 1.5 Flash' })}\n\n`);
        streamSuccess = true;
        return res.end();
      }
    } catch (err) {
      console.warn('Gemini call failed:', err.message);
    }
  }

  // 3. Try Local Ollama (Offline Free)
  if (!streamSuccess) {
    try {
      const ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:3b',
          messages: messages,
          stream: true,
          options: {
            temperature: 0.4,
            num_predict: 80
          }
        })
      });

      if (ollamaRes.ok) {
        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const raw = decoder.decode(value, { stream: true });
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const token = parsed.message?.content || '';
              if (token) {
                const cleanToken = sanitizeSpokenChunk(token);
                fullText += cleanToken;
                res.write(`data: ${JSON.stringify({ chunk: cleanToken, done: false, model: 'Local Llama 3.2 (3B)' })}\n\n`);
              }
              if (parsed.done) {
                res.write(`data: ${JSON.stringify({ done: true, full: fullText, model: 'Local Llama 3.2 (3B)' })}\n\n`);
              }
            } catch (e) {}
          }
        }
        streamSuccess = true;
        return res.end();
      }
    } catch (err) {
      console.warn('Ollama streaming error:', err.message);
    }
  }

  // 4. Instant Fallback from Knowledge Base if all else fails
  if (!streamSuccess) {
    const fallbackText = persona === 'raghav' 
      ? "हाँजी सर! गोल्फ कोर्स रोड पे DLF Camellias और Crest टॉप ऑप्शन्स हैं, और द्वारका एक्सप्रेसवे पे Smart World One DXP सबसे बेस्ट इन्वेस्टमेंट है। आप इस शनिवार को सैंपल फ्लैट देखने कब आ रहे हैं?"
      : "नमस्ते सर! द्वारका एक्सप्रेसवे और गोल्फ कोर्स रोड दोनों के बेस्ट प्रोजेक्ट्स की इन्वेंट्री हमारे पास है। मैं आपके व्हाट्सएप पे ब्रोशर भेज दूँ क्या?";

    res.write(`data: ${JSON.stringify({ chunk: fallbackText, done: false, model: 'Knowledge Engine Fallback' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, full: fallbackText, model: 'Knowledge Engine Fallback' })}\n\n`);
    res.end();
  }
});

// Stream audio direct with voice selection (Pure Node msedge-tts + Python fallback)
app.get('/api/tts/stream', async (req, res) => {
  const text = req.query.text;
  const voice = req.query.voice || 'hi-IN-MadhurNeural';

  if (!text || !text.trim()) return res.status(400).send('Text required');

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');

  // 1. Pure Node msedge-tts (Runs seamlessly on Vercel without Python!)
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text.trim());
    audioStream.pipe(res);
    return;
  } catch (err) {
    console.warn('Node msedge-tts error, falling back to python:', err.message);
  }

  // 2. Local Python streaming fallback
  const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
  const scriptPath = path.join(__dirname, 'stream_tts.py');

  const py = spawn(pythonPath, [scriptPath, text.trim(), voice]);
  py.stdout.pipe(res);

  py.stderr.on('data', (d) => {
    console.error('Stream stderr:', d.toString());
  });

  req.on('close', () => {
    py.kill();
  });
});

// Audio transcription endpoint (Groq Whisper cloud + Faster-Whisper local)
app.post('/api/transcribe', async (req, res) => {
  const { audioBase64 } = req.body;
  if (!audioBase64) return res.status(400).json({ error: 'Audio required' });

  const buffer = Buffer.from(audioBase64, 'base64');

  // 1. If Groq API key is configured, use Groq's free cloud Whisper (100ms ultra-fast)
  if (GROQ_API_KEY) {
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'audio/webm' });
      formData.append('file', blob, 'recording.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: formData
      });
      if (groqRes.ok) {
        const groqData = await groqRes.json();
        return res.json({ text: groqData.text || '' });
      }
    } catch (e) {
      console.warn('Groq cloud whisper error, falling back:', e.message);
    }
  }

  // 2. High-speed in-memory Whisper daemon (port 3001)
  try {
    const daemonRes = await fetch('http://127.0.0.1:3001/transcribe', {
      method: 'POST',
      body: buffer
    });
    if (daemonRes.ok) {
      const data = await daemonRes.json();
      return res.json({ text: data.text || '' });
    }
  } catch (err) {
    console.warn('In-memory whisper daemon unreachable, using CLI fallback:', err.message);
  }

  // 3. Fallback to CLI Python
  const tmpFile = `/tmp/mic_record_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.webm`;
  fs.writeFileSync(tmpFile, buffer);

  const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
  const scriptPath = path.join(__dirname, 'whisper_transcribe.py');

  exec(`"${pythonPath}" "${scriptPath}" "${tmpFile}"`, (err, stdout) => {
    try { fs.unlinkSync(tmpFile); } catch (e) {}
    if (err) {
      console.error('Whisper transcribe error:', err);
      return res.json({ text: '' });
    }
    try {
      const parsed = JSON.parse(stdout);
      res.json({ text: parsed.text || '' });
    } catch (e) {
      res.json({ text: stdout.trim() });
    }
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🏢  GURGAON REALTY AI Running!`);
    console.log(`💻  Local:    http://localhost:${PORT}`);
    console.log(`📱  Wi-Fi:    http://192.168.1.47:${PORT} (Access from phone/tablet)`);
    console.log(`🎙️  Advisors: Raghav (Madhur) & Riya (Swara)`);
    console.log(`☁️  Cloud:    Vercel Ready for 24/7 Serverless Hosting`);
    console.log(`======================================================\n`);
  });
}

export default app;

