# typ3 Architecture Guide

typ3 is a Discord bot that acts as a session scribe for D&D and other tabletop games.
It joins a voice channel, transcribes what each player says with OpenAI Whisper, and posts the transcript when the session ends.

This guide is for three readers:

- **Future us**: where things live and how to change them
- **Someone using the bot**: what happens to their voice
- **A future employer**: how we made our design choices

## Contents

| # | Section | Diagram | Owner |
|---|---------|---------|-------|
| 1 | [Data Flow: Voice to Transcript](#1-data-flow-voice-to-transcript) | Data flow diagram | Aaron |
| 2 | [System Context & Network](#2-system-context--network) | System context / network diagram | Dilshan |
| 3 | [Command Lifecycle](#3-command-lifecycle) | Activity diagram | Leo |
| 4 | [Code Structure & Adding a Command](#4-code-structure--adding-a-command) | Class / module diagram | Slavik |

---

## 1. Data Flow: Voice to Transcript

**Author:** Aaron

This section follows the **data**, not the code: what happens to a player's voice from the moment they speak until the transcript shows up in Discord.

### Diagram

```mermaid
flowchart LR
    %% External entities
    DM["Dungeon Master<br/>(runs commands)"]
    PL["Players<br/>(voice channel)"]
    DC["Discord<br/>API + Voice"]
    WH["OpenAI<br/>Whisper API"]

    %% Processes
    P1(("1. Start<br/>session"))
    P2(("2. Capture<br/>speech"))
    P3(("3. Transcribe<br/>clip"))
    P4(("4. Report<br/>status"))
    P5(("5. End session<br/>& post transcript"))

    %% Data stores
    D1[("D1 Active session<br/>(in memory)")]
    D2[("D2 Saved sessions<br/>(data/ folder)")]

    DM -->|/start-recording| DC
    DC -->|slash command| P1
    P1 -->|start time, empty lines| D1
    P1 -->|join voice channel| DC

    PL -->|speech| DC
    DC -->|Opus audio, one stream per user| P2
    P2 -->|raw audio clip + speaker name| P3
    P3 -->|WAV file| WH
    WH -->|text| P3
    P3 -->|speaker + text| D1

    DM -->|/status| DC
    DC -->|slash command| P4
    D1 -->|start time, line count| P4
    P4 -->|status message| DC

    DM -->|/end-recording| DC
    DC -->|slash command| P5
    D1 -->|all lines| P5
    P5 -->|session JSON| D2
    P5 -->|transcript.txt + leave voice| DC
    DC -->|transcript| DM
    DC -->|transcript| PL

    classDef ext fill:#eef3fb,stroke:#3b6db3,color:#1b2b44
    classDef proc fill:#fff6e5,stroke:#c98a12,color:#3d2a05
    classDef store fill:#eef7ee,stroke:#3f8f45,color:#163a19
    class DM,PL,DC,WH ext
    class P1,P2,P3,P4,P5 proc
    class D1,D2 store
```

**Legend:** blue box = outside the bot, orange circle = something the bot does, green cylinder = where data is kept.
Arrow labels name the **data** moving.

### Step by step

| Step | What happens | Code |
|------|--------------|------|
| 1. Start session | Bot joins the DM's voice channel and creates an empty session | `commands/startRecording.js`, `scribe/sessions.js` |
| 2. Capture speech | Discord sends each person's audio separately. The bot cuts a clip when that person is quiet for 1 second and decodes it to raw audio | `scribe/listen.js` |
| 3. Transcribe clip | Clips under 1 second are skipped. The rest get a WAV header and go to Whisper. The text is saved with the speaker's name | `scribe/listen.js`, `scribe/whisper.js` |
| 4. Report status | `/status` reads the session and replies with how long it's been recording and how many lines were transcribed | `commands/status.js` |
| 5. End session | Bot leaves voice, saves the session to `data/`, and posts `transcript.txt` in the channel | `commands/endRecording.js` |

### Data stores

| Store | What's in it | Where | How long |
|-------|--------------|-------|----------|
| D1 Active session | Start time + list of `{ speaker, text }` | Memory (a `Map`, one per server) | Until the next session starts or the bot restarts |
| D2 Saved sessions | One JSON file per finished session | `data/` folder (not committed to GitHub) | Until deleted |

Audio is never stored. Each clip only exists long enough to be sent to Whisper.

### Design choices

- **Speaker names come from Discord, not guessed.**
  Discord gives one audio stream per user, so we always know who said what.
- **1 second of silence = one clip.**
  Short clips keep transcription moving during the session instead of all at the end.
- **Clips under 1 second are skipped.**
  Whisper tends to make up words when it only hears a short noise.
- **Only text is kept.**
  Raw audio is the most sensitive data, so it's thrown away right after transcription.
- **Secrets stay out of the code.**
  The Discord token and OpenAI key are read from `.env`, which is git-ignored.
- **Saved transcripts stay off GitHub.**
  `data/` is in `.gitignore` so players' conversations are never committed.

### Known limits

- If the bot crashes mid-session, the active session (D1) is lost, because it's only in memory until `/end-recording`.
- If Whisper fails, that clip is logged and skipped. Players aren't told.
- Players aren't warned they're being recorded beyond the "Recording started" message.

---

## 2. System Context & Network

**Author:** Dilshan

_TODO: Show typ3 and everything it talks to (Discord users, Discord API, OpenAI Whisper, GitHub Codespaces), and how the network connects them. Where does the bot run? How do npm and `.env` fit in?_

---

## 3. Command Lifecycle

**Author:** Leo

_TODO: Activity diagram for one slash command: user types it → Discord sends an interaction → `events/interactionCreate.js` finds the command → the command replies. Include the error path._

---

## 4. Code Structure & Adding a Command

**Author:** Slavik

_TODO: Module/class diagram of `src/` (app.js, events, commands, scribe, helpers) and a short checklist for adding a new slash command (`commands/index.js`, tests)._
