const chatService = require('./chat.service');
const Group = require('../models/Group.model');
const GroupMessage = require('../models/GroupMessage.model');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

const GROUP_ROOM_PREFIX = 'group:';

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

        const roomName = `${GROUP_ROOM_PREFIX}${groupId}`;
        await socket.join(roomName);

        if (callback) callback({ success: true, groupId });
        
        console.log(`[Chat] User ${userId} joined group ${groupId}`);
      } catch (error) {
        console.error('[Chat] Error joining group:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Leave group room
    socket.on('chat:leave', async (groupId, callback) => {
      try {
        const roomName = `${GROUP_ROOM_PREFIX}${groupId}`;
        await socket.leave(roomName);

        if (callback) callback({ success: true });
        console.log(`[Chat] User ${userId} left group ${groupId}`);
      } catch (error) {
        console.error('[Chat] Error leaving group:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Send message
    socket.on('chat:send', async (data, callback) => {
      try {
        const { groupId, content, replyTo, attachments } = data;

        if (!groupId) {
          if (callback) callback({ success: false, error: 'Group ID is required' });
          return;
        }

        // Create message using service (skip realtime emit, we'll emit directly)
        const message = await chatService.createMessage(groupId, userId, {
          content,
          replyTo,
          attachments: attachments || []
        }, true); // skipRealtime = true

        // Convert message to plain object to ensure proper serialization
        const messageData = message.toObject ? message.toObject() : message;
        
        // Broadcast to all members in the group room (including sender)
        const roomName = `${GROUP_ROOM_PREFIX}${groupId}`;
        // Use .in() instead of .to() to include the sender
        namespace.in(roomName).emit('chat:message', {
          type: 'new',
          message: messageData
        });

        if (callback) callback({ success: true, message });
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
          const roomName = `${GROUP_ROOM_PREFIX}${message.groupId}`;
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

        const roomName = `${GROUP_ROOM_PREFIX}${message.groupId}`;
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

        const roomName = `${GROUP_ROOM_PREFIX}${message.groupId}`;
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
        const roomName = `${GROUP_ROOM_PREFIX}${groupId}`;
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

