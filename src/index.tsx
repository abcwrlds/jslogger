import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { React } from 'enmity/metro/common';
import { bulk, filters } from 'enmity/metro';
import { create } from 'enmity/patcher';
import { sendReply } from 'enmity/api/clyde';
import { get, set } from 'enmity/api/settings';
import manifest from '../manifest.json';

const Patcher = create('message-logger');

// Helper to get modules
function getByProps(...props: string[]) {
    return window.enmity.modules.getByProps(...props);
}

// Storage for event subscriptions
const subscriptions: any[] = [];

// Storage for logged messages
const messageLog: any = {
    deleted: [],
    edited: [],
    bulkDeleted: [],
    maxEntries: 1000
};

// Get settings with defaults
function getSetting(key: string, defaultValue: any) {
    return get(manifest.name, key, defaultValue);
}

function setSetting(key: string, value: any) {
    set(manifest.name, key, value);
}

// Utility functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

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
    if (messageLog.deleted.length > getSetting('maxLogSize', 1000)) {
        messageLog.deleted.pop();
    }
    
    if (getSetting('showNotifications', true)) {
        console.log(`[MessageSniffer] Deleted message from ${logEntry.author.username}: ${truncateMessage(logEntry.content)}`);
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
    if (messageLog.edited.length > getSetting('maxLogSize', 1000)) {
        messageLog.edited.pop();
    }
    
    if (getSetting('showNotifications', true)) {
        console.log(`[MessageSniffer] Edited message from ${logEntry.author.username}`);
    }
    
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
    if (messageLog.bulkDeleted.length > getSetting('maxLogSize', 1000)) {
        messageLog.bulkDeleted.pop();
    }
    
    if (getSetting('showNotifications', true)) {
        console.log(`[MessageSniffer] Bulk deleted ${messageIds.length} messages in ${logEntry.channelName}`);
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

const MessageSniffer: Plugin = {
    ...manifest,
    
    onStart() {
        console.log('[MessageSniffer] Plugin started');
        
        try {
            // Use Flux Dispatcher from common
            const { Dispatcher } = window.enmity.modules.common;
            console.log('[MessageSniffer] Dispatcher:', !!Dispatcher);
            
            if (Dispatcher) {
                // Subscribe to MESSAGE_CREATE
                const createHandler = (event: any) => {
                    try {
                        if (event.message && event.message.id) {
                            originalMessages.set(event.message.id, { ...event.message });
                        }
                    } catch (err) {
                        console.error('[MessageSniffer] Error in MESSAGE_CREATE:', err);
                    }
                };
                Dispatcher.subscribe('MESSAGE_CREATE', createHandler);
                subscriptions.push({ type: 'MESSAGE_CREATE', handler: createHandler });
                
                // Subscribe to MESSAGE_DELETE
                if (getSetting('logDeleted', true)) {
                    const deleteHandler = (event: any) => {
                        try {
                            if (event.channelId && event.id) {
                                logDeletedMessage(event.channelId, event.id);
                            }
                        } catch (err) {
                            console.error('[MessageSniffer] Error in MESSAGE_DELETE:', err);
                        }
                    };
                    Dispatcher.subscribe('MESSAGE_DELETE', deleteHandler);
                    subscriptions.push({ type: 'MESSAGE_DELETE', handler: deleteHandler });
                }
                
                // Subscribe to MESSAGE_UPDATE
                if (getSetting('logEdited', true)) {
                    const updateHandler = (event: any) => {
                        try {
                            if (event.message && event.message.id && event.message.edited_timestamp) {
                                logEditedMessage(event.message.channel_id, event.message.id, event.message);
                            }
                        } catch (err) {
                            console.error('[MessageSniffer] Error in MESSAGE_UPDATE:', err);
                        }
                    };
                    Dispatcher.subscribe('MESSAGE_UPDATE', updateHandler);
                    subscriptions.push({ type: 'MESSAGE_UPDATE', handler: updateHandler });
                }
                
                // Subscribe to MESSAGE_DELETE_BULK
                if (getSetting('logBulkDeleted', true)) {
                    const bulkHandler = (event: any) => {
                        try {
                            if (event.channelId && event.ids) {
                                logBulkDeletedMessages(event.channelId, event.ids);
                            }
                        } catch (err) {
                            console.error('[MessageSniffer] Error in MESSAGE_DELETE_BULK:', err);
                        }
                    };
                    Dispatcher.subscribe('MESSAGE_DELETE_BULK', bulkHandler);
                    subscriptions.push({ type: 'MESSAGE_DELETE_BULK', handler: bulkHandler });
                }
                
                console.log('[MessageSniffer] Subscribed to', subscriptions.length, 'events');
            }
            
            // Register command
            const Commands = getByProps('registerCommand');
            console.log('[MessageSniffer] Commands module:', !!Commands);
            if (Commands && Commands.registerCommand) {
                Commands.registerCommand({
                    name: 'msglog',
                    description: 'Message logger commands',
                    execute: (args: any) => handleCommand(args)
                });
                console.log('[MessageSniffer] Command registered');
            }
        } catch (err) {
            console.error('[MessageSniffer] Error during plugin start:', err);
        }
    },
    
    onStop() {
        console.log('[MessageSniffer] Plugin stopped');
        
        try {
            Patcher.unpatchAll();
            
            const { Dispatcher } = window.enmity.modules.common;
            if (Dispatcher && Dispatcher.unsubscribe) {
                subscriptions.forEach((sub: any) => {
                    try {
                        Dispatcher.unsubscribe(sub.type, sub.handler);
                        console.log('[MessageSniffer] Unsubscribed from', sub.type);
                    } catch (err) {
                        console.error(`[MessageSniffer] Error unsubscribing from ${sub.type}:`, err);
                    }
                });
            }
            
            subscriptions.length = 0;
            console.log('[MessageSniffer] Cleanup complete');
        } catch (err) {
            console.error('[MessageSniffer] Error during plugin stop:', err);
        }
    }
};

registerPlugin(MessageSniffer);
