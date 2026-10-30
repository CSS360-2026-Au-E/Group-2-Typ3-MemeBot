const recordings = new Map();

const event = {
  name: "messageCreate",
  async execute(message) {
    console.log("Got message:", message.content);

    if (message.author.bot) return;

    const serverId = message.guild.id;

    if (message.content === "!start-recording") {
      if (recordings.has(serverId)) {
        return message.reply("A session is already being recorded.");
      }
      recordings.set(serverId, Date.now());
      return message.reply("🎙️ Recording started! The scribe is listening.");
    }

    if (message.content === "!end-recording") {
      if (!recordings.has(serverId)) {
        return message.reply("No session is being recorded.");
      }
      const minutes = Math.floor((Date.now() - recordings.get(serverId)) / 60000);
      recordings.delete(serverId);
      return message.reply(`📜 Recording ended. Session length: ${minutes} minutes.`);
    }
  },
};

export default event;