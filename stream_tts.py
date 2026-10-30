import sys
import os
import re
import asyncio
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
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'[*_#`~\[\]<>]', ' ', text)
    text = re.sub(r'🔊|🏢|👧|👨‍💻|👑|🛣️|⛳|📈|🛡️|⚡|💾|📁|Pro Tip:', ' ', text)
    
    for pattern, rep in PHONETIC_REPLACEMENTS:
        text = re.sub(pattern, rep, text, flags=re.IGNORECASE)
    
    text = re.sub(r'(नमस्ते सर[!।]?|हाँजी सर[!।]?|बिलकुल सर[!।]?)', r'\1... ', text)
    text = re.sub(r'([।!?])\s*', r'\1... ', text)
    text = re.sub(r',\s*', r', ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def stream_audio(text, voice="hi-IN-MadhurNeural"):
    clean = clean_speech_text(text)
    if not clean or len(clean) < 2:
        return
    
    rate = "-2%" if "Madhur" in voice else "+1%"
    try:
        communicate = edge_tts.Communicate(clean, voice, rate=rate)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                sys.stdout.buffer.write(chunk["data"])
                sys.stdout.buffer.flush()
    except Exception as e:
        sys.stderr.write(f"Stream error: {e}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    text = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else "hi-IN-MadhurNeural"
    asyncio.run(stream_audio(text, voice))
