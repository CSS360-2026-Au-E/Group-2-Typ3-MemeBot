import { SlashCommandBuilder } from "discord.js";
import { formatTranscript, getSavedSessions } from "../scribe/sessions";
import { askChatGPT } from "../scribe/chat";

const INSTRUCTIONS =
  "You write short recaps of our D&D sessions so players can remember where they left off. " +
  "Use only the transcript you are given. " +
  "Write 3 to 5 bullet points: what happened, the important characters and places, " +
  "and where the party ended up. Keep it under 150 words.";

const command = {
  data: new SlashCommandBuilder()
    .setName("recap")
    .setDescription("Get a short recap of the last session"),
  async execute(interaction, ask = askChatGPT, loadSessions = getSavedSessions) {
    const serverId = interaction.guild.id;
    const saved = loadSessions(serverId);

    // The most recent session that has something in it.
    const index = saved.findLastIndex((session) => session.lines.length > 0);
    if (index === -1) {
      return interaction.reply("There's no past session to recap yet.");
    }

    const session = saved[index];
    const label = `Session ${index + 1} (${new Date(session.startedAt).toDateString()})`;

    // ChatGPT can take longer than the 3 seconds Discord gives us to reply.
    await interaction.deferReply();

    try {
      const recap = await ask(INSTRUCTIONS, formatTranscript(session.lines));
      const message = `📜 **Recap of ${label}**\n${recap}`;
      return interaction.editReply(message.slice(0, 2000)); // Discord's message limit
    } catch (error) {
      console.error("/recap failed:", error);
      return interaction.editReply("❌ I couldn't make a recap right now. Try again in a bit.");
    }
  },
};

export default command;