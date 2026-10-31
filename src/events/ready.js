import { ChannelType, EmbedBuilder } from "discord.js";
import commands from "../commands";

const CHANNEL_NAME = process.env.CHANNEL_NAME;

const event = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`
    ############################################################
    #  Logged in as ${client.user.username}!
    #  Serving ${client.guilds.cache.size} servers.
    #  Serving ${client.users.cache.size} users.
    ############################################################
  `);

    // Tell Discord about our slash commands so they show up in each server.
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(commands.map((command) => command.data.toJSON()));
    }

    for (const guild of client.guilds.cache.values()) {
    if (!CHANNEL_NAME) {
      console.error("CHANNEL_NAME is not configured in the environment.");
      break;
    }

    await guild.channels.fetch();
    const channel = guild.channels.cache.find(
      (guildChannel) =>
        guildChannel.name === CHANNEL_NAME &&
        guildChannel.type === ChannelType.GuildText
    );

    if (channel) {
      const scribeStatus = new EmbedBuilder()
        .setTitle("D&D Session Scribe Online")
        .setDescription(
          "The chronicle is open. I am ready to record the party's adventures."
        )
        .setColor(0x5b21b6);

      const plannedCommands = new EmbedBuilder()
        .setTitle("Planned Session Scribe Commands")
        .setDescription(
          "These commands will be added in future updates. They are not currently available."
        )
        .addFields(
          {
            name: "Recording",
            value:
              "`/start-recording` - Begin recording a session\n" +
              "`/end-recording` - End and archive the current recording\n" +
              "`/pause-recording` - Pause the active recording\n" +
              "`/resume-recording` - Resume a paused recording",
          },
          {
            name: "Questions and Recaps",
            value:
              "`/ask` - Ask about the current or a previous session\n" +
              "`/summary` - Summarize the current or selected session\n" +
              "`/recap` - Get a quick recap before continuing\n" +
              "`/search` - Find people, places, events, or quotes in session history",
          },
          {
            name: "Session Management",
            value:
              "`/sessions` - List recorded sessions\n" +
              "`/session` - View details for a selected session\n" +
              "`/session-date` - Set or view the date of a session\n" +
              "`/export` - Export a session transcript or summary",
          },
          {
            name: "Campaign Helpers",
            value:
              "`/notes` - Add a campaign or session note\n" +
              "`/characters` - List known characters and their details\n" +
              "`/places` - List locations mentioned in the campaign\n" +
              "`/timeline` - View important campaign events in order",
          },
          {
            name: "Utility",
            value:
              "`/status` - Show recording and session status\n" +
              "`/help` - Show the available Scribe commands\n" +
              "`/settings` - Configure campaign and recording preferences",
          }
        )
        .setColor(0x7c3aed);

      try {
        await channel.send({ embeds: [scribeStatus, plannedCommands] });
        console.log(
          `Sent D&D Session Scribe status and command list to #${channel.name} in ${guild.name}.`
        );
      } catch (error) {
        console.error(
          `Could not send the ready message to #${channel.name}:`,
          error
        );
      }
    } else {
      console.error(
        `Could not find a text channel named "${CHANNEL_NAME}" in ${guild.name}.`
      );
    }
  }
  },
};

export default event;