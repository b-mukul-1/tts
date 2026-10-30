# 🏢 Gurgaon Real Estate Voice AI Agent (Raghav & Riya)

An ultra-responsive, zero-latency Conversational Voice AI Agent engineered for Gurgaon Luxury Real Estate (Dwarka Expressway, Golf Course Road, Southern Peripheral Road, New Gurgaon).

## 🎙️ Twin Neural Advisors
- **Raghav Sharma (Direct & Confident Closer):** Powered by Microsoft Azure `hi-IN-MadhurNeural`. Direct, sharp, and authoritative real estate consultant who answers inventory questions instantly and books site visits.
- **Riya (Warm Relationship Manager):** Powered by Microsoft Azure `hi-IN-SwaraNeural`. Polite, relationship-focused advisor who shares brochures on WhatsApp and schedules weekend walk-throughs.

## ⚡ Architecture
- **Voice Synthesis (TTS):** Pure Node.js `msedge-tts` (Runs serverlessly on Vercel without Python).
- **Brain (LLM):** Groq Cloud API (`qwen/qwen3.8-27b` / `llama-3.3-70b-versatile`) with streaming SSE + Local Ollama fallback.
- **Hearing (STT):** Groq Whisper Cloud (`whisper-large-v3-turbo` in ~100ms) + Local Faster-Whisper fallback.
- **Knowledge Engine:** Gurugram micro-market ground truth (rates, inventory, rental yields, metro connectivity).

## 🚀 Deploy to Vercel (24/7 Free Cloud Hosting)
1. Import this repository into [Vercel](https://vercel.com).
2. (Optional) Set Environment Variable:
   - `GROQ_API_KEY`: Your free Groq API key (from [console.groq.com](https://console.groq.com)).
3. Hit **Deploy** — your agent is live 24/7 on your custom Vercel URL!

## 💻 Local Wi-Fi Access
Run locally:
```bash
npm install
node server.js
```
Access on any phone or tablet on your local Wi-Fi: `http://<your-lan-ip>:3000`.
