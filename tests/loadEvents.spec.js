import fs from "fs";
import os from "os";
import path from "path";
import { expect } from "chai";
import loadEvents from "../src/helpers/loadEvents";
import { captureConsole } from "./helpers/captureConsole";

const EVENTS_FOLDER = path.join(process.cwd(), "src", "events");

// A pretend Discord client that remembers how each event was hooked up.
const fakeClient = () => {
  const client = {
    events: new Map(),
    onceEvents: [],
    everyTimeEvents: [],
    once: (name) => client.onceEvents.push(name),
    on: (name) => client.everyTimeEvents.push(name),
  };
  return client;
};

describe("loadEvents", () => {
  it("registers every event file under its event name", async () => {
    const client = fakeClient();

    await captureConsole(() => loadEvents(client, EVENTS_FOLDER));

    expect([...client.events.keys()]).to.have.members([
      "ready",
      "interactionCreate",
      "messageCreate",
      "guildMemberAdd",
    ]);
  });

  it("listens for one-time events once and the rest every time", async () => {
    const client = fakeClient();

    await captureConsole(() => loadEvents(client, EVENTS_FOLDER));

    expect(client.onceEvents).to.deep.equal(["ready"]);
    expect(client.everyTimeEvents).to.have.members([
      "interactionCreate",
      "messageCreate",
      "guildMemberAdd",
    ]);
  });

  it("passes the client along to every event", async () => {
    // A tiny event file in a temp folder that remembers what it was called with.
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "typ3-events-"));
    fs.writeFileSync(
      path.join(folder, "wave.js"),
      'exports.default = { name: "wave", calls: [], execute(...args) { this.calls.push(args); } };'
    );

    try {
      const client = fakeClient();
      await captureConsole(() => loadEvents(client, folder));

      client.events.get("wave")("hello");

      const wave = require(path.join(folder, "wave.js")).default;
      expect(wave.calls).to.have.length(1);
      expect(wave.calls[0][0]).to.equal("hello");
      expect(wave.calls[0][1]).to.equal(client);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});
