const chatService = require('./chat.service');
const directChatService = require('./directChat.service');
const Group = require('../models/Group.model');
const GroupMessage = require('../models/GroupMessage.model');
const DirectConversation = require('../models/DirectConversation.model');
const DirectMessage = require('../models/DirectMessage.model');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

const GROUP_ROOM_PREFIX = 'group:';
const DIRECT_ROOM_PREFIX = 'direct:';
const USER_ROOM_PREFIX = 'user:';

/**
 * Setup chat socket handlers
 * @param {Object} namespace - Socket.IO namespace
 */
const setupChatHandlers = (namespace) => {
  // Join group room when user connects or requests to join
  namespace.on('connection', async (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      return;
    }

    // Join group room
    socket.on('chat:join', async (groupId, callback) => {
      try {
        const group = await Group.findById(groupId);
        if (!group) {
          if (callback) callback({ success: false, error: 'Group not found' });
          return;
        }

        const normalizedUserId = normalizeId(userId);
        const isMember = group.members.some(
          member => normalizeId(member.userId) === normalizedUserId
        );

        if (!isMember) {
          if (callback) callback({ success: false, error: 'Not a member of this group' });
          return;
        }

        // Normalize groupId to ensure consistent room name
        const normalizedGroupId = normalizeId(groupId);
        const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
        
        console.log(`[Chat] User ${userId} (socket ${socket.id}) attempting to join room ${roomName}`);
        
        await socket.join(roomName);
        
        // Verify join was successful
        const socketRooms = Array.from(socket.rooms);
        console.log(`[Chat] Socket ${socket.id} is now in rooms:`, socketRooms);

        // Get sockets in room for debugging
        const socketsInRoom = await namespace.in(roomName).fetchSockets();
        console.log(`[Chat] User ${userId} joined group ${groupId} (room: ${roomName}), total sockets: ${socketsInRoom.length}`);
        socketsInRoom.forEach(s => {
          console.log(`  - Socket ${s.id}, userId: ${s.data.userId}`);
        });

        if (callback) callback({ success: true, groupId, roomName, socketCount: socketsInRoom.length });
      } catch (error) {
        console.error('[Chat] Error joining group:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Leave group room
    socket.on('chat:leave', async (groupId, callback) => {
      try {
        // Normalize groupId to ensure consistent room name
        const normalizedGroupId = normalizeId(groupId);
        const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
        await socket.leave(roomName);

        if (callback) callback({ success: true });
        console.log(`[Chat] User ${userId} left group ${groupId} (room: ${roomName})`);
      } catch (error) {
        console.error('[Chat] Error leaving group:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Join direct conversation room
    socket.on('direct:join', async (conversationId, callback) => {
      try {
        const conversation = await DirectConversation.findById(conversationId);
        if (!conversation) {
          if (callback) callback({ success: false, error: 'Conversation not found' });
          return;
        }

        const normalizedUserId = normalizeId(userId);
        const isParticipant = conversation.participants.some(
          participant => normalizeId(participant) === normalizedUserId
        );

        if (!isParticipant) {
          if (callback) callback({ success: false, error: 'Not a participant of this conversation' });
          return;
        }

        const normalizedConversationId = normalizeId(conversationId);
        const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
        await socket.join(roomName);

        if (callback) callback({ success: true, conversationId, roomName });
        console.log(`[Chat] User ${userId} joined direct conversation ${conversationId}`);
      } catch (error) {
        console.error('[Chat] Error joining direct conversation:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('direct:leave', async (conversationId, callback) => {
      try {
        const normalizedConversationId = normalizeId(conversationId);
        const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
        await socket.leave(roomName);
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[Chat] Error leaving direct conversation:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('direct:send', async (data, callback) => {
      try {
        const { conversationId, content, replyTo, attachments } = data || {};
        if (!conversationId) {
          if (callback) callback({ success: false, error: 'Conversation ID is required' });
          return;
        }

        const result = await directChatService.createMessage(
          conversationId,
          userId,
          {
            content,
            replyTo,
            attachments: attachments || []
          },
          true
        );

        const message = result.message;
        const normalizedConversationId = normalizeId(conversationId);
        const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
        const messageData = message.toObject
          ? message.toObject({ virtuals: true })
          : (message.toJSON ? message.toJSON() : message);

        namespace.in(roomName).emit('direct:message', {
          type: 'new',
          conversationId: normalizedConversationId,
          message: messageData
        });

        (result.participantSummaries || []).forEach(entry => {
          const targetUserId = normalizeId(entry.userId);
          if (!targetUserId) return;
          const userRoomName = `${USER_ROOM_PREFIX}${targetUserId}`;
          namespace.to(userRoomName).emit('direct:conversation', {
            eventKey: 'message:created',
            conversationId: normalizedConversationId,
            conversation: entry.summary
          });
        });

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('[Chat] Error sending direct message:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('direct:reaction', async (data, callback) => {
      try {
        const { messageId, emoji } = data || {};
        if (!messageId || !emoji) {
          if (callback) callback({ success: false, error: 'Message ID and emoji are required' });
          return;
        }

        const result = await directChatService.toggleReaction(messageId, emoji, userId, true);
        const message = await DirectMessage.findById(messageId);
        if (message) {
          const normalizedConversationId = normalizeId(message.conversationId);
          const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
          const messageData = result.message?.toObject ? result.message.toObject() : result.message;
          namespace.in(roomName).emit('direct:reaction', {
            type: result.added ? 'added' : 'removed',
            conversationId: normalizedConversationId,
            messageId,
            emoji,
            userId,
            message: messageData
          });
        }

        if (callback) callback({ success: true, ...result });
      } catch (error) {
        console.error('[Chat] Error toggling direct reaction:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('direct:edit', async (data, callback) => {
      try {
        const { messageId, content } = data || {};
        if (!messageId || !content) {
          if (callback) callback({ success: false, error: 'Message ID and content are required' });
          return;
        }

        const message = await directChatService.editMessage(messageId, userId, content, true);
        const normalizedConversationId = normalizeId(message.conversationId);
        const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
        const messageData = message.toObject ? message.toObject() : message;

        namespace.in(roomName).emit('direct:message', {
          type: 'edited',
          conversationId: normalizedConversationId,
          message: messageData
        });

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('[Chat] Error editing direct message:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('direct:delete', async (data, callback) => {
      try {
        const { messageId } = data || {};
        if (!messageId) {
          if (callback) callback({ success: false, error: 'Message ID is required' });
          return;
        }

        const message = await directChatService.deleteMessage(messageId, userId, true);
        const normalizedConversationId = normalizeId(message.conversationId);
        const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
        const messageData = message.toObject ? message.toObject() : message;

        namespace.in(roomName).emit('direct:message', {
          type: 'deleted',
          conversationId: normalizedConversationId,
          message: messageData
        });

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('[Chat] Error deleting direct message:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('direct:typing', (data = {}) => {
      const { conversationId, isTyping } = data;
      if (!conversationId) {
        return;
      }

      const normalizedConversationId = normalizeId(conversationId);
      const roomName = `${DIRECT_ROOM_PREFIX}${normalizedConversationId}`;
      socket.to(roomName).emit('direct:typing', {
        userId,
        conversationId: normalizedConversationId,
        isTyping: Boolean(isTyping)
      });
    });

    // Send message
    socket.on('chat:send', async (data, callback) => {
      try {
        const { groupId, content, replyTo, attachments } = data;

        if (!groupId) {
          if (callback) callback({ success: false, error: 'Group ID is required' });
          return;
        }

        console.log(`[Chat] User ${userId} sending message to group ${groupId}`);

        // Create message using service (skip realtime emit, we'll emit directly)
        const message = await chatService.createMessage(groupId, userId, {
          content,
          replyTo,
          attachments: attachments || []
        }, true); // skipRealtime = true

        // Convert message to plain object to ensure proper serialization
        let messageData;
        if (message.toObject) {
          messageData = message.toObject({ virtuals: true });
        } else if (message.toJSON) {
          messageData = message.toJSON();
        } else {
          messageData = JSON.parse(JSON.stringify(message));
        }
        
        // Normalize groupId to ensure consistent room name
        const normalizedGroupId = normalizeId(groupId);
        const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
        
        console.log(`[Chat] Broadcasting message to room: ${roomName}`);
        
        // Get sockets in room for debugging
        const socketsInRoom = await namespace.in(roomName).fetchSockets();
        console.log(`[Chat] Sockets in room ${roomName}: ${socketsInRoom.length}`);
        socketsInRoom.forEach(s => {
          console.log(`  - Socket ${s.id}, userId: ${s.data.userId}`);
        });
        
        // Broadcast to all members in the group room (including sender)
        // Use .in() to include all sockets in the room, including the sender
        const eventData = {
          type: 'new',
          message: messageData
        };
        
        console.log(`[Chat] Emitting to room ${roomName} with data:`, JSON.stringify(eventData).substring(0, 200));
        
        // Get all sockets in room to verify and emit directly
        const allSockets = await namespace.in(roomName).fetchSockets();
        console.log(`[Chat] Found ${allSockets.length} sockets in room ${roomName}`);
        allSockets.forEach(s => {
          console.log(`  - Emitting to socket ${s.id}, userId: ${s.data.userId}`);
        });
        
        // Emit to all sockets in the room using .in() (includes sender)
        namespace.in(roomName).emit('chat:message', eventData);
        
        // Also emit directly to each socket as backup to ensure delivery
        allSockets.forEach(s => {
          s.emit('chat:message', eventData);
        });

        console.log(`[Chat] Message broadcasted successfully to room ${roomName} (${allSockets.length} sockets)`);

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('[Chat] Error sending message:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Toggle reaction
    socket.on('chat:reaction', async (data, callback) => {
      try {
        const { messageId, emoji } = data;

        if (!messageId || !emoji) {
          if (callback) callback({ success: false, error: 'Message ID and emoji are required' });
          return;
        }

        // Toggle reaction (skip realtime emit, we'll emit directly)
        const result = await chatService.toggleReaction(messageId, emoji, userId, true);

        // Get message to find groupId
        const message = await GroupMessage.findById(messageId);
        if (message) {
          // Normalize groupId to ensure consistent room name
          const normalizedGroupId = normalizeId(message.groupId);
          const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
          // Convert message to plain object to ensure proper serialization
          const messageData = result.message?.toObject ? result.message.toObject() : result.message;
          // Use .in() instead of .to() to include the sender
          namespace.in(roomName).emit('chat:reaction', {
            type: result.added ? 'added' : 'removed',
            messageId,
            emoji,
            userId,
            message: messageData
          });
        }

        if (callback) callback({ success: true, ...result });
      } catch (error) {
        console.error('[Chat] Error toggling reaction:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Edit message
    socket.on('chat:edit', async (data, callback) => {
      try {
        const { messageId, content } = data;

        if (!messageId || !content) {
          if (callback) callback({ success: false, error: 'Message ID and content are required' });
          return;
        }

        // Edit message (skip realtime emit, we'll emit directly)
        const message = await chatService.editMessage(messageId, userId, content, true);

        // Normalize groupId to ensure consistent room name
        const normalizedGroupId = normalizeId(message.groupId);
        const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
        // Convert message to plain object to ensure proper serialization
        const messageData = message.toObject ? message.toObject() : message;
        // Use .in() instead of .to() to include the sender
        namespace.in(roomName).emit('chat:message', {
          type: 'edited',
          message: messageData
        });

        if (callback) callback({ success: true, message });
      } catch (error) {
        console.error('[Chat] Error editing message:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Delete message
    socket.on('chat:delete', async (data, callback) => {
      try {
        const { messageId } = data;

        if (!messageId) {
          if (callback) callback({ success: false, error: 'Message ID is required' });
          return;
        }

        // Delete message (skip realtime emit, we'll emit directly)
        const message = await chatService.deleteMessage(messageId, userId, true);

        // Normalize groupId to ensure consistent room name
        const normalizedGroupId = normalizeId(message.groupId);
        const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
        // Convert message to plain object to ensure proper serialization
        const messageData = message.toObject ? message.toObject() : message;
        // Use .in() instead of .to() to include the sender
        namespace.in(roomName).emit('chat:message', {
          type: 'deleted',
          message: messageData
        });

        if (callback) callback({ success: true, message });
      } catch (error) {
        console.error('[Chat] Error deleting message:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data) => {
      const { groupId, isTyping } = data;
      if (groupId) {
        // Normalize groupId to ensure consistent room name
        const normalizedGroupId = normalizeId(groupId);
        const roomName = `${GROUP_ROOM_PREFIX}${normalizedGroupId}`;
        socket.to(roomName).emit('chat:typing', {
          userId,
          groupId,
          isTyping
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Chat] User ${userId} disconnected from chat`);
    });
  });
};

module.exports = {
  setupChatHandlers,
  GROUP_ROOM_PREFIX
};

