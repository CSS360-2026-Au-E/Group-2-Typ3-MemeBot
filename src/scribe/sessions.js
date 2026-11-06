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

export function addLine(guildId, speaker, text) {
  getSession(guildId).lines.push({ speaker, text });
}

// Turns lines into text, like "Leo: I open the door."
export function formatTranscript(lines) {
  return lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");
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
