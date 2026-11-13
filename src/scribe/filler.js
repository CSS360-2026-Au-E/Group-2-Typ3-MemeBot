// Whisper learned from YouTube subtitles, so when it hears a cough or background
// noise it often "hears" a video sign-off instead. These are the usual ones.
const WHISPER_FILLER = new Set([
  "you",
  "bye",
  "bye bye",
  "thank you",
  "thank you so much",
  "thank you very much",
  "thanks for watching",
  "thank you for watching",
  "thanks for watching and see you next time",
  "please subscribe",
  "like and subscribe",
  "subtitles by the amaraorg community",
]);

// True when the whole line is one of Whisper's made-up phrases.
// "Thank you, innkeeper." is kept because it says more than the filler does.
export function isWhisperFiller(text) {
  const plain = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // drop punctuation like "." and "!"
    .replace(/\s+/g, " ")
    .trim();
  return WHISPER_FILLER.has(plain);
}
