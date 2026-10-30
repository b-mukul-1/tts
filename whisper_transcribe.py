import sys
import os
import json
from faster_whisper import WhisperModel

_model = None

def get_model():
    global _model
    if _model is None:
        _model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _model

def transcribe_file(audio_path, language=None):
    if not os.path.exists(audio_path):
        return ""
    try:
        model = get_model()
        segments, info = model.transcribe(audio_path, language=language, beam_size=1)
        text = " ".join([s.text for s in segments]).strip()
        return text
    except Exception as e:
        sys.stderr.write(f"Whisper transcribe error: {e}\n")
        return ""

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"text": ""}))
        sys.exit(0)
    
    audio_path = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "auto" else None
    result = transcribe_file(audio_path, language=lang)
    print(json.dumps({"text": result}))
