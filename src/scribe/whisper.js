const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

// Sends a clip of speech to OpenAI's Whisper and returns what was said.
export async function transcribe(audio) {
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new Blob([toWav(audio)]), "clip.wav");

  const response = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Whisper failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.text;
}

// The audio is raw sound (48,000 samples per second, mono, 2 bytes each).
// Whisper needs an audio file, so we put a WAV header in front of it.
function toWav(audio) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + audio.length, 4); // file size after this field
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // size of the format section
  header.writeUInt16LE(1, 20); // format: plain PCM
  header.writeUInt16LE(1, 22); // channels: mono
  header.writeUInt32LE(48000, 24); // samples per second
  header.writeUInt32LE(48000 * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per sample
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(audio.length, 40); // size of the sound data
  return Buffer.concat([header, audio]);
}
