// Awaaz AI - Gurgaon Real Estate Studio Edition (Raghav & Riya)
// 100% Free Live Voice Calling (Zero-Typing, Brave/Chrome/Safari Audio-Energy VAD, Local Faster-Whisper STT)

class GurgaonRealtyAgent {
  constructor() {
    this.persona = 'raghav'; // 'raghav' or 'riya'
    this.currentVoice = 'hi-IN-MadhurNeural';
    this.language = 'hi-IN';
    
    // Call & Audio States
    this.isInCall = false;
    this.isListening = false;
    this.isSpeaking = false;
    this.isThinking = false;
    this.continuousDuplex = true;
    
    // Conversation History
    this.conversationHistory = [];
    this.customScript = '';
    this.scriptDepth = 'closer';
    
    // Web Audio & VU Visualizer
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.audioData = new Uint8Array(64);
    
    // Audio-Energy VAD (Works in Brave, Chrome, Safari, Firefox, everywhere!)
    this.userIsSpeakingAudio = false;
    this.audioSpeechStartTime = 0;
    this.audioSilenceTimer = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    
    // Optional Web Speech API (for instant Chrome interim transcripts)
    this.recognition = null;
    this.lastSpeechText = '';
    this.speakingWatchdog = null;
    
    // Single-Stream Audio Queue (NO ECHO, NO DOUBLE VOICES)
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.isPlayingFiller = false;

    // Greetings Variety (Keeps interactions fresh & human)
    this.greetings = {
      raghav: [
        "नमस्ते सर! राघव बात कर रहा हूँ गुड़गांव प्राइम रियल्टी से। कहिए सर, गोल्फ कोर्स रोड देख रहे हैं या द्वारका एक्सप्रेसवे पे कोई बढ़िया डील चाहिए?",
        "हाँजी नमस्ते सर! राघव शर्मा बोल रहा हूँ गुड़गांव प्राइम रियल्टी से। बताइए सर, 3BHK या 4BHK में क्या बजट प्लान कर रहे हैं?",
        "नमस्ते सर! राघव बात कर रहा हूँ। इस हफ्ते द्वारका एक्सप्रेसवे और एसपीआर पे काफी एक्सक्लूसिव इन्वेंट्री आई है — आप पर्सनल यूज़ के लिए देख रहे हैं या इन्वेस्टमेंट?",
        "हाँजी नमस्ते! राघव बोल रहा हूँ। गुड़गांव के टॉप प्रोजेक्ट्स की फ्रेश इन्वेंट्री और रेट्स के लिए बताइए किस लोकेशन को प्राथमिकता दे रहे हैं?"
      ],
      riya: [
        "हाँजी नमस्ते सर! मैं रिया बोल रही हूँ गुड़गांव प्राइम रियल्टी से। बताइए सर, आज किस सोसाइटी के बारे में जानना चाहते हैं?",
        "नमस्ते सर! रिया बात कर रही हूँ। आज मैं आपको द्वारका एक्सप्रेसवे और गोल्फ कोर्स रोड की बेस्ट अवेलेबल यूनिट्स और रेट्स बता सकती हूँ — क्या प्रेफर करेंगे?",
        "हाँजी नमस्ते सर! रिया बोल रही हूँ। हमारे पास इस वीकेंड के लिए कुछ एक्सक्लूसिव सैंपल फ्लैट विज़िट स्लॉट्स हैं — क्या आप कोई प्रोजेक्ट प्लान कर रहे हैं?",
        "नमस्ते सर! रिया बात कर रही हूँ गुड़गांव प्राइम रियल्टी से। आपका बजट और पसंद की लोकेशन बताइए, मैं बिल्कुल सटीक ऑप्शन्स सजेस्ट करती हूँ!"
      ]
    };

    // Conversational Filler Phrases (Eliminates dead silence while AI thinks)
    this.fillerPhrases = {
      raghav: [
        "हाँजी सर, बिल्कुल, एक सेकंड...",
        "हाँजी, मैं अभी लेटेस्ट इन्वेंट्री चेक करता हूँ...",
        "बिल्कुल सर, इसका रीसेंट डेटा देखते हैं...",
        "हाँजी सर, अभी बताता हूँ..."
      ],
      riya: [
        "हाँजी सर, एक सेकंड, मैं देखती हूँ...",
        "जी सर, बिल्कुल, अभी चेक करती हूँ...",
        "हाँजी, मैं सोसाइटी की डिटेल्स देख रही हूँ...",
        "जी सर, बिल्कुल बताती हूँ..."
      ]
    };
    
    // Free AI Keys
    this.groqKey = localStorage.getItem('gurgaon_groq_key') || '';
    this.geminiKey = localStorage.getItem('gurgaon_gemini_key') || '';
    
    this.initDOM();
    this.initCanvas();
    this.initSpeechRecognition();
    this.initScriptStudio();
    this.initAIConfig();
    this.bindEvents();
    this.animate();
  }

  initDOM() {
    this.audioPlayer = document.getElementById('studio-audio-player');
    this.testRaghavBtn = document.getElementById('test-raghav-btn');
    this.testRiyaBtn = document.getElementById('test-riya-btn');
    
    // Hero Call Elements
    this.callHeroBar = document.getElementById('call-hero-bar');
    this.heroCallBtn = document.getElementById('hero-call-toggle-btn');
    this.heroBtnText = document.getElementById('hero-btn-text');
    this.heroAdvisorName = document.getElementById('hero-advisor-name');
    
    // Stage & Orb Elements
    this.stageCard = document.getElementById('stage-card');
    this.callStatusBanner = document.getElementById('call-status-banner');
    this.callStatusDot = document.getElementById('call-status-dot');
    this.callStatusHeading = document.getElementById('call-status-heading');
    this.orbTriggerZone = document.getElementById('orb-trigger-zone');
    this.orbCanvas = document.getElementById('orb-canvas');
    this.waveformCanvas = document.getElementById('waveform-canvas');
    this.orbLabel = document.getElementById('orb-label');
    this.liveText = document.getElementById('live-text');
    this.orbCtx = this.orbCanvas.getContext('2d');
    this.waveCtx = this.waveformCanvas.getContext('2d');

    // VU Mic Meter Elements
    this.micStatusBadge = document.getElementById('mic-status-badge');
    this.micLevelText = document.getElementById('mic-level-text');
    this.micBarFill = document.getElementById('mic-bar-fill');
    
    // Action Controls
    this.micBtn = document.getElementById('mic-btn');
    this.doneSpeakingBtn = document.getElementById('done-speaking-btn');
    this.pttBtn = document.getElementById('ptt-btn');
    this.interruptBtn = document.getElementById('interrupt-btn');
    this.endCallBtn = document.getElementById('end-call-btn');
    
    // Transcript & Sidebar
    this.transcriptContainer = document.getElementById('transcript-container');
    this.clearBtn = document.getElementById('clear-btn');
    this.duplexToggle = document.getElementById('duplex-toggle');
    this.pitchDepthSelect = document.getElementById('pitch-depth-select');
    this.initialSenderTag = document.getElementById('initial-sender-tag');
    this.initialMsgBody = document.getElementById('initial-msg-body');
    this.initialReplayBtn = document.getElementById('initial-replay-btn');
    
    // Text Fallback (Collapsible)
    this.textForm = document.getElementById('text-form');
    this.textInput = document.getElementById('text-input');
    
    // Script Modal Elements
    this.scriptModal = document.getElementById('script-modal');
    this.openScriptModalBtn = document.getElementById('open-script-modal-btn');
    this.closeScriptModalBtn = document.getElementById('close-script-modal-btn');
    this.scriptTextarea = document.getElementById('script-textarea');
    this.scriptStatsBadge = document.getElementById('script-stats-badge');
    this.loadDefaultScriptBtn = document.getElementById('load-default-script-btn');
    this.saveScriptBtn = document.getElementById('save-script-btn');
    this.clearScriptBtn = document.getElementById('clear-script-btn');
    this.scriptFileInput = document.getElementById('script-file-input');
    this.scriptActiveTag = document.getElementById('script-active-tag');
    
    // AI Brain Modal Elements
    this.aiModal = document.getElementById('ai-modal');
    this.openAiModalBtn = document.getElementById('open-ai-modal-btn');
    this.closeAiModalBtn = document.getElementById('close-ai-modal-btn');
    this.cancelAiBtn = document.getElementById('cancel-ai-btn');
    this.saveAiKeysBtn = document.getElementById('save-ai-keys-btn');
    this.groqKeyInput = document.getElementById('groq-key-input');
    this.geminiKeyInput = document.getElementById('gemini-key-input');
    this.aiActiveBadge = document.getElementById('ai-active-badge');
    this.ollamaStatusBadge = document.getElementById('ollama-status-badge');
  }

  initCanvas() {
    this.orbRadius = 88;
    this.orbPhase = 0;
  }

