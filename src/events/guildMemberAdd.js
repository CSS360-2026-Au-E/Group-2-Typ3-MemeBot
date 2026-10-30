import { ChannelType, EmbedBuilder, userMention } from "discord.js";

const CHANNEL_NAME = process.env.CHANNEL_NAME;

const event = {
  name: "guildMemberAdd",
  async execute(member) {
    await member.guild.channels.fetch();
    const channel = member.guild.channels.cache.find(
      (guildChannel) =>
        guildChannel.name === CHANNEL_NAME &&
        guildChannel.type === ChannelType.GuildText
    );

    if (channel) {
      await channel.send(getWelcomeMessage(member.id));
    } else {
      console.error(
        `Could not find a text channel named "${CHANNEL_NAME}" in ${member.guild.name}.`
      );
    }
  },
};

const getWelcomeMessage = (userId) => {
  const welcomeEmbed = new EmbedBuilder()
    .setTitle("Welcome to the Adventuring Party")
    .setDescription(
      `Welcome ${userMention(userId)}! This server's session scribe will help preserve our story, characters, and heroic moments.`
    )
    .addFields(
      { name: "First step", value: "Introduce your adventurer and meet the party." },
      { name: "During sessions", value: "Follow the session channel and stay ready for the next chapter." }
    )
    .setColor(0x5b21b6);

  return {
    embeds: [welcomeEmbed],
  };
};

export default event;
