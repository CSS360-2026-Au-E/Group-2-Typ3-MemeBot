import commands from "../commands";

const event = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find(
      (command) => command.data.name === interaction.commandName
    );
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      // Log instead of crashing the whole bot when one command fails.
      console.error(`/${interaction.commandName} failed:`, error);
    }
  },
};

export default event;
