# 🔐 Privacy

Arcade Engine is a local TypeScript/browser library. It does not include hosted
services, accounts, adverts, analytics trackers, third-party telemetry, or
cross-site tracking.

## 💾 Local Runtime Data

The engine does not intentionally write persistent data by itself.

Games built with the engine may choose to store their own data, such as:

- Player preferences.
- Saved progress.
- High scores.
- Debug settings.
- Audio or display options.

That storage belongs to the consuming game, not to Arcade Engine.

## 🌐 Network Requests

The engine does not intentionally send data over the network.

Games built with the engine may load assets such as images, fonts, music, sound
effects, or API data from paths supplied by the game. Those requests are
controlled by the consuming game and its hosting environment.

## 🔊 Audio

The `Sound` module creates browser `Audio` elements for caller-provided source
URLs. It does not inspect microphone input, record audio, or upload audio data.

Browser autoplay restrictions may block playback. If configured, the engine can
call an application-provided `onPlaybackBlocked` callback with the affected
sound channel and source paths so the game can show its own UI.

## 🖼️ Canvas

The `GameArena` module creates and draws to a browser canvas. It does not read
screen contents outside its own canvas and does not transmit rendered pixels.

## 🧪 Tests

The local test suite uses jsdom and mocked browser APIs. Tests do not send
analytics or telemetry.

## 🧾 Hosting Logs

If this repository or a game using it is hosted online, normal platform, CDN,
proxy, or server logs may record technical request information such as IP
address, user agent, URL, timestamp, and response status. Those logs are
controlled by the hosting environment, not by Arcade Engine itself.

## ❌ What Is Not Collected

Arcade Engine does not intentionally collect:

- Advertising identifiers.
- Analytics events.
- Cross-site tracking data.
- Precise location.
- Contacts.
- Microphone, camera, or file contents.
- Account credentials.
- Payment information.
- Player names or high scores.

## 🧹 Data Removal

Because Arcade Engine does not intentionally store persistent data by itself,
there is no engine-level account or database to delete from. For games built on
top of the engine, use that game's own reset tools or the browser's site-data
controls.
