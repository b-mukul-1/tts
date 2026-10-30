import os
import tempfile
import base64
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn

app = FastAPI(title="Local Whisper STT Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

print("Loading Faster-Whisper model into memory...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
print("Faster-Whisper in-memory model ready on port 3001!")

@app.get("/health")
def health():
    return {"status": "ready"}

@app.post("/transcribe")
async def transcribe(request: Request):
    content = await request.body()
    if not content:
        return {"text": ""}

    # Check if JSON with base64 or raw binary
    if content.startswith(b"{") and b"audioBase64" in content:
        import json
        try:
            data = json.loads(content.decode("utf-8"))
            content = base64.b64decode(data.get("audioBase64", ""))
        except:
            pass

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(tmp_path, language=None, beam_size=1)
        text = " ".join([s.text for s in segments]).strip()
        print(f"Transcribed ({info.language}, {len(content)} bytes): {text}")
        return {"text": text, "language": info.language}
    except Exception as e:
        print(f"Transcription error: {e}")
        return {"text": "", "error": str(e)}
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3001, log_level="warning")
