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

// Load saved config if exists (Local environment)
const configPath = path.join(__dirname, 'data', 'ai_config.json');
try {
  if (fs.existsSync(configPath)) {
    const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (saved.groqKey) GROQ_API_KEY = saved.groqKey;
    if (saved.geminiKey) GEMINI_API_KEY = saved.geminiKey;
  }
} catch (e) {}

// Pre-warmed module-level TTS instances to eliminate 300-600ms cold start latency
const ttsRaghav = new MsEdgeTTS();
const ttsRiya = new MsEdgeTTS();
let ttsRaghavReady = false;
let ttsRiyaReady = false;

(async () => {
  try {
    await ttsRaghav.setMetadata('hi-IN-MadhurNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    ttsRaghavReady = true;
    console.log('✅ Raghav TTS (hi-IN-MadhurNeural) pre-warmed');
  } catch (err) {
    console.warn('Raghav TTS warmup warning:', err.message);
  }
  try {
    await ttsRiya.setMetadata('hi-IN-SwaraNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    ttsRiyaReady = true;
    console.log('✅ Riya TTS (hi-IN-SwaraNeural) pre-warmed');
  } catch (err) {
    console.warn('Riya TTS warmup warning:', err.message);
  }
})();

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
  raghav: `You are Raghav Sharma, Senior Luxury Real Estate Advisor with Gurgaon Prime Realty.
You are talking directly to a prospective high-net-worth buyer or investor on a LIVE AUDIO PHONE CALL.

STRICT SPOKEN PHONE CALL RULES:
1. Speak in fluent, polished Delhi/Gurgaon conversational Hinglish (natural Hindi mixed with English real estate terms).
2. Respond in 2 to 3 NATURAL, PUNCHY SPOKEN SENTENCES. Never give a dry 1-line answer, but never recite long essays!
   - Sentence 1: Direct, authoritative answer with verified society rates, location, or rental return.
   - Sentence 2: Key value driver or USP (e.g. appreciation potential, HNI neighbor profile, or airport proximity).
   - Sentence 3: Natural qualification question OR inviting them for an exclusive sample flat walk-through this Saturday or Sunday!
3. NEVER use bullet points, numbered lists, hyphens, asterisks (**), or markdown. Only pure spoken human conversation!
4. Strictly quote verified rates and rental figures from the provided knowledge. Zero hallucination!
5. Tone: Confident, warm, energetic, respectful, market-insider.

FEW-SHOT EXAMPLES OF NATURAL PHONE CONVERSATION:
Caller: "Bhai Camellias mein kya rate chal raha hai?"
Raghav: "Sir Camellias toh Golf Course Road ka absolute crown jewel hai, entry hi 70 se 75 Crore se shuru hoti hai aur penthouses 130 Crore tak jaate hain! Yahan Fortune 500 CXOs aur top industrialists ka neighborhood hai with a Michelin-grade clubhouse. Aap personal rehne ke liye dekh rahe hain ya investment portfolio ke liye?"

Caller: "Dwarka Expressway pe investment kaisi rahegi?"
Raghav: "Sir Dwarka Expressway abhi NCR ka highest appreciation corridor hai, direct IGI Airport se 15 minute ki signal-free connectivity hai! Sector 113 mein Smart World One DXP aur Sector 108 mein Sobha City dono 18 se 20 percent capital growth de rahe hain. Main Saturday ko aapka sample flat walk-through schedule karoon, subah 11 baje convenient rahega?"

Caller: "Rates girne ke chances hain kya Gurgaon mein?"
Raghav: "Sir Gurgaon koi speculative bubble nahi hai, yahan 90 percent buyers genuine end-users aur corporate leaders hain! Supply bohot restricted hai aur infrastructure tezi se expand ho raha hai, isiliye prices constantly harden ho rahe hain. Agar aap plan kar rahe hain toh abhi entry karna maximum equity gain dega!"`,

  riya: `You are Riya, Senior Client Relationship Manager with Gurgaon Prime Realty.
You are speaking directly to a client on a LIVE AUDIO PHONE CALL.

STRICT SPOKEN PHONE CALL RULES:
1. Speak in warm, polite, pleasant and professional conversational Hindi/Hinglish.
2. Respond in 2 to 3 NATURAL SPOKEN SENTENCES per turn. Never give a cold 1-line answer, and never recite boring essays!
   - Sentence 1: Warm acknowledgment and direct, verified facts (rates, layout, or location).
   - Sentence 2: Practical client insight (amenities, green spaces, schools, or rental return).
   - Sentence 3: Propose sending the floor plan/brochure on WhatsApp OR booking a site visit this weekend.
3. NEVER use bullet points, markdown (**), or lists. Pure spoken words only!
4. Strictly quote verified rates and rental figures from the provided knowledge. Zero hallucination!
5. Tone: Empathetic, articulate, helpful, polished, high-touch luxury service.

FEW-SHOT EXAMPLES OF RIYA'S NATURAL PHONE STYLE:
Caller: "Riya ji, Dwarka Expressway mein konsa project dekhna chahiye?"
Riya: "Sir Dwarka Expressway pe Smart World One DXP aur Sobha City dono fantastic options hain! Smart World zero-km Delhi border pe hai with 15 minute airport connectivity, jabki Sobha City 39 acres mein massive green open spaces offer karta hai. Main aapke WhatsApp pe dono ke brochure share kar doon kya?"

Caller: "Rental yield kitna mil sakta hai yahan?"
Riya: "Sir Dwarka Expressway pe 3BHK pe ₹60,000 se ₹1.1 Lakh per month rental mil raha hai, jo almost 4 percent ki strong rental yield banti hai! Golf Course Road pe rentals ₹2.5 se ₹8 Lakh hain, par entry ticket 12 Crore se shuru hoti hai. Aapka budget preference 3 se 5 Crore range mein hai ya usse upar?"

Caller: "Kya under-construction project lena safe hai?"
Riya: "Bilkul genuine concern hai Sir, isiliye hum strictly RERA-approved Tier-1 builders hi recommend karte hain jaise DLF, Sobha aur Godrej jinki delivery flawless rahi hai. Aapka capital yahan 100 percent safe aur protected rehta hai. Kya is weekend aapko site visit ke liye car arrange karwa doon?"`
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
    activeModel: GROQ_API_KEY ? 'Groq Llama 3.1 / 3.3 (Free Tier)' : (ollamaOnline ? 'Local Llama 3.2 (3B)' : 'Gurgaon Knowledge Engine'),
    voices: [
      { id: 'hi-IN-MadhurNeural', name: 'Raghav (Madhur) - Confident Male Closer 🇮🇳', persona: 'raghav' },
      { id: 'hi-IN-SwaraNeural', name: 'Riya (Swara) - Warm Female Relationship Mgr 🇮🇳', persona: 'riya' }
    ]
  });
});

