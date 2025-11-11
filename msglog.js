/**
 * @name MessageLogger
 * @description Logs all message events including edits, deletions, and bulk deletions
 * @version 1.0.1
 * @author YourName
 */

const { Plugin } = require('enmity/managers/plugins');
const { React } = require('enmity/metro/common');
const { create } = require('enmity/patcher');
const { getByProps } = require('enmity/metro');
const { sendReply } = require('enmity/api/clyde');
const { bulk, filters } = require('enmity/metro');
const { FormRow, FormSection, FormSwitch } = require('enmity/components');

const Patcher = create('message-logger');

// Storage for event subscriptions
const subscriptions = [];

// Storage for logged messages
const messageLog = {
    deleted: [],
    edited: [],
    bulkDeleted: [],
    maxEntries: 1000
};

// Settings
let settings = {
    logDeleted: true,
    logEdited: true,
    logBulkDeleted: true,
    showNotifications: true,
    maxLogSize: 1000
};

// Utility function to format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Utility function to truncate long messages
function truncateMessage(content, maxLength = 100) {
    if (!content) return '[No content]';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
}

// Store original message data
const originalMessages = new Map();

// Get Discord modules
const MessageStore = getByProps('getMessage', 'getMessages');
const UserStore = getByProps('getUser', 'getCurrentUser');
const ChannelStore = getByProps('getChannel', 'getDMFromUserId');

// Log deleted message
function logDeletedMessage(channelId, messageId) {
    const message = originalMessages.get(messageId);
    
    if (!message) return;
    
    const channel = ChannelStore?.getChannel(channelId);
    const author = UserStore?.getUser(message.author?.id);
    
    const logEntry = {
        type: 'deleted',
        messageId: messageId,
        channelId: channelId,
        channelName: channel?.name || 'Unknown Channel',
        guildId: channel?.guild_id,
        content: message.content,
        author: {
            id: message.author?.id,
            username: author?.username || message.author?.username || 'Unknown',
            discriminator: author?.discriminator || message.author?.discriminator || '0000'
        },
        timestamp: message.timestamp,
        deletedAt: Date.now(),
        attachments: message.attachments || [],
        embeds: message.embeds || []
    };
    
    messageLog.deleted.unshift(logEntry);
    
    // Limit log size
    if (messageLog.deleted.length > settings.maxLogSize) {
        messageLog.deleted.pop();
    }
    
    if (settings.showNotifications) {
        console.log(`[MessageLogger] Deleted message from ${logEntry.author.username}: ${truncateMessage(logEntry.content)}`);
    }
}

// Log edited message
function logEditedMessage(channelId, messageId, newMessage) {
    const oldMessage = originalMessages.get(messageId);
    
    if (!oldMessage || oldMessage.content === newMessage.content) return;
    
    const channel = ChannelStore?.getChannel(channelId);
    const author = UserStore?.getUser(newMessage.author?.id);
    
    const logEntry = {
        type: 'edited',
        messageId: messageId,
        channelId: channelId,
        channelName: channel?.name || 'Unknown Channel',
        guildId: channel?.guild_id,
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        author: {
            id: newMessage.author?.id,
            username: author?.username || newMessage.author?.username || 'Unknown',
            discriminator: author?.discriminator || newMessage.author?.discriminator || '0000'
        },
        originalTimestamp: oldMessage.timestamp,
        editedAt: Date.now()
    };
    
    messageLog.edited.unshift(logEntry);
    
    // Limit log size
    if (messageLog.edited.length > settings.maxLogSize) {
        messageLog.edited.pop();
    }
    
    if (settings.showNotifications) {
        console.log(`[MessageLogger] Edited message from ${logEntry.author.username}`);
        console.log(`  Old: ${truncateMessage(logEntry.oldContent)}`);
        console.log(`  New: ${truncateMessage(logEntry.newContent)}`);
    }
    
    // Update stored message
    originalMessages.set(messageId, { ...newMessage });
}

