# MessageSniffer - Enmity Plugin

A Discord message logger plugin for Enmity that tracks deleted messages, edited messages, and bulk deletions.

**Author:** abcwrlds  
**Version:** 1.0.3

## Installation

Load the plugin from:
```
https://raw.githubusercontent.com/abcwrlds/jslogger/refs/heads/main/dist/MessageSniffer.js
```

## Building

If you want to modify the plugin:

1. Clone the repository
2. Make your changes to `msglog.js`
3. Run `npm run build` to compile
4. The built file will be in `dist/MessageSniffer.js`
5. Commit and push to update the plugin

## Features

- **Deleted Messages**: Logs all deleted messages with content, author, and timestamp
- **Edited Messages**: Tracks message edits with before/after content
- **Bulk Deletions**: Records bulk message deletion events
- **Commands**: View logs via `/msglog` commands
- **Settings**: Toggle different logging features

## Commands

- `/msglog deleted` - View recently deleted messages
- `/msglog edited` - View recently edited messages
- `/msglog bulk` - View bulk deletion events
- `/msglog stats` - View logging statistics
- `/msglog clear` - Clear all logs

## Settings

Access settings through the Enmity plugins menu:
- Log Deleted Messages
- Log Edited Messages
- Log Bulk Deletions
- Show Console Notifications

## How It Works

MessageSniffer monitors Discord's internal message events:
- Caches all messages as they're sent
- Logs when messages are deleted or edited
- Tracks bulk deletion events
- Stores logs locally with a configurable size limit (default: 1000 entries)

All data is stored in memory and will be cleared when you restart Discord.