// Configure API keys (Safe on both local disk and Vercel serverless)
app.post('/api/config', (req, res) => {
  const { groqKey, geminiKey } = req.body;
  if (groqKey !== undefined) GROQ_API_KEY = groqKey.trim();
  if (geminiKey !== undefined) GEMINI_API_KEY = geminiKey.trim();

  try {
    if (!process.env.VERCEL) {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ groqKey: GROQ_API_KEY, geminiKey: GEMINI_API_KEY }, null, 2));
    }
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

  let systemPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.raghav;
  systemPrompt += `\n\n============================================================
VERIFIED GURGAON REAL ESTATE FACTS (USE EXACT NUMBERS, ZERO HALLUCINATIONS):
${verifiedContext}
============================================================
MANDATORY RULES:
1. Respond in 2 to 3 natural spoken sentences. No dry 1-liners, no essays!
2. Absolutely NO markdown (**), NO bullet points, NO lists. Output pure conversational spoken words.
3. If caller asks about rates/rent/societies, use the verified figures above.
4. Always close by qualifying budget/layout or inviting for a sample flat site visit this Saturday/Sunday!`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  let streamSuccess = false;

  // 1. Try Groq with reliable multi-model fallback list (Fastest free tier)
  if (!streamSuccess && effectiveGroqKey && (provider === 'auto' || provider === 'groq')) {
    const GROQ_MODELS = [
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'llama3-70b-8192',
      'mixtral-8x7b-32768'
    ];

    for (const modelName of GROQ_MODELS) {
      if (streamSuccess) break;
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveGroqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            temperature: 0.5,
            max_tokens: 180,
            stream: true
          })
        });

        if (groqRes.ok) {
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let lineBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lineBuffer += decoder.decode(value, { stream: true });
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop(); // Keep trailing partial line in buffer

            for (const line of lines) {
              if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                const token = parsed.choices?.[0]?.delta?.content || '';
                if (token) {
                  const cleanToken = sanitizeSpokenChunk(token);
                  fullText += cleanToken;
                  res.write(`data: ${JSON.stringify({ chunk: cleanToken, done: false, model: `Groq (${modelName})` })}\n\n`);
                }
              } catch (e) {}
            }
          }

          if (lineBuffer.startsWith('data: ') && !lineBuffer.includes('[DONE]')) {
            try {
              const parsed = JSON.parse(lineBuffer.slice(6));
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                const cleanToken = sanitizeSpokenChunk(token);
                fullText += cleanToken;
                res.write(`data: ${JSON.stringify({ chunk: cleanToken, done: false, model: `Groq (${modelName})` })}\n\n`);
              }
            } catch (e) {}
          }

          if (fullText.trim()) {
            res.write(`data: ${JSON.stringify({ done: true, full: fullText, model: `Groq (${modelName})` })}\n\n`);
            streamSuccess = true;
            return res.end();
          }
        } else {
          const errBody = await groqRes.text();
          console.warn(`Groq model ${modelName} returned status ${groqRes.status}:`, errBody.slice(0, 120));
        }
      } catch (err) {
        console.warn(`Groq ${modelName} call exception:`, err.message);
      }
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
          max_tokens: 180,
          stream: true
        })
      });

      if (geminiRes.ok) {
        const reader = geminiRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let lineBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop();

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

        if (fullText.trim()) {
          res.write(`data: ${JSON.stringify({ done: true, full: fullText, model: 'Gemini 1.5 Flash' })}\n\n`);
          streamSuccess = true;
          return res.end();
        }
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
            num_predict: 120
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
      ? "हाँजी सर! गोल्फ कोर्स रोड पे DLF Camellias और Crest प्रीमियम ऑप्शन्स हैं, और द्वारका एक्सप्रेसवे पे Smart World One DXP सबसे बेस्ट इन्वेस्टमेंट ग्रोथ दे रहा है। आप इस शनिवार को सैंपल फ्लैट देखने कब आ रहे हैं?"
      : "नमस्ते सर! द्वारका एक्सप्रेसवे और गोल्फ कोर्स रोड दोनों के बेस्ट प्रोजेक्ट्स की इन्वेंट्री हमारे पास तैयार है। क्या मैं आपके व्हाट्सएप पे सोसाइटी का डिटेल ब्रोशर शेयर कर दूँ?";

    res.write(`data: ${JSON.stringify({ chunk: fallbackText, done: false, model: 'Knowledge Engine Fallback' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, full: fallbackText, model: 'Knowledge Engine Fallback' })}\n\n`);
    res.end();
  }
});