// Log bulk deleted messages
function logBulkDeletedMessages(channelId, messageIds) {
    const channel = ChannelStore?.getChannel(channelId);
    const messages = [];
    
    messageIds.forEach(messageId => {
        const message = originalMessages.get(messageId);
        if (message) {
            const author = UserStore?.getUser(message.author?.id);
            messages.push({
                messageId: messageId,
                content: message.content,
                author: {
                    id: message.author?.id,
                    username: author?.username || message.author?.username || 'Unknown',
                    discriminator: author?.discriminator || message.author?.discriminator || '0000'
                },
                timestamp: message.timestamp
            });
        }
    });
    
    const logEntry = {
        type: 'bulk_deleted',
        channelId: channelId,
        channelName: channel?.name || 'Unknown Channel',
        guildId: channel?.guild_id,
        messageCount: messageIds.length,
        messages: messages,
        deletedAt: Date.now()
    };
    
    messageLog.bulkDeleted.unshift(logEntry);
    
    // Limit log size
    if (messageLog.bulkDeleted.length > settings.maxLogSize) {
        messageLog.bulkDeleted.pop();
    }
    
    if (settings.showNotifications) {
        console.log(`[MessageLogger] Bulk deleted ${messageIds.length} messages in ${logEntry.channelName}`);
    }
}

// Commands to view logs
function handleCommand(args) {
    const command = args[0]?.toLowerCase();
    
    switch (command) {
        case 'deleted':
            if (messageLog.deleted.length === 0) {
                sendReply('No deleted messages logged.');
                return;
            }
            
            let deletedOutput = `**Deleted Messages (${messageLog.deleted.length}):**\n\n`;
            messageLog.deleted.slice(0, 10).forEach((entry, index) => {
                deletedOutput += `**${index + 1}.** ${entry.author.username}#${entry.author.discriminator} in #${entry.channelName}\n`;
                deletedOutput += `   Content: ${truncateMessage(entry.content, 150)}\n`;
                deletedOutput += `   Deleted: ${formatTimestamp(entry.deletedAt)}\n\n`;
            });
            
            sendReply(deletedOutput);
            break;
            
        case 'edited':
            if (messageLog.edited.length === 0) {
                sendReply('No edited messages logged.');
                return;
            }
            
            let editedOutput = `**Edited Messages (${messageLog.edited.length}):**\n\n`;
            messageLog.edited.slice(0, 10).forEach((entry, index) => {
                editedOutput += `**${index + 1}.** ${entry.author.username}#${entry.author.discriminator} in #${entry.channelName}\n`;
                editedOutput += `   Old: ${truncateMessage(entry.oldContent, 100)}\n`;
                editedOutput += `   New: ${truncateMessage(entry.newContent, 100)}\n`;
                editedOutput += `   Edited: ${formatTimestamp(entry.editedAt)}\n\n`;
            });
            
            sendReply(editedOutput);
            break;
            
        case 'bulk':
            if (messageLog.bulkDeleted.length === 0) {
                sendReply('No bulk deletions logged.');
                return;
            }
            
            let bulkOutput = `**Bulk Deletions (${messageLog.bulkDeleted.length}):**\n\n`;
            messageLog.bulkDeleted.slice(0, 5).forEach((entry, index) => {
                bulkOutput += `**${index + 1}.** ${entry.messageCount} messages in #${entry.channelName}\n`;
                bulkOutput += `   Deleted: ${formatTimestamp(entry.deletedAt)}\n\n`;
            });
            
            sendReply(bulkOutput);
            break;
            
        case 'clear':
            messageLog.deleted = [];
            messageLog.edited = [];
            messageLog.bulkDeleted = [];
            originalMessages.clear();
            sendReply('Message logs cleared.');
            break;
            
        case 'stats':
            const stats = `**Message Logger Statistics:**\n\n` +
                `Deleted Messages: ${messageLog.deleted.length}\n` +
                `Edited Messages: ${messageLog.edited.length}\n` +
                `Bulk Deletions: ${messageLog.bulkDeleted.length}\n` +
                `Cached Messages: ${originalMessages.size}`;
            sendReply(stats);
            break;
            
        default:
            const help = `**Message Logger Commands:**\n\n` +
                `/msglog deleted - View recently deleted messages\n` +
                `/msglog edited - View recently edited messages\n` +
                `/msglog bulk - View bulk deletion events\n` +
                `/msglog stats - View logging statistics\n` +
                `/msglog clear - Clear all logs`;
            sendReply(help);
    }
}

