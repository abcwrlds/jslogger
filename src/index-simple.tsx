import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { React } from 'enmity/metro/common';
import { getByProps } from 'enmity/metro';
import { create } from 'enmity/patcher';
import manifest from '../manifest.json';

const Patcher = create('message-logger');

// Store messages
const messageCache = new Map();

const MessageSniffer: Plugin = {
   ...manifest,

   onStart() {
      console.log('[MessageSniffer] Starting...');
      
      // Get the Dispatcher
      const Dispatcher = getByProps('_currentDispatchActionType');
      
      if (!Dispatcher) {
         console.error('[MessageSniffer] Could not find Dispatcher!');
         return;
      }
      
      console.log('[MessageSniffer] Found Dispatcher');
      
      // Patch the dispatch function to intercept all events
      Patcher.before(Dispatcher, '_dispatch', (self, args) => {
         const [event] = args;
         
         // Cache messages when created
         if (event.type === 'MESSAGE_CREATE' && event.message) {
            messageCache.set(event.message.id, event.message);
            console.log('[MessageSniffer] Cached message:', event.message.id);
         }
         
         // Log deleted messages
         if (event.type === 'MESSAGE_DELETE' && event.id) {
            const msg = messageCache.get(event.id);
            if (msg) {
               console.log('[MessageSniffer] DELETED:', msg.content);
            }
         }
         
         // Log edited messages
         if (event.type === 'MESSAGE_UPDATE' && event.message) {
            const oldMsg = messageCache.get(event.message.id);
            if (oldMsg && oldMsg.content !== event.message.content) {
               console.log('[MessageSniffer] EDITED:', oldMsg.content, '->', event.message.content);
               messageCache.set(event.message.id, event.message);
            }
         }
      });
      
      console.log('[MessageSniffer] Started successfully!');
   },

   onStop() {
      console.log('[MessageSniffer] Stopping...');
      Patcher.unpatchAll();
      messageCache.clear();
   }
};

registerPlugin(MessageSniffer);
