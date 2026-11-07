# typ3 — CSS 360 Discord Bot

## About
Our group project for CSS 360, Autumn 2026.
We are using the course's JavaScript Discord Welcome
MemeBot example as our starting point.

## Current Status: v1.0
The typ3 Session Scribe is a D&D-themed Discord bot that records and transcribes tabletop sessions.

### Features
- D&D-themed welcome and ready messages
- `/start-recording`: bot joins your voice channel and starts a session
- `/end-recording`: bot leaves voice and reports the session length
- `/status`: shows whether a session is recording and for how long
- Live voice transcription with Whisper
- Music: paste a YouTube link in chat while you're in a voice channel and the bot plays it
- `/stop-music`: stops the music

### Coming next
- Session summaries and recaps
- Searchable session history
- Ask the bot questions about past sessions

## Playing Music

### What you need to install
- [Node.js](https://nodejs.org) 22.12 or newer (check with `node --version`)
- [Python](https://www.python.org/downloads/) 3.10 or newer (check with `python3 --version`)

You don't need to install `yt-dlp` or FFmpeg yourself. `npm install` downloads both.
If you use a Codespace, rebuild the container to get the right versions.

### Setup
1. Run `npm install`. If you already ran it before music was added, run it again.
2. Copy `.env.example` to `.env` and fill in your values.
3. Make sure the bot has the **Connect** and **Speak** permissions in your voice channel.
4. Run `npm start`.

### How to use it
1. Join a voice channel.
2. Paste a YouTube link in any text channel the bot can see. It joins your voice channel and starts playing within about 10 seconds.
3. Paste another link to replace the current song.
4. Use `/stop-music` to stop. The bot also leaves voice when the song ends, unless a session is being recorded.

Music works during a recording, and the bot's audio isn't transcribed. Players should wear headphones so the music doesn't reach their mic and end up in the transcript.

### Troubleshooting
- **The bot ignores my link:** make sure you're in a voice channel. Links to a playlist page aren't supported, only links to a single video.
- **"I couldn't play that link":** the video may be private, removed, or blocked. If every link fails, run `npm rebuild youtube-dl-exec` to update `yt-dlp`, then restart the bot.
- **Links fail on Codespaces or a cloud host but work on your computer:** YouTube often blocks these servers. Run the bot on your own computer instead.

## Team Members
- Slavik Arushanyan
- Leo Kotok
- Dilshan
- Aaron

## Project Board
Feature ideas and tasks are tracked on our
[typ3 Kanban board](https://github.com/orgs/CSS360-2026-Au-E/projects/10).

