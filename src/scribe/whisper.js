const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

// Tells Whisper what kind of talking to expect, so it spells game words better.
const WHISPER_PROMPT = "Players talking during a Dungeons & Dragons game.";

// Whisper rates each piece of text it returns. When it hears noise instead of speech
// (a cough, a keyboard), it makes up words like "Bye." but marks them as unsure.
// These are the same limits OpenAI's own Whisper uses to skip silence.
const NO_SPEECH_LIMIT = 0.6; // chance the piece was not speech at all
const LOW_CONFIDENCE_LIMIT = -1; // how sure Whisper was of the words (0 = certain)
const REPEATING_TEXT_LIMIT = 2.4; // high when Whisper got stuck repeating itself

// Sends a clip of speech to OpenAI's Whisper and returns what was said.
export async function transcribe(audio) {
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new Blob([toWav(audio)]), "clip.wav");
  form.append("response_format", "verbose_json"); // includes how sure Whisper was
  form.append("temperature", "0"); // always pick the most likely words, no guessing
  form.append("language", "en");
  form.append("prompt", WHISPER_PROMPT);

  const response = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Whisper failed: ${await response.text()}`);
  }

  const result = await response.json();
  if (!result.segments) return result.text;

  // Keep only the pieces Whisper is fairly sure were real speech.
  return result.segments
    .filter(isLikelySpeech)
    .map((segment) => segment.text.trim())
    .join(" ");
}

export function isLikelySpeech(segment) {
  const probablyNoise =
    segment.no_speech_prob > NO_SPEECH_LIMIT && segment.avg_logprob < LOW_CONFIDENCE_LIMIT;
  const repeating = segment.compression_ratio > REPEATING_TEXT_LIMIT;
  return !probablyNoise && !repeating;
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