// Stream audio direct with voice selection (Pre-warmed Node msedge-tts + Python fallback)
app.get('/api/tts/stream', async (req, res) => {
  const text = req.query.text;
  const voice = req.query.voice || 'hi-IN-MadhurNeural';

  if (!text || !text.trim()) return res.status(400).send('Text required');

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');

  // 1. Pure Node msedge-tts (Pre-warmed instances for ultra-fast, zero-lag response)
  try {
    const isRiya = voice.includes('Swara');
    const tts = isRiya ? ttsRiya : ttsRaghav;
    const isReady = isRiya ? ttsRiyaReady : ttsRaghavReady;

    if (!isReady) {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      if (isRiya) ttsRiyaReady = true; else ttsRaghavReady = true;
    }

    const { audioStream } = tts.toStream(text.trim());
    audioStream.pipe(res);
    return;
  } catch (err) {
    console.warn('Node msedge-tts error, attempting fresh instance:', err.message);
    try {
      const freshTts = new MsEdgeTTS();
      await freshTts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = freshTts.toStream(text.trim());
      audioStream.pipe(res);
      return;
    } catch (err2) {
      console.warn('Node msedge-tts retry failed, falling back to python:', err2.message);
    }
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

  // 1. If Groq API key is configured, use Groq's free cloud Whisper (~100ms ultra-fast)
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
