import os, sys, json, base64, urllib.request, wave
voice, out = sys.argv[1], sys.argv[2]
text = open(sys.argv[3]).read().strip()
body = {"contents":[{"parts":[{"text":text}]}],
 "generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":voice}}}}}
req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
  data=json.dumps(body).encode(), headers={"Content-Type":"application/json","x-goog-api-key":os.environ["GEMINI_API_KEY"]})
try:
  r = json.load(urllib.request.urlopen(req, timeout=120))
except urllib.error.HTTPError as e:
  print(e.code, e.read().decode()[:800]); sys.exit(1)
pcm = base64.b64decode(r["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
with wave.open(out,"wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
print(out, len(pcm)/48000, "s")
