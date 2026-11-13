# Code Analysis Report — D&D Session Scribe (MemeBot)

This is our group's shared report for **Task 5: Code Analysis & Hardening**. We looked for bugs, gaps and technical debt in the bot, wrote down what we found, and turned the findings into user stories on our [Kanban board](https://github.com/orgs/CSS360-2026-Au-E/projects/10).

## How to contribute

1. Put your name next to the two tasks you picked in the table below.
2. Fill in **only your own task sections**. Use the template already in each section (Owner, What we did, Findings, Evidence, User stories).
3. Link evidence: file links like [`src/commands/ask.js:31`](src/commands/ask.js#L31), commands you ran, test output, screenshots in [`docs/`](docs/).
4. Add your user stories (at least 2) to the [User Stories](#user-stories) table, with a link to the issue.
5. Add your time spent and a short reflection at the bottom.
6. Open a PR for your changes so merges don't overwrite each other.

## Task assignments

| #   | Task                           | Owner(s) |
| --- | ------------------------------ | -------- |
| 1   | Technical debt and code smells | Dilshan  |
| 2   | Cyclomatic complexity          | Leo      |
| 3   | Cohesion and coupling          | Aaron    |
| 4   | Test coverage                  | Aaron    |
| 5   | Threat model                   | Slavik   |
| 6   | Fuzzer (fast-check)            | Slavik   |
| 7   | Unit tests (at least 3)        | Leo      |
| 8   | Smoke test                     | Dilshan  |

We have four members, so each person took two tasks and we did not do CI/CD or an own-idea task.

---

## 1. Technical Debt and Code Smells

**Owner:** Dilshan

### What I did

I read every file in [`src/`](src/), plus [`package.json`](package.json), [`nodemon.json`](nodemon.json), the CI workflow and the README. For each one I looked for duplicated code, long functions, missing error handling, missing input checks, magic numbers, dead code and docs that no longer match the code. I then ranked the findings by how much they hurt users or developers.

### Findings

#### Duplicated code

| Smell                                            | Where                                                                                                                                                                   | Why it matters                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Transcript formatting is written twice           | [`endRecording.js:29`](src/commands/endRecording.js#L29) re-implements [`formatTranscript`](src/scribe/sessions.js#L25) from `sessions.js` (even the comment is copied) | Change the format in one place and `/end-recording` and `/ask` stop matching |
| Session label written twice                      | [`ask.js:41`](src/commands/ask.js#L41) and [`recap.js:26`](src/commands/recap.js#L26)                                                                                   | "Session 2" in `/ask` could stop meaning the same thing as in `/recap`       |
| Minutes recorded calculated twice                | [`endRecording.js:26`](src/commands/endRecording.js#L26) and [`status.js:18`](src/commands/status.js#L18)                                                               | Same logic, two places to fix                                                |
| Discord's 2000-character limit as a magic number | [`ask.js:33`](src/commands/ask.js#L33) and [`recap.js:34`](src/commands/recap.js#L34)                                                                                   | Should be one named constant (and long answers are cut off silently)         |
| "Find the bot's text channel" code copied        | [`ready.js:29-34`](src/events/ready.js#L29-L34) and [`guildMemberAdd.js:8-13`](src/events/guildMemberAdd.js#L8-L13)                                                     | Should be one helper                                                         |
| Embed colors hardcoded                           | `0x5b21b6` in [`ready.js:42`](src/events/ready.js#L42) and [`guildMemberAdd.js:35`](src/events/guildMemberAdd.js#L35)                                                   | Theme changes need a search                                                  |

#### Long, stale function

- [`ready.js` `execute`](src/events/ready.js#L9-L109) is ~100 lines and does three jobs: logging, registering commands, and posting a startup message.
- The second loop is mis-indented ([`ready.js:23-108`](src/events/ready.js#L23-L108)), and `if (!CHANNEL_NAME) … break` is checked inside the loop instead of once before it.
- The "Planned Session Scribe Commands" embed ([`ready.js:44-90`](src/events/ready.js#L44-L90)) says the commands are **"not currently available"**, but `/start-recording`, `/end-recording`, `/status`, `/ask` and `/recap` all exist now. It also advertises `/help` and `/settings`, which don't exist. Every time the bot starts, it tells the server the wrong thing.
- Command registration ([`ready.js:20`](src/events/ready.js#L20)) has no try/catch. If registering fails in one server, the whole handler stops and no server gets the startup message.

#### Missing error handling

- **`/ask` can hang on "thinking…".** [`ask.js:31-33`](src/commands/ask.js#L31-L33) calls `deferReply()` and then `ask()` with no try/catch. If OpenAI fails, the user never gets an answer. [`recap.js:31-38`](src/commands/recap.js#L31-L38) already does this correctly, so the two commands are inconsistent.
- **Failed commands are silent.** [`interactionCreate.js:16-18`](src/events/interactionCreate.js#L16-L18) logs the error but never replies, so the user sees "The application did not respond".
- **One bad save file breaks `/ask` and `/recap`.** [`sessions.js:37`](src/scribe/sessions.js#L37) calls `JSON.parse` on every file in `data/` with no try/catch. A single corrupt or half-written file throws for the whole server.
- **API responses are trusted blindly.** [`chat.js:26`](src/scribe/chat.js#L26) assumes `choices[0]` exists, and [`whisper.js:20`](src/scribe/whisper.js#L20) assumes `text` exists.
- **Possible crash in `stopMusic`.** [`player.js:43`](src/music/player.js#L43) calls `download.kill()` without `?.`. The entry is created with `download: null` ([`player.js:28`](src/music/player.js#L28)), so this can throw.
- [`endRecording.js:32-33`](src/commands/endRecording.js#L32-L33) writes the save file synchronously with no catch. If the write fails, the transcript is never posted either.
- [`app.js:20`](src/app.js#L20): `client.login()` has no `.catch`, so a bad token gives an unhandled promise rejection instead of a clear message.

#### Missing input and config validation

- `TOKEN` ([`app.js:5`](src/app.js#L5)) and `OPENAI_API_KEY` ([`chat.js:9`](src/scribe/chat.js#L9), [`whisper.js:11`](src/scribe/whisper.js#L11)) are never checked. A missing key sends `Bearer undefined` and fails later with a confusing error.
- `/ask` sends **every** saved transcript for the server on every question ([`ask.js:26-28`](src/commands/ask.js#L26-L28)), with no size limit. After enough sessions this will go over the model's context limit and cost more per question. The question itself has no length limit either.
- [`startRecording.js:29-36`](src/commands/startRecording.js#L29-L36) replies "Recording started!" without waiting for the voice connection to be ready, so a failed join still looks like success.

#### Magic numbers and hardcoded config

- Audio settings (`48000` Hz, `960` frame size, `1000` ms silence) are in [`listen.js:7,24,28`](src/scribe/listen.js#L7) and repeated in [`whisper.js:34-35`](src/scribe/whisper.js#L34-L35). They must match, but nothing ties them together.
- Model names `"gpt-5-mini"` ([`chat.js:2`](src/scribe/chat.js#L2)) and `"whisper-1"` ([`whisper.js:6`](src/scribe/whisper.js#L6)) are hardcoded instead of in `.env`.
- The `"data"` folder is hardcoded in two files ([`endRecording.js:32`](src/commands/endRecording.js#L32), [`sessions.js:31`](src/scribe/sessions.js#L31)).

#### Dead code and config debt

- `axios` is in [`package.json`](package.json) but never imported (both API clients use `fetch`).
- `client.events` ([`app.js:16`](src/app.js#L16)) is filled in by the loader but never read, and the `event.rest` branch in [`loadEvents.js`](src/helpers/loadEvents.js) is never used.
- [`nodemon.json`](nodemon.json) has no `exec` and `package.json` has no `main`, so `npm run dev` doesn't know what to run. It also ignores `*.test.ts` files that don't exist in this project.
- `package.json` still has the template's description and author.
- Tests run with a Node warning (`MODULE_TYPELESS_PACKAGE_JSON`) because the package type isn't set.
- The CI workflow ([`build-and-deploy.yml`](.github/workflows/build-and-deploy.yml)) only builds Docker images on the `release` branch and **never runs `npm test`**. It also uses old action versions (`checkout@v2` etc.).

#### Privacy and docs

- [`messageCreate.js:8`](src/events/messageCreate.js#L8) logs the text of **every** message in the server to the console. That is noisy and a privacy problem.
- README "Coming next" still lists "Ask the bot questions about past sessions", which `/ask` already does.

#### Inconsistent testability

- `/recap` lets tests inject `loadSessions` ([`recap.js:15`](src/commands/recap.js#L15)), but `/ask` doesn't ([`ask.js:17`](src/commands/ask.js#L17)). So `/ask` tests read the real `data/` folder, and the `/end-recording` test in [`recordingCommands.spec.js`](tests/recordingCommands.spec.js) writes into the real `data/` folder.

### Priority

| Priority | Finding                                                   | Effort |
| -------- | --------------------------------------------------------- | ------ |
| High     | `/ask` hangs on "thinking…" when OpenAI fails             | Small  |
| High     | Failed commands never reply to the user                   | Small  |
| High     | One corrupt save file breaks `/ask` and `/recap`          | Small  |
| High     | Startup message says working commands are "not available" | Small  |
| Medium   | `/ask` sends all transcripts with no size limit           | Medium |
| Medium   | Every chat message is logged                              | Small  |
| Medium   | No check for missing `TOKEN` / `OPENAI_API_KEY`           | Small  |
| Medium   | `stopMusic` can crash on `download.kill()`                | Small  |
| Medium   | CI never runs the tests                                   | Small  |
| Low      | Duplicated formatting, labels, minutes, channel lookup    | Small  |
| Low      | Magic numbers and hardcoded model names                   | Small  |
| Low      | Unused `axios`, dead loader code, broken `nodemon.json`   | Small  |

**What I'd fix first:** the four "High" items. They are all small changes and they're the ones users actually notice: a stuck reply, a silent failure, or a wrong startup message.

### User stories

See [User Stories](#user-stories): stories D1 and D2.

---

## 2. Cyclomatic Complexity

**Owner:** Leo

### What we did

_How you measured it (tool, command)._

### Findings

_Most complex functions, with scores._

### Evidence

_Command output / screenshot._

### User stories

_Links._

---

## 3. Cohesion and Coupling

**Owner:** Aaron

### What we did

_See [ARCHITECTURE.md](ARCHITECTURE.md) section 4 for the class diagram._

### Findings

### Evidence

### User stories

---

## 4. Test Coverage

**Owner:** Aaron

### What we did

_Tool used (e.g. c8 or nyc) and how to run it._

### Findings

_Coverage % per file; what's untested._

### Evidence

### User stories

---

## 5. Threat Model

**Owner:** Slavik

### What we did

### Findings

_Assets, attackers, entry points, threats, mitigations._

### Evidence

### User stories

---

## 6. Fuzzer

**Owner:** Slavik

### What we did

_Which functions were fuzzed with fast-check and how to run it._

### Findings

### Evidence

### User stories

---

## 7. Unit Tests

**Owner:** Leo

### What we did

_At least 3 new tests: file and what each checks._

### Findings

### Evidence

### User stories

---

## 8. Smoke Test

**Owner:** Dilshan

### What I did

I wrote [`tests/smoke.spec.js`](tests/smoke.spec.js), a single test file that walks through every major feature of the bot once. The idea is that if anything in this file fails, something core is broken and the change shouldn't be merged.

It checks:

1. **Commands are set up.** All six commands exist, no two share a name, and each one can be turned into the JSON that `ready.js` sends to Discord.
2. **Dispatch works.** `interactionCreate` sends every slash command name to the right command.
3. **A full recording session.** `/start-recording` guard → session starts → a voice clip is "transcribed" → `/status` sees the line → `/end-recording` posts the transcript and saves the file → `/ask` reads the saved session and answers → `/recap` summarizes it.
4. **OpenAI clients.** `askChatGPT` and `transcribe` return the text from a fake OpenAI response.
5. **Music.** A YouTube link in chat from someone in voice gets played, and `/stop-music` replies correctly when nothing is playing.

Real Discord, voice channels, OpenAI and yt-dlp are swapped for fakes, using the same patterns as our other tests. The recording test runs in a temporary folder, so it doesn't leave files in the real `data/` folder. No new dependencies were needed.

### How to run it

```bash
npm test                                                   # whole suite, includes the smoke test
npx mocha -r esbuild-runner/register tests/smoke.spec.js --exit   # smoke test only
```

### Result

```
  Smoke test
    commands are set up
      ✔ has every command we expect
      ✔ has no two commands with the same name
      ✔ can turn every command into what Discord needs
      ✔ sends every slash command to the right handler
    recording a session from start to finish
      ✔ /start-recording asks you to join voice first
      ✔ records, transcribes, reports status, ends, and answers questions
    OpenAI clients
      ✔ askChatGPT returns ChatGPT's answer
      ✔ transcribe returns Whisper's text
    music
      ✔ finds a YouTube link and plays it for someone in voice
      ✔ /stop-music says so when nothing is playing

  10 passing
```

Full suite: 68 passing.

### What it does not cover

- Logging in to Discord and the `ready` / `guildMemberAdd` events.
- Actually joining a voice channel and receiving audio (`listenToSpeakers`).
- Real calls to OpenAI and real yt-dlp downloads.

These need a test server and real keys, so they're still checked by hand. Right now someone has to remember to run it. It would be most useful if it ran automatically on every pull request (see story D2).

### User stories

See [User Stories](#user-stories): story D2.

---

## User Stories

| ID  | Author  | Story                                                                                                                                                              | Source                                                                     | Issue  |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------ |
| D1  | Dilshan | As a player using `/ask`, I want a clear error message when the AI can't answer, so that I'm not left waiting on "thinking…" forever.                              | Task 1: missing try/catch in [`ask.js:31-33`](src/commands/ask.js#L31-L33) | [#26](https://github.com/CSS360-2026-Au-E/Group-2-Typ3-MemeBot/issues/26) |
| D2  | Dilshan | As a developer, I want the smoke test to run automatically on every pull request, so that a broken core feature is caught before it is merged.                     | Task 8: CI never runs `npm test`                                           | [#27](https://github.com/CSS360-2026-Au-E/Group-2-Typ3-MemeBot/issues/27) |
| D3  | Dilshan | As a server admin, I want the bot's startup message to list the commands that actually exist, so that players aren't told working features are unavailable.        | Task 1: stale embed in [`ready.js:44-90`](src/events/ready.js#L44-L90)     | [#28](https://github.com/CSS360-2026-Au-E/Group-2-Typ3-MemeBot/issues/28) |
| D4  | Dilshan | As a developer, I want transcript formatting and session labels to live in one shared place, so that changing the format doesn't require editing several commands. | Task 1: duplicated code                                                    | [#29](https://github.com/CSS360-2026-Au-E/Group-2-Typ3-MemeBot/issues/29) |
|     | _Name_  | _As a …, I want …, so that …_                                                                                                                                      |                                                                            |        |

---

## Time Spent and Reflection

| Member  | Tasks | Time spent | Reflection         |
| ------- | ----- | ---------- | ------------------ |
| Dilshan | 1, 8  | 2 hours    | See [Dilshan](#dilshan) below |
| Leo     | 2, 7  |            |                    |
| Aaron   | 3, 4  |            |                    |
| Slavik  | 5, 6  |            |                    |

### Dilshan

Most of my time went into reading the whole codebase file by file for Task 1. That took longer than writing the smoke test. The bot works well when everything goes right, but most of the problems I found show up when something fails: an OpenAI error leaves `/ask` stuck on "thinking…", and one bad save file breaks `/ask` and `/recap`. Each of us added commands quickly, so the same small pieces of code got copied into several files, and the startup message was never updated after the commands it calls "planned" were built. The good news is that most of the high-priority fixes are small.

The smoke test was quick because our existing tests already had fakes for Discord, OpenAI and the music player that I could reuse. Running the recording part in a temporary folder was the one tricky part, so the test wouldn't leave files in our real `data/` folder. The biggest gap I see now is that nothing runs these tests automatically, so the next step I'd push for is running them on every pull request (story D2).