  // Optional Web Speech API (runs in parallel if browser allows)
  initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          this.lastSpeechText = spoken;
          this.liveText.innerHTML = `🗣️ <strong>You:</strong> "${spoken}"`;
        }
      };

      this.recognition.onerror = (e) => {
        // Silently handled - MediaRecorder + local Whisper handles Brave and privacy shields
      };
    } catch (e) {}
  }

  // Initialize Microphone Stream & Audio Context
  async initMicAudio() {
    if (this.micStream && this.audioCtx) return true;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.35;
      source.connect(this.analyser);

      // Initialize MediaRecorder for Whisper transcription
      this.initMediaRecorder();

      this.micStatusBadge.textContent = "🎤 Mic Connected";
      this.micStatusBadge.style.color = "#10b981";
      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      this.micStatusBadge.textContent = "⚠️ Mic Blocked";
      this.micStatusBadge.style.color = "#ef4444";
      this.liveText.textContent = "⚠️ Microphone access was blocked. Please click the lock icon in your address bar and allow Microphone.";
      return false;
    }
  }

  initMediaRecorder() {
    if (!this.micStream || !window.MediaRecorder) return;
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      this.mediaRecorder = mimeType ? new MediaRecorder(this.micStream, { mimeType }) : new MediaRecorder(this.micStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const chunks = this.audioChunks;
        this.audioChunks = [];

        if (chunks.length === 0) {
          if (this.isInCall && !this.isSpeaking && !this.isThinking) this.startListening();
          return;
        }

        const audioBlob = new Blob(chunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });

        // If Web Speech API already transcribed something with high confidence, use it
        if (this.lastSpeechText && this.lastSpeechText.trim().length > 2) {
          const text = this.lastSpeechText.trim();
          this.lastSpeechText = '';
          this.handleUserSpeech(text);
          return;
        }

        // If in Brave Browser or Web Speech had no output, transcribe with local Faster-Whisper!
        if (audioBlob.size > 1200) {
          this.transcribeAudioBlob(audioBlob);
        } else {
          // Noise/Too short, resume listening
          if (this.isInCall && !this.isSpeaking && !this.isThinking) this.startListening();
        }
      };
    } catch (e) {
      console.warn('MediaRecorder init error:', e);
    }
  }

  // Transcribe recorded audio with local Faster-Whisper
  async transcribeAudioBlob(blob) {
    this.updateCallStatus('thinking');
    this.liveText.innerHTML = "⏳ Transcribing audio with local Whisper...";

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = reader.result.split(',')[1];
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Audio })
        });
        const data = await res.json();
        if (data.text && data.text.trim()) {
          this.liveText.innerHTML = `🗣️ <strong>You:</strong> "${data.text.trim()}"`;
          this.handleUserSpeech(data.text.trim());
        } else {
          this.updateCallStatus('listening');
          this.liveText.textContent = '"कॉल सक्रिय है। कृपया बोलें, मैं सुन रहा हूँ..."';
          this.startListening();
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.warn('Audio transcribe failed:', e);
      this.updateCallStatus('listening');
      this.startListening();
    }
  }

  async initAIConfig() {
    if (this.groqKey) {
      this.groqKeyInput.value = this.groqKey;
      this.aiActiveBadge.textContent = '⚡ Groq 70B (Free)';
    } else if (this.geminiKey) {
      this.geminiKeyInput.value = this.geminiKey;
      this.aiActiveBadge.textContent = '🌐 Gemini Flash (Free)';
    } else {
      this.aiActiveBadge.textContent = '💻 Local Ollama (Free)';
    }

    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.ollamaOnline) {
        this.ollamaStatusBadge.textContent = 'Active';
      } else {
        this.ollamaStatusBadge.textContent = 'Offline';
        this.ollamaStatusBadge.style.color = '#f59e0b';
      }
    } catch (e) {}
  }

  async initScriptStudio() {
    try {
      const res = await fetch('/api/default-script');
      const data = await res.json();
      if (data.script) {
        this.scriptTextarea.value = data.script;
        this.customScript = data.script;
        this.updateScriptStats(data.script);
      }
    } catch (e) {}
  }

  updateScriptStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.scriptStatsBadge.textContent = `Words: ~${words} | Societies: 24+`;
  }

  // START LIVE PHONE CALL
  getRandomGreeting(persona) {
    const list = this.greetings[persona] || this.greetings.raghav;
    return list[Math.floor(Math.random() * list.length)];
  }

  playFillerPhrase() {
    if (!this.isInCall) return;
    try {
      const phrases = this.fillerPhrases[this.persona] || this.fillerPhrases.raghav;
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      const streamUrl = `/api/tts/stream?text=${encodeURIComponent(phrase)}&voice=${encodeURIComponent(this.currentVoice)}&t=${Date.now()}`;
      
      this.isPlayingFiller = true;
      this.audioPlayer.src = streamUrl;
      this.audioPlayer.play().catch(() => {});
    } catch (e) {}
  }

  async startCall() {
    this.isInCall = true;
    this.callHeroBar.classList.add('active');
    this.heroBtnText.textContent = "🔴 END CALL (कॉल समाप्त करें)";
    this.heroCallBtn.classList.remove('start');
    this.heroCallBtn.classList.add('end');
    this.endCallBtn.style.display = 'inline-flex';
    
    // Explicit microphone initialization
    const micReady = await this.initMicAudio();
    if (!micReady) return;

    const advisorName = this.persona === 'raghav' ? 'Raghav Sharma' : 'Riya';
    this.heroAdvisorName.textContent = `🟢 Connected Live with ${advisorName}`;
    
    const greeting = this.getRandomGreeting(this.persona);
    this.addMessage(this.persona, greeting);

    // Speak single greeting stream
    this.speakText(greeting, this.currentVoice);
  }

  endCall() {
    this.isInCall = false;
    this.isPlayingFiller = false;
    this.callHeroBar.classList.remove('active');
    this.heroBtnText.textContent = "📞 START LIVE VOICE CALL (कॉल शुरू करें)";
    this.heroCallBtn.classList.remove('end');
    this.heroCallBtn.classList.add('start');
    this.endCallBtn.style.display = 'none';
    
    const advisorName = this.persona === 'raghav' ? 'Raghav Sharma' : 'Riya';
    this.heroAdvisorName.textContent = `Live Voice Call with ${advisorName}`;
    
    this.stopListening();
    this.interrupt();
    this.updateCallStatus('idle');
    this.micStatusBadge.textContent = "🎤 Mic Standby";
    this.micBarFill.style.width = '0%';
    this.micLevelText.textContent = "Input Level: 0%";
    this.liveText.textContent = '"कॉल समाप्त हो गई है। दोबारा बात करने के लिए ऊपर कॉल शुरू करें पर क्लिक करें।"';
  }

  updateCallStatus(state) {
    const advisorName = this.persona === 'raghav' ? 'Raghav' : 'Riya';
    
    if (state === 'listening') {
      this.callStatusHeading.textContent = `🎙️ LISTENING TO YOU... SPEAK IN HINDI (बोलिए, ${advisorName} सुन रहा है)`;
      this.orbLabel.textContent = `Listening... Speak Now (${advisorName})`;
      this.callStatusDot.style.background = '#10b981';
      this.callStatusDot.style.boxShadow = '0 0 16px #10b981';
    } else if (state === 'thinking') {
      this.callStatusHeading.textContent = `🧠 ${advisorName.toUpperCase()} IS CONSULTING INVENTORY & RATES...`;
      this.orbLabel.textContent = `${advisorName} is analyzing...`;
      this.callStatusDot.style.background = '#fb8500';
      this.callStatusDot.style.boxShadow = '0 0 16px #fb8500';
    } else if (state === 'speaking') {
      this.callStatusHeading.textContent = `🔊 ${advisorName.toUpperCase()} IS SPEAKING VIA STUDIO AUDIO...`;
      this.orbLabel.textContent = `${advisorName} is speaking...`;
      this.callStatusDot.style.background = '#ffb703';
      this.callStatusDot.style.boxShadow = '0 0 16px #ffb703';
    } else {
      this.callStatusHeading.textContent = `READY TO CALL • GURGAON PRIME REALTY`;
      this.orbLabel.textContent = `Tap to Start Voice Call with ${advisorName}`;
      this.callStatusDot.style.background = '#00f2fe';
      this.callStatusDot.style.boxShadow = '0 0 16px #00f2fe';
    }
  }

  startListening() {
    if (this.isSpeaking || this.isThinking) return;
    if (this.isListening) return;

    this.isListening = true;
    this.userIsSpeakingAudio = false;
    this.lastSpeechText = '';
    clearTimeout(this.audioSilenceTimer);
    this.audioSilenceTimer = null;

    this.micBtn.classList.add('active');
    this.updateCallStatus('listening');

    // 1. Web Speech API (runs parallel if supported)
    try {
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (e) {}

    // 2. Start MediaRecorder (Brave, Chrome, Safari audio capture)
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.audioChunks = [];
        this.mediaRecorder.start(100);
      }
    } catch (e) {}
  }

  stopListening() {
    this.isListening = false;
    this.userIsSpeakingAudio = false;
    clearTimeout(this.audioSilenceTimer);
    this.audioSilenceTimer = null;
    this.micBtn.classList.remove('active');
    
    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) {}

    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    } catch (e) {}
  }

  interrupt() {
    this.isPlayingFiller = false;
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer.src = '';
    }
    clearTimeout(this.speakingWatchdog);
    this.speechQueue = [];
    this.isSpeaking = false;
    this.isProcessingQueue = false;
    this.isThinking = false;
    
    if (this.isInCall) {
      this.updateCallStatus('listening');
      this.startListening();
    }
  }

  // Handle User Voice Query & Ground with Knowledge Engine
  async handleUserSpeech(text) {
    if (!text || !text.trim()) return;
    
    this.stopListening();
    this.addMessage('user', text);
    this.conversationHistory.push({ role: 'user', content: text });

    this.isThinking = true;
    this.updateCallStatus('thinking');

    // Play instant natural filler audio to eliminate silence while LLM processes
    this.playFillerPhrase();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          persona: this.persona,
          history: this.conversationHistory,
          customScript: this.customScript,
          scriptDepth: this.scriptDepth,
          clientGroqKey: this.groqKey,
          clientGeminiKey: this.geminiKey
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantFull = '';
      let sentenceBuffer = '';
      let isFirstChunk = true;

      const assistantMsgElem = this.addMessage('assistant', '<div class="thinking-indicator"><span></span><span></span><span></span></div>', true);
      const msgBody = assistantMsgElem.querySelector('.msg-body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              if (isFirstChunk) {
                isFirstChunk = false;
                this.isThinking = false;
                this.updateCallStatus('speaking');
                msgBody.innerHTML = '';
              }

              assistantFull += data.chunk;
              sentenceBuffer += data.chunk;
              msgBody.textContent = assistantFull;

              // Sentence splitting for smooth human streaming speech
              const punctuationMatch = sentenceBuffer.match(/([.,!?।\n]+)/);
              if (punctuationMatch && sentenceBuffer.length > 20) {
                const splitIndex = punctuationMatch.index + punctuationMatch[0].length;
                const chunkToSpeak = sentenceBuffer.slice(0, splitIndex).trim();
                sentenceBuffer = sentenceBuffer.slice(splitIndex);

                if (chunkToSpeak) {
                  this.queueSpeechChunk(chunkToSpeak);
                }
              }
            }

            if (data.done) {
              if (sentenceBuffer.trim()) {
                this.queueSpeechChunk(sentenceBuffer.trim());
              }
              const replayBtn = assistantMsgElem.querySelector('.replay-btn');
              if (replayBtn) replayBtn.dataset.text = assistantFull;
              this.conversationHistory.push({ role: 'assistant', content: assistantFull });
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      this.isThinking = false;
      this.isPlayingFiller = false;
      this.updateCallStatus(this.isInCall ? 'listening' : 'idle');
      this.addMessage('assistant', "सर, फोन लाइन में थोड़ा डिस्टर्बेंस था। एक बार दोबारा बताइए ना प्लीज?");
    }
  }

  queueSpeechChunk(text) {
    const clean = text.replace(/[*_#`~\[\]<>]/g, '').trim();
    if (!clean) return;
    this.speechQueue.push(clean);
    this.processSpeechQueue();
  }

  // SINGLE AUDIO STREAM PLAYBACK (NO DOUBLE VOICES / NO ECHO)
  async processSpeechQueue() {
    if (this.isProcessingQueue || this.speechQueue.length === 0) return;

    // Gracefully transition if filler was playing
    if (this.isPlayingFiller) {
      this.isPlayingFiller = false;
      this.audioPlayer.pause();
    }

    this.isProcessingQueue = true;
    this.isSpeaking = true;
    this.updateCallStatus('speaking');

    const textToSpeak = this.speechQueue.shift();

    // Stream directly into browser audio element ONLY
    const streamUrl = `/api/tts/stream?text=${encodeURIComponent(textToSpeak)}&voice=${encodeURIComponent(this.currentVoice)}&t=${Date.now()}`;

    try {
      this.audioPlayer.src = streamUrl;

      // Watchdog timer accurately tuned for Hindi speech duration (~650ms per word)
      clearTimeout(this.speakingWatchdog);
      const wordCount = textToSpeak.trim().split(/\s+/).length;
      const approxDurationMs = Math.max(3500, wordCount * 650);
      this.speakingWatchdog = setTimeout(() => {
        if (this.isSpeaking && this.isProcessingQueue) {
          console.log('Audio watchdog advancing queue...');
          this.isProcessingQueue = false;
          if (this.speechQueue.length > 0) this.processSpeechQueue();
          else {
            this.isSpeaking = false;
            if (this.isInCall) {
              this.updateCallStatus('listening');
              this.startListening();
            }
          }
        }
      }, approxDurationMs + 2500);

      this.audioPlayer.onended = () => {
        if (this.isPlayingFiller) {
          this.isPlayingFiller = false;
          return;
        }
        clearTimeout(this.speakingWatchdog);
        this.isProcessingQueue = false;
        if (this.speechQueue.length > 0) {
          this.processSpeechQueue();
        } else {
          this.isSpeaking = false;
          if (this.isInCall) {
            this.updateCallStatus('listening');
            if (this.continuousDuplex && !this.isListening) {
              setTimeout(() => {
                if (!this.isSpeaking && !this.isThinking && this.isInCall) {
                  this.startListening();
                }
              }, 250);
            }
          } else {
            this.updateCallStatus('idle');
          }
        }
      };

      this.audioPlayer.onerror = (e) => {
        console.warn('Audio playback error:', e);
        clearTimeout(this.speakingWatchdog);
        setTimeout(() => {
          this.isProcessingQueue = false;
          if (this.speechQueue.length > 0) this.processSpeechQueue();
          else {
            this.isSpeaking = false;
            if (this.isInCall) {
              this.updateCallStatus('listening');
              this.startListening();
            }
          }
        }, 1500);
      };

      await this.audioPlayer.play();
    } catch (err) {
      console.warn('Audio play call exception:', err);
      clearTimeout(this.speakingWatchdog);
      setTimeout(() => {
        this.isProcessingQueue = false;
        if (this.speechQueue.length > 0) this.processSpeechQueue();
        else {
          this.isSpeaking = false;
          if (this.isInCall) {
            this.updateCallStatus('listening');
            this.startListening();
          }
        }
      }, 1500);
    }
  }

  speakText(text, voice) {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer.src = '';
    }
    clearTimeout(this.speakingWatchdog);
    if (voice) this.currentVoice = voice;
    this.speechQueue = [];
    this.queueSpeechChunk(text);
  }

  selectPersona(persona) {
    this.persona = persona;
    document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`persona-${persona}`);
    if (activeBtn) activeBtn.classList.add('active');

    const advisorName = persona === 'raghav' ? 'Raghav Sharma' : 'Riya';
    this.heroAdvisorName.textContent = this.isInCall ? `🟢 Connected Live with ${advisorName}` : `Live Voice Call with ${advisorName}`;

    this.currentVoice = persona === 'raghav' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural';
    const greeting = this.getRandomGreeting(persona);

    if (persona === 'raghav') {
      this.initialSenderTag.textContent = "RAGHAV SHARMA (Gurgaon Prime Realty)";
    } else {
      this.initialSenderTag.textContent = "RIYA (Senior Relationship Manager)";
    }
    this.initialMsgBody.textContent = greeting;
    this.initialReplayBtn.dataset.text = greeting;

    if (this.isInCall) {
      this.addMessage(persona, greeting);
      this.speakText(greeting, this.currentVoice);
    }
  }

  addMessage(role, text, isLive = false) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const senderName = role === 'user' ? 'You' : (this.persona === 'raghav' ? 'RAGHAV SHARMA (Gurgaon Prime Realty)' : 'RIYA (Relationship Manager)');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const safeText = (typeof text === 'string') ? text.replace(/"/g, '&quot;') : '';

    msg.innerHTML = `
      <div class="msg-header">
        <span class="msg-sender">${senderName}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-body">${text}</div>
      ${role === 'assistant' ? `<button class="replay-btn" data-text="${safeText}">🔊 Hear Voice</button>` : ''}
    `;

    this.transcriptContainer.appendChild(msg);
    this.transcriptContainer.scrollTop = this.transcriptContainer.scrollHeight;
    return msg;
  }

  bindEvents() {
    // Hero Call Toggle Button (Primary CTA)
    this.heroCallBtn.addEventListener('click', () => {
      if (this.isInCall) this.endCall();
      else this.startCall();
    });

    // Orb Tap Trigger
    this.orbTriggerZone.addEventListener('click', () => {
      if (!this.isInCall) this.startCall();
      else if (this.isSpeaking) this.interrupt();
    });

    // End Call button in action bar
    this.endCallBtn.addEventListener('click', () => this.endCall());

    // Mic Button in action bar
    this.micBtn.addEventListener('click', async () => {
      if (!this.isInCall) {
        await this.startCall();
      } else if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    // Done Speaking button (Manual Submit trigger)
    this.doneSpeakingBtn.addEventListener('click', () => {
      if (this.isListening) {
        this.stopListening();
      }
    });

    // Push-to-Talk (Hold to speak fallback)
    const startPTT = async () => {
      if (!this.isInCall) await this.startCall();
      this.startListening();
      this.pttBtn.classList.add('holding');
    };
    const stopPTT = () => {
      this.pttBtn.classList.remove('holding');
      setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
        }
      }, 250);
    };

    this.pttBtn.addEventListener('mousedown', startPTT);
    this.pttBtn.addEventListener('mouseup', stopPTT);
    this.pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startPTT(); });
    this.pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopPTT(); });

    // Interrupt AI Button
    this.interruptBtn.addEventListener('click', () => this.interrupt());

    // Direct Speaker Voice Samples (Plays single stream)
    this.testRaghavBtn.addEventListener('click', () => {
      this.selectPersona('raghav');
      const testText = this.getRandomGreeting('raghav');
      this.speakText(testText, 'hi-IN-MadhurNeural');
    });

    this.testRiyaBtn.addEventListener('click', () => {
      this.selectPersona('riya');
      const testText = this.getRandomGreeting('riya');
      this.speakText(testText, 'hi-IN-SwaraNeural');
    });

    // Persona buttons in grid
    document.querySelectorAll('.persona-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const persona = e.currentTarget.dataset.persona;
        this.selectPersona(persona);
      });
    });

    // Quick Voice Query Chips
    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', async (e) => {
        const query = e.currentTarget.dataset.query;
        if (query) {
          if (!this.isInCall) {
            this.isInCall = true;
            this.callHeroBar.classList.add('active');
            this.heroBtnText.textContent = "🔴 END CALL (कॉल समाप्त करें)";
            this.heroCallBtn.classList.remove('start');
            this.heroCallBtn.classList.add('end');
            this.endCallBtn.style.display = 'inline-flex';
            await this.initMicAudio();
          }
          this.handleUserSpeech(query);
        }
      });
    });

    // Pitch strategy
    this.pitchDepthSelect.addEventListener('change', (e) => {
      this.scriptDepth = e.target.value;
    });

    // Duplex switch
    this.duplexToggle.addEventListener('change', (e) => {
      this.continuousDuplex = e.target.checked;
    });

    // Clear transcript
    this.clearBtn.addEventListener('click', () => {
      this.transcriptContainer.innerHTML = '';
      this.conversationHistory = [];
    });

    // Collapsible Text Form
    this.textForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.textInput.value.trim();
      if (!val) return;
      this.textInput.value = '';
      this.handleUserSpeech(val);
    });

    // Replay buttons in transcript
    this.transcriptContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('replay-btn')) {
        const text = e.target.dataset.text;
        if (text) this.speakText(text, this.currentVoice);
      }
    });

    // AI Brain Modal Events
    this.openAiModalBtn.addEventListener('click', () => {
      this.aiModal.classList.add('open');
    });

    this.closeAiModalBtn.addEventListener('click', () => {
      this.aiModal.classList.remove('open');
    });

    this.cancelAiBtn.addEventListener('click', () => {
      this.aiModal.classList.remove('open');
    });

    this.saveAiKeysBtn.addEventListener('click', async () => {
      const groq = this.groqKeyInput.value.trim();
      const gemini = this.geminiKeyInput.value.trim();
      
      this.groqKey = groq;
      this.geminiKey = gemini;
      
      localStorage.setItem('gurgaon_groq_key', groq);
      localStorage.setItem('gurgaon_gemini_key', gemini);

      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groqKey: groq, geminiKey: gemini })
        });
      } catch (e) {}

      if (groq) this.aiActiveBadge.textContent = '⚡ Groq 70B (Free)';
      else if (gemini) this.aiActiveBadge.textContent = '🌐 Gemini Flash (Free)';
      else this.aiActiveBadge.textContent = '💻 Local Ollama (Free)';

      this.aiModal.classList.remove('open');
      alert("✅ AI Settings Saved! Your agent is primed with zero-hallucination intelligence.");
    });

    // Script Playbook Modal Events
    this.openScriptModalBtn.addEventListener('click', () => {
      this.scriptModal.classList.add('open');
    });

    this.closeScriptModalBtn.addEventListener('click', () => {
      this.scriptModal.classList.remove('open');
    });

    this.loadDefaultScriptBtn.addEventListener('click', async () => {
      await this.initScriptStudio();
      alert("✅ Gurgaon Master Playbook Loaded!");
    });

    this.saveScriptBtn.addEventListener('click', () => {
      this.customScript = this.scriptTextarea.value.trim();
      this.updateScriptStats(this.customScript);
      this.scriptActiveTag.textContent = this.customScript ? "Custom Script" : "Master Loaded";
      this.scriptModal.classList.remove('open');
      alert(`✅ Script successfully synced to ${this.persona === 'raghav' ? 'Raghav' : 'Riya'}!`);
    });

    this.clearScriptBtn.addEventListener('click', () => {
      this.scriptTextarea.value = '';
      this.customScript = '';
      this.updateScriptStats('');
    });

    this.scriptFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        this.scriptTextarea.value = event.target.result;
        this.updateScriptStats(event.target.result);
      };
      reader.readAsText(file);
    });
  }

  // Animation Loop: Updates 3D Glowing Orb & REAL-TIME AUDIO-ENERGY VAD
  animate() {
    requestAnimationFrame(() => this.animate());

    let micLevel = 0;
    if (this.analyser && this.isListening && !this.isSpeaking && !this.isThinking) {
      this.analyser.getByteFrequencyData(this.audioData);
      let sum = 0;
      for (let i = 0; i < this.audioData.length; i++) {
        sum += this.audioData[i];
      }
      micLevel = (sum / this.audioData.length) / 255;

      // Real-time VU meter updates
      const pct = Math.min(100, Math.round(micLevel * 250));
      this.micBarFill.style.width = pct + '%';
      this.micLevelText.textContent = `Input Level: ${pct}%`;

      // HARDWARE AUDIO-ENERGY VAD (Works in Brave Browser, Chrome, Safari, Firefox!)
      if (pct > 13) {
        // User is speaking!
        if (!this.userIsSpeakingAudio) {
          this.userIsSpeakingAudio = true;
          this.audioSpeechStartTime = Date.now();
          this.micStatusBadge.textContent = "🎙️ Sound Detected (Speaking...)";
          this.micStatusBadge.style.color = "#10b981";
          this.liveText.innerHTML = "🎙️ <em>(Hearing your voice... Speak your question)</em>";
        }
        // User is still speaking: clear the silence timer
        if (this.audioSilenceTimer) {
          clearTimeout(this.audioSilenceTimer);
          this.audioSilenceTimer = null;
        }
      } else if (this.userIsSpeakingAudio) {
        // User was speaking, now paused!
        this.micStatusBadge.textContent = "⏳ Pause Detected (Finalizing...)";
        this.micStatusBadge.style.color = "#ffb703";

        if (!this.audioSilenceTimer) {
          // 1.8 seconds of natural conversational silence detected -> finalize speech!
          this.audioSilenceTimer = setTimeout(() => {
            const speechDuration = Date.now() - this.audioSpeechStartTime;
            console.log(`VAD: Silence detected after ${speechDuration}ms of speech`);
            this.userIsSpeakingAudio = false;
            this.audioSilenceTimer = null;

            if (speechDuration < 650) {
              // Too short (noise pop, click, or tap), resume listening
              console.log('VAD: Speech burst too short, resuming listening...');
              return;
            }
            this.stopListening();
          }, 1800);
        }
      } else {
        this.micStatusBadge.textContent = "🎤 Mic Ready (Speak Now)";
        this.micStatusBadge.style.color = "#ffb703";
      }
    }

    const cw = this.orbCanvas.width;
    const ch = this.orbCanvas.height;
    const ctx = this.orbCtx;
    ctx.clearRect(0, 0, cw, ch);

    this.orbPhase += 0.035;

    const centerX = cw / 2;
    const centerY = ch / 2;
    let radius = this.orbRadius;

    if (this.isSpeaking) {
      radius += Math.sin(this.orbPhase * 3) * 16;
    } else if (this.isListening) {
      radius += micLevel * 50;
    } else if (this.isThinking) {
      radius += Math.sin(this.orbPhase * 4) * 8;
    }

    // Outer Glow
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.8);
    if (this.persona === 'raghav') {
      if (this.isListening) {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
        gradient.addColorStop(0.5, 'rgba(5, 150, 105, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 183, 3, 0.9)');
        gradient.addColorStop(0.5, 'rgba(251, 133, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
    } else {
      if (this.isListening) {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
        gradient.addColorStop(0.5, 'rgba(5, 150, 105, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(0, 242, 254, 0.9)');
        gradient.addColorStop(0.5, 'rgba(79, 172, 254, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Inner Core
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.persona === 'raghav' 
      ? (this.isListening ? '#10b981' : '#ffb703') 
      : (this.isListening ? '#10b981' : '#00f2fe');
    ctx.shadowBlur = 45;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Waveform Canvas
    const ww = this.waveformCanvas.width;
    const wh = this.waveformCanvas.height;
    const wctx = this.waveCtx;
    wctx.clearRect(0, 0, ww, wh);

    wctx.lineWidth = 2.5;
    wctx.strokeStyle = this.persona === 'raghav' ? '#ffb703' : '#00f2fe';
    if (this.isListening) wctx.strokeStyle = '#10b981';
    wctx.beginPath();

    const sliceWidth = ww / 64;
    let x = 0;

    for (let i = 0; i < 64; i++) {
      let v = 0.5;
      if (this.isSpeaking) {
        v = 0.5 + Math.sin(this.orbPhase * 2 + i * 0.3) * 0.38;
      } else if (this.isListening && this.analyser) {
        v = (this.audioData[i] / 255);
      } else {
        v = 0.5 + Math.sin(this.orbPhase + i * 0.2) * 0.08;
      }

      const y = v * wh;
      if (i === 0) wctx.moveTo(x, y);
      else wctx.lineTo(x, y);
      x += sliceWidth;
    }

    wctx.stroke();
  }
}

// Instantiate on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.awaazAgent = new GurgaonRealtyAgent();
});
