import { SlashCommandBuilder } from "discord.js";
import {
  MAX_MESSAGE_LENGTH,
  formatTranscript,
  getSavedSessions,
  sessionLabel,
} from "../scribe/sessions";
import { askChatGPT } from "../scribe/chat";

const INSTRUCTIONS =
  "You write short recaps of our D&D sessions so players can remember where they left off. " +
  "Use only the transcript you are given. " +
  "Write 3 to 5 bullet points: what happened, the important characters and places, " +
  "and where the party ended up. Keep it under 150 words. " +
  "The transcript comes from speech recognition and may contain lines nobody really said, " +
  "like 'Bye.' or 'Thanks for watching!'. Ignore lines that don't fit the conversation.";

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
    const label = sessionLabel(session, index);

    // ChatGPT can take longer than the 3 seconds Discord gives us to reply.
    await interaction.deferReply();

    try {
      const recap = await ask(INSTRUCTIONS, formatTranscript(session.lines));
      const message = `📜 **Recap of ${label}**\n${recap}`;
      return interaction.editReply(message.slice(0, MAX_MESSAGE_LENGTH));
    } catch (error) {
      console.error("/recap failed:", error);
      return interaction.editReply("❌ I couldn't make a recap right now. Try again in a bit.");
    }
  },
};

export default command;