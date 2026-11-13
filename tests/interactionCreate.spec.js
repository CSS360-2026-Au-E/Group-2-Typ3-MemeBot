import { expect } from "chai";
import interactionCreate from "../src/events/interactionCreate";
import commands from "../src/commands";
import { captureConsole } from "./helpers/captureConsole";

const fakeInteraction = ({ commandName, isCommand = true }) => {
  const interaction = {
    commandName,
    isChatInputCommand: () => isCommand,
    guild: { id: "guild-1" },
    replies: [],
    reply: async (message) => interaction.replies.push(message),
  };
  return interaction;
};

describe("interactionCreate", () => {
  it("runs the slash command with the matching name", async () => {
    const interaction = fakeInteraction({ commandName: "end-recording" });

    await interactionCreate.execute(interaction);

    expect(interaction.replies).to.deep.equal(["No session is being recorded."]);
  });

  it("ignores interactions that are not slash commands", async () => {
    const interaction = fakeInteraction({
      commandName: "end-recording",
      isCommand: false,
    });

    await interactionCreate.execute(interaction);

    expect(interaction.replies).to.deep.equal([]);
  });

  it("ignores a slash command the bot doesn't have", async () => {
    const interaction = fakeInteraction({ commandName: "dance" });

    await interactionCreate.execute(interaction);

    expect(interaction.replies).to.deep.equal([]);
  });

  it("keeps the bot running when a command throws", async () => {
    const status = commands.find((command) => command.data.name === "status");
    const realExecute = status.execute;
    status.execute = async () => {
      throw new Error("Discord hiccup");
    };

    let logged;
    try {
      // If the error escaped, this await would throw and fail the test.
      logged = await captureConsole(() =>
        interactionCreate.execute(fakeInteraction({ commandName: "status" }))
      );
    } finally {
      status.execute = realExecute;
    }

    expect(logged.error[0]).to.include("/status failed:");
    expect(logged.error[0]).to.include("Discord hiccup");
  });
});