const MessageLogger = {
    id: 'message-logger',
    name: 'MessageLogger',
    version: '1.0.1',
    description: 'Logs all message events including edits, deletions, and bulk deletions',
    authors: [{ name: 'YourName', id: '0' }],
    
    onStart() {
        console.log('[MessageLogger] Plugin started');
        
        try {
            // Get Flux dispatcher
            const Dispatcher = getByProps('_dispatch', '_subscriptions') || getByProps('dispatch', 'subscribe');
            
            if (Dispatcher && Dispatcher.subscribe) {
                // Listen for MESSAGE_CREATE to cache messages
                const createSub = Dispatcher.subscribe('MESSAGE_CREATE', (event) => {
                    try {
                        if (event.message && event.message.id) {
                            originalMessages.set(event.message.id, { ...event.message });
                        }
                    } catch (err) {
                        console.error('[MessageLogger] Error in MESSAGE_CREATE:', err);
                    }
                });
                subscriptions.push({ type: 'MESSAGE_CREATE', token: createSub });
                
                // Listen for MESSAGE_DELETE
                if (settings.logDeleted) {
                    const deleteSub = Dispatcher.subscribe('MESSAGE_DELETE', (event) => {
                        try {
                            if (event.channelId && event.id) {
                                logDeletedMessage(event.channelId, event.id);
                            }
                        } catch (err) {
                            console.error('[MessageLogger] Error in MESSAGE_DELETE:', err);
                        }
                    });
                    subscriptions.push({ type: 'MESSAGE_DELETE', token: deleteSub });
                }
                
                // Listen for MESSAGE_UPDATE (edits)
                if (settings.logEdited) {
                    const updateSub = Dispatcher.subscribe('MESSAGE_UPDATE', (event) => {
                        try {
                            if (event.message && event.message.id && event.message.edited_timestamp) {
                                logEditedMessage(event.message.channel_id, event.message.id, event.message);
                            }
                        } catch (err) {
                            console.error('[MessageLogger] Error in MESSAGE_UPDATE:', err);
                        }
                    });
                    subscriptions.push({ type: 'MESSAGE_UPDATE', token: updateSub });
                }
                
                // Listen for MESSAGE_DELETE_BULK
                if (settings.logBulkDeleted) {
                    const bulkSub = Dispatcher.subscribe('MESSAGE_DELETE_BULK', (event) => {
                        try {
                            if (event.channelId && event.ids) {
                                logBulkDeletedMessages(event.channelId, event.ids);
                            }
                        } catch (err) {
                            console.error('[MessageLogger] Error in MESSAGE_DELETE_BULK:', err);
                        }
                    });
                    subscriptions.push({ type: 'MESSAGE_DELETE_BULK', token: bulkSub });
                }
            }
            
            // Register command
            const Commands = getByProps('registerCommand');
            if (Commands && Commands.registerCommand) {
                Commands.registerCommand({
                    name: 'msglog',
                    description: 'Message logger commands',
                    execute: (args) => handleCommand(args)
                });
            }
        } catch (err) {
            console.error('[MessageLogger] Error during plugin start:', err);
        }
    },
    
    onStop() {
        console.log('[MessageLogger] Plugin stopped');
        
        try {
            Patcher.unpatchAll();
            
            // Unsubscribe from all events
            const Dispatcher = getByProps('_dispatch', '_subscriptions') || getByProps('dispatch', 'subscribe');
            if (Dispatcher && Dispatcher.unsubscribe) {
                subscriptions.forEach(sub => {
                    try {
                        Dispatcher.unsubscribe(sub.type, sub.token);
                    } catch (err) {
                        console.error(`[MessageLogger] Error unsubscribing from ${sub.type}:`, err);
                    }
                });
            }
            
            // Clear subscriptions array
            subscriptions.length = 0;
        } catch (err) {
            console.error('[MessageLogger] Error during plugin stop:', err);
        }
    },
    
    getSettingsPanel() {
        return {
            settings: [
                {
                    type: 'toggle',
                    title: 'Log Deleted Messages',
                    value: settings.logDeleted,
                    onValueChange: (value) => {
                        settings.logDeleted = value;
                    }
                },
                {
                    type: 'toggle',
                    title: 'Log Edited Messages',
                    value: settings.logEdited,
                    onValueChange: (value) => {
                        settings.logEdited = value;
                    }
                },
                {
                    type: 'toggle',
                    title: 'Log Bulk Deletions',
                    value: settings.logBulkDeleted,
                    onValueChange: (value) => {
                        settings.logBulkDeleted = value;
                    }
                },
                {
                    type: 'toggle',
                    title: 'Show Console Notifications',
                    value: settings.showNotifications,
                    onValueChange: (value) => {
                        settings.showNotifications = value;
                    }
                }
            ]
        };
    }
};

module.exports = MessageLogger;
