# DCMessageLoggerapp - Enmity Plugin

A Discord message logger plugin for Enmity that tracks deleted messages, edited messages, and bulk deletions.

## Version 1.0.3 - Fixed Plugin Registration

### Fixed Issues
- **Switched to `window.enmity` API** - Using proper browser-based API instead of require()
- **Fixed `registerPlugin()` call** - Now uses `window.enmity.plugins.registerPlugin()`
- **Removed Node.js require() calls** - These don't work in browser context
- **Removed module.exports** - Not needed in browser environment
- **Added required `id` field** to plugin metadata
- **Fixed Dispatcher event subscription** - Properly stores subscription tokens
- **Fixed unsubscribe logic** - Properly unsubscribes using stored tokens
- **Added error handling** - Wrapped all event handlers in try-catch blocks

### What Was Wrong
The plugin would not appear in the plugins list because:
1. **Using Node.js `require()` instead of `window.enmity` API** - Enmity runs in browser, not Node.js
2. **Wrong registerPlugin syntax** - Should be `window.enmity.plugins.registerPlugin()`
3. Missing `id` field in plugin metadata
4. Incorrect Dispatcher.subscribe() usage - wasn't storing tokens
5. No error handling, so any error would crash the plugin silently

## Installation

Load the plugin from:
```
https://raw.githubusercontent.com/abcwrlds/jslogger/refs/heads/main/msglog.js
```

After updating to v1.0.3, the plugin should:
1. Install successfully
2. Enable without errors
3. Persist after Discord restart
4. Properly clean up when disabled

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

## Technical Details

The plugin uses:
- Flux Dispatcher for event subscriptions
- Proper token-based subscription management
- Error handling for all async operations
- Message caching with Map for efficient lookups
