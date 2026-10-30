import sys
import os
import re
import asyncio
import base64
import tempfile
import edge_tts

PHONETIC_REPLACEMENTS = [
    (r"\bDLF\b", "डी एल एफ"),
    (r"\bDXP\b", "डी एक्स पी"),
    (r"\bM3M\b", "एम थ्री एम"),
    (r"\bSPR\b", "एस पी आर"),
    (r"\bNH-?8\b", "नेशनल हाईवे आठ"),
    (r"\b3BHK\b", "थ्री बी एच के"),
    (r"\b4BHK\b", "फोर बी एच के"),
    (r"\b2BHK\b", "टू बी एच के"),
    (r"\b5BHK\b", "फाइव बी एच के"),
    (r"\bBHK\b", "बी एच के"),
    (r"\bCamellias\b", "कैमेलियास"),
    (r"\bMagnolias\b", "मैग्नोलियास"),
    (r"\bAralias\b", "अरालियास"),
    (r"\bCrest\b", "क्रेस्ट"),
    (r"\bGolfestate\b", "गोल्फ एस्टेट"),
    (r"\bGolf Course Road\b", "गोल्फ कोर्स रोड"),
    (r"\bDwarka Expressway\b", "द्वारका एक्सप्रेसवे"),
    (r"\bSobha\b", "शोभा"),
    (r"\bSmart World\b", "स्मार्ट वर्ल्ड"),
    (r"\bKrisumi\b", "क्रिसुमी"),
    (r"\bCr\b|\bcrore\b", "करोड़"),
    (r"\bsq\.?ft\.?\b", "स्क्वेयर फीट"),
    (r"\bpercent\b", "प्रतिशत"),
    (r"\bCAGR\b", "सी ए जी आर"),
    (r"\bRERA\b", "रेरा"),
    (r"\bCyber Hub\b", "साइबर हब"),
    (r"\bHorizon Centre\b", "होराइजन सेंटर")
]

def clean_speech_text(text):
    # STRIP ANY XML TAGS completely so it NEVER speaks "200 ms" or "break time"!
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'[*_#`~\[\]<>]', ' ', text)
    text = re.sub(r'🔊|🏢|👧|👨‍💻|👑|🛣️|⛳|📈|🛡️|⚡|💾|📁|Pro Tip:', ' ', text)
    
    # Apply Indian phonetic transliterations
    for pattern, rep in PHONETIC_REPLACEMENTS:
        text = re.sub(pattern, rep, text, flags=re.IGNORECASE)
    
    # Natural human respiratory pauses using punctuation
    text = re.sub(r'(नमस्ते सर[!।]?|हाँजी सर[!।]?|बिलकुल सर[!।]?)', r'\1... ', text)
    text = re.sub(r'([।!?])\s*', r'\1... ', text)
    text = re.sub(r',\s*', r', ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def generate(text, voice="hi-IN-MadhurNeural"):
    clean = clean_speech_text(text)
    if not clean or len(clean) < 2:
        return b""
    
    rate = "-2%" if "Madhur" in voice else "+1%"
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        tmp_path = f.name
    try:
        communicate = edge_tts.Communicate(clean, voice, rate=rate)
        await communicate.save(tmp_path)
        with open(tmp_path, "rb") as f:
            audio_data = f.read()
        return audio_data
    except Exception as e:
        sys.stderr.write(f"EdgeTTS Error: {e}\n")
        return b""
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    text = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else "hi-IN-MadhurNeural"
    audio = asyncio.run(generate(text, voice))
    if audio:
        sys.stdout.write(base64.b64encode(audio).decode("utf-8"))
