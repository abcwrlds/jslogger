# MessageSniffer Changelog

## v1.0.3 - Fixed Dispatcher Usage

### Critical Fix
- **Changed Dispatcher access** from `getByProps('_dispatch')` to `window.enmity.modules.common.Dispatcher`
- **Fixed event subscription** to store handlers instead of tokens
- **Fixed unsubscribe logic** to use handlers for cleanup

### Why This Was Needed
The previous implementation used an incorrect method to access Discord's Flux Dispatcher. The correct way is to use `window.enmity.modules.common.Dispatcher` which is the proper Enmity API.

### Changes Made
1. Updated `onStart()` to use `window.enmity.modules.common.Dispatcher`
2. Store event handlers in subscriptions array
3. Updated `onStop()` to unsubscribe using stored handlers
4. Added extensive console logging for debugging

### Testing
- Plugin now loads in Enmity ✅
- Event subscriptions work correctly ✅
- Messages are cached properly ✅
- Deleted/edited messages are logged ✅

## v1.0.2 - Build System

### Added
- Proper Rollup + esbuild build system
- TypeScript support
- Minification and bundling

## v1.0.1 - Initial Fixes

### Fixed
- Added `id` field to plugin metadata
- Fixed `registerPlugin()` call
- Removed Node.js `require()` calls
- Added `window.enmity` API usage

## v1.0.0 - Initial Release

### Features
- Log deleted messages
- Log edited messages
- Log bulk deletions
- `/msglog` commands to view logs
- Settings panel
