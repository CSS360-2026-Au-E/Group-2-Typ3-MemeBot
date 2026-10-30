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
