import { SlashCommandBuilder } from "discord.js";
import { formatTranscript, getSavedSessions, getSession } from "../scribe/sessions";
import { askChatGPT } from "../scribe/chat";

const INSTRUCTIONS =
  "You answer questions about our D&D sessions using only the transcripts you are given. " +
  "Sessions are in order, oldest first. " +
  "If the answer isn't in the transcripts, say you don't know. Keep the answer short. " +
  "The transcripts come from speech recognition and may contain lines nobody really said, " +
  "like 'Bye.' or 'Thanks for watching!'. Ignore lines that don't fit the conversation.";

const command = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask a question about the current or previous sessions")
    .addStringOption((option) =>
      option.setName("question").setDescription("What do you want to know?").setRequired(true)
    ),
  async execute(interaction, ask = askChatGPT) {
    const serverId = interaction.guild.id;
    const question = interaction.options.getString("question");
    const sessions = getLabeledSessions(serverId).filter((session) => session.lines.length > 0);

    if (sessions.length === 0) {
      return interaction.reply("Nothing has been transcribed yet.");
    }

    const transcripts = sessions
      .map((session) => `${session.label}:\n${formatTranscript(session.lines)}`)
      .join("\n\n");

    // ChatGPT can take longer than the 3 seconds Discord gives us to reply.
    await interaction.deferReply();
    const answer = await ask(INSTRUCTIONS, `${transcripts}\n\nQuestion: ${question}`);
    return interaction.editReply(answer.slice(0, 2000)); // Discord's message limit
  },
};

// Every session on this server with a label like "Session 1 (Fri Nov 06 2026)", oldest first.
function getLabeledSessions(serverId) {
  const saved = getSavedSessions(serverId);
  const labeled = saved.map((session, index) => ({
    label: `Session ${index + 1} (${new Date(session.startedAt).toDateString()})`,
    lines: session.lines,
  }));

  // After /end-recording the current session is saved too, so only add it if it isn't.
  const current = getSession(serverId);
  if (current && !saved.some((session) => session.startedAt === current.startedAt)) {
    labeled.push({ label: "Current session", lines: current.lines });
  }

  return labeled;
}

export default command;
