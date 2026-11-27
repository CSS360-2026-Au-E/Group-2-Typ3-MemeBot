import { ChannelType, EmbedBuilder } from "discord.js";
import commands from "../commands";

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

    const channelName = process.env.CHANNEL_NAME;
    if (!channelName) {
      console.error("CHANNEL_NAME is not configured in the environment.");
      return;
    }

    const embeds = [onlineMessage(), commandList()];

    for (const guild of client.guilds.cache.values()) {
      await guild.channels.fetch();
      const channel = guild.channels.cache.find(
        (guildChannel) =>
          guildChannel.name === channelName && guildChannel.type === ChannelType.GuildText
      );

      if (!channel) {
        console.error(`Could not find a text channel named "${channelName}" in ${guild.name}.`);
        continue;
      }

      try {
        await channel.send({ embeds });
        console.log(
          `Sent D&D Session Scribe status and command list to #${channel.name} in ${guild.name}.`
        );
      } catch (error) {
        console.error(`Could not send the ready message to #${channel.name}:`, error);
      }
    }
  },
};

function onlineMessage() {
  return new EmbedBuilder()
    .setTitle("D&D Session Scribe Online")
    .setDescription("The chronicle is open. I am ready to record the party's adventures.")
    .setColor(0x5b21b6);
}

// Built from the real command list, so it always shows what the bot can do.
function commandList() {
  const lines = commands.map(
    (command) => `\`/${command.data.name}\` - ${command.data.description}`
  );

  return new EmbedBuilder()
    .setTitle("Session Scribe Commands")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Paste a YouTube link while you're in voice chat to play music." })
    .setColor(0x7c3aed);
}

export default event;