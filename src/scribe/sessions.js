import fs from "fs";
import path from "path";

// Recording sessions are kept in memory, one per server (guild).
const sessions = new Map();

export function startSession(guildId) {
  sessions.set(guildId, { startedAt: Date.now(), lines: [] });
}

export function getSession(guildId) {
  return sessions.get(guildId);
}

export function endSession(guildId) {
  sessions.delete(guildId);
}

export function addLine(guildId, speaker, text) {
  // A clip can finish transcribing just after the session ended.
  getSession(guildId)?.lines.push({ speaker, text });
}

// The most characters Discord allows in one message.
export const MAX_MESSAGE_LENGTH = 2000;

// Turns lines into text, like "Leo: I open the door."
export function formatTranscript(lines) {
  return lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");
}

// A name for a saved session, like "Session 1 (Fri Nov 06 2026)".
// index is the session's place in the list from getSavedSessions, starting at 0.
export function sessionLabel(session, index) {
  return `Session ${index + 1} (${new Date(session.startedAt).toDateString()})`;
}

// Whole minutes that have passed since startedAt.
export function minutesSince(startedAt, now = Date.now()) {
  return Math.floor((now - startedAt) / 60000);
}

// Reads the sessions /end-recording saved for this server, oldest first.
// Files are named "<serverId>-<startedAt>.json".
export function getSavedSessions(guildId, folder = "data") {
  if (!fs.existsSync(folder)) return [];

  return fs
    .readdirSync(folder)
    .filter((file) => file.startsWith(`${guildId}-`))
    .map((file) => JSON.parse(fs.readFileSync(path.join(folder, file), "utf8")))
    .sort((a, b) => a.startedAt - b.startedAt);
}
