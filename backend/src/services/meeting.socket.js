const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toString) return value.toString();
  return null;
};

const MEETING_ROOM_PREFIX = 'meeting:';
const GROUP_MEETING_PREFIX = 'meeting:group:';
const DIRECT_MEETING_PREFIX = 'meeting:direct:';
const GROUP_ROOM_PREFIX = 'group:';
const DIRECT_ROOM_PREFIX = 'direct:';
const USER_ROOM_PREFIX = 'user:';

// Import models
const Group = require('../models/Group.model');
const DirectConversation = require('../models/DirectConversation.model');

/**
 * Setup meeting socket handlers
 * @param {Object} namespace - Socket.IO namespace
 */
const setupMeetingHandlers = (namespace) => {
  namespace.on('connection', async (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      return;
    }

    // Join meeting room (group or direct)
    socket.on('meeting:join', async (data, callback) => {
      try {
        const { meetingId, type, groupId, conversationId } = data;

        if (!meetingId || !type) {
          if (callback) callback({ success: false, error: 'Meeting ID and type are required' });
          return;
        }

        let roomName;
        if (type === 'group') {
          if (!groupId) {
            if (callback) callback({ success: false, error: 'Group ID is required for group meetings' });
            return;
          }
          roomName = `${GROUP_MEETING_PREFIX}${normalizeId(groupId)}`;
        } else if (type === 'direct') {
          if (!conversationId) {
            if (callback) callback({ success: false, error: 'Conversation ID is required for direct meetings' });
            return;
          }
          roomName = `${DIRECT_MEETING_PREFIX}${normalizeId(conversationId)}`;
        } else {
          if (callback) callback({ success: false, error: 'Invalid meeting type' });
          return;
        }

        await socket.join(roomName);
        
        // Get all users in the meeting
        const socketsInRoom = await namespace.in(roomName).fetchSockets();
        const participants = socketsInRoom.map(s => ({
          userId: s.data.userId,
          socketId: s.id
        }));

        // Check if this is the first person joining (meeting just started)
        const isFirstParticipant = participants.length === 1;

        // Notify others in the meeting room that a new user joined
        socket.to(roomName).emit('meeting:user-joined', {
          userId,
          meetingId,
          socketId: socket.id
        });

        // If this is the first participant, notify all potential participants about the incoming call
        if (isFirstParticipant) {
          if (type === 'group' && groupId) {
            try {
              const group = await Group.findById(groupId).populate('members.userId', 'name email');
              if (group && group.members) {
                const normalizedUserId = normalizeId(userId);
                const otherMembers = group.members.filter(
                  member => normalizeId(member.userId?._id || member.userId) !== normalizedUserId
                );

                // Notify each member individually
                otherMembers.forEach(member => {
                  const memberId = normalizeId(member.userId?._id || member.userId);
                  if (memberId) {
                    const userRoom = `${USER_ROOM_PREFIX}${memberId}`;
                    namespace.to(userRoom).emit('meeting:incoming-call', {
                      meetingId,
                      type: 'group',
                      groupId,
                      callerId: userId,
                      callerName: socket.data.userName || 'Someone',
                      groupName: group.name
                    });
                  }
                });

                // Also notify via group chat room
                const groupChatRoom = `${GROUP_ROOM_PREFIX}${normalizeId(groupId)}`;
                namespace.to(groupChatRoom).emit('meeting:incoming-call', {
                  meetingId,
                  type: 'group',
                  groupId,
                  callerId: userId,
                  callerName: socket.data.userName || 'Someone',
                  groupName: group.name
                });
              }
            } catch (error) {
              console.error('[Meeting] Error notifying group members:', error);
            }
          } else if (type === 'direct' && conversationId) {
            try {
              const conversation = await DirectConversation.findById(conversationId).populate('participants', 'name email');
              if (conversation && conversation.participants) {
                const normalizedUserId = normalizeId(userId);
                const otherParticipant = conversation.participants.find(
                  p => normalizeId(p._id || p) !== normalizedUserId
                );

                if (otherParticipant) {
                  const otherParticipantId = normalizeId(otherParticipant._id || otherParticipant);
                  if (otherParticipantId) {
                    const userRoom = `${USER_ROOM_PREFIX}${otherParticipantId}`;
                    namespace.to(userRoom).emit('meeting:incoming-call', {
                      meetingId,
                      type: 'direct',
                      conversationId,
                      callerId: userId,
                      callerName: socket.data.userName || 'Someone'
                    });

                    // Also notify via direct chat room
                    const directChatRoom = `${DIRECT_ROOM_PREFIX}${normalizeId(conversationId)}`;
                    namespace.to(directChatRoom).emit('meeting:incoming-call', {
                      meetingId,
                      type: 'direct',
                      conversationId,
                      callerId: userId,
                      callerName: socket.data.userName || 'Someone'
                    });
                  }
                }
              }
            } catch (error) {
              console.error('[Meeting] Error notifying direct conversation participant:', error);
            }
          }
        }

        if (callback) {
          callback({
            success: true,
            meetingId,
            roomName,
            participants
          });
        }

        console.log(`[Meeting] User ${userId} joined meeting ${meetingId} (${type})`);
      } catch (error) {
        console.error('[Meeting] Error joining meeting:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Leave meeting room
    socket.on('meeting:leave', async (data, callback) => {
      try {
        const { meetingId, type, groupId, conversationId } = data;

        let roomName;
        if (type === 'group' && groupId) {
          roomName = `${GROUP_MEETING_PREFIX}${normalizeId(groupId)}`;
        } else if (type === 'direct' && conversationId) {
          roomName = `${DIRECT_MEETING_PREFIX}${normalizeId(conversationId)}`;
        } else {
          if (callback) callback({ success: false, error: 'Invalid meeting data' });
          return;
        }

        await socket.leave(roomName);

        // Notify others that user left
        socket.to(roomName).emit('meeting:user-left', {
          userId,
          meetingId,
          socketId: socket.id
        });

        if (callback) {
          callback({ success: true });
        }

        console.log(`[Meeting] User ${userId} left meeting ${meetingId}`);
      } catch (error) {
        console.error('[Meeting] Error leaving meeting:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // WebRTC signaling: Offer
    socket.on('meeting:offer', async (data) => {
      try {
        const { meetingId, type, groupId, conversationId, offer, targetSocketId } = data;

        let roomName;
        if (type === 'group' && groupId) {
          roomName = `${GROUP_MEETING_PREFIX}${normalizeId(groupId)}`;
        } else if (type === 'direct' && conversationId) {
          roomName = `${DIRECT_MEETING_PREFIX}${normalizeId(conversationId)}`;
        } else {
          return;
        }

        // Send offer to specific target or broadcast to room
        if (targetSocketId) {
          socket.to(targetSocketId).emit('meeting:offer', {
            fromUserId: userId,
            fromSocketId: socket.id,
            offer,
            meetingId
          });
        } else {
          socket.to(roomName).emit('meeting:offer', {
            fromUserId: userId,
            fromSocketId: socket.id,
            offer,
            meetingId
          });
        }
      } catch (error) {
        console.error('[Meeting] Error handling offer:', error);
      }
    });

    // WebRTC signaling: Answer
    socket.on('meeting:answer', async (data) => {
      try {
        const { meetingId, type, groupId, conversationId, answer, targetSocketId } = data;

        let roomName;
        if (type === 'group' && groupId) {
          roomName = `${GROUP_MEETING_PREFIX}${normalizeId(groupId)}`;
        } else if (type === 'direct' && conversationId) {
          roomName = `${DIRECT_MEETING_PREFIX}${normalizeId(conversationId)}`;
        } else {
          return;
        }

        // Send answer to specific target
        if (targetSocketId) {
          socket.to(targetSocketId).emit('meeting:answer', {
            fromUserId: userId,
            fromSocketId: socket.id,
            answer,
            meetingId
          });
        }
      } catch (error) {
        console.error('[Meeting] Error handling answer:', error);
      }
    });

    // WebRTC signaling: ICE Candidate
    socket.on('meeting:ice-candidate', async (data) => {
      try {
        const { meetingId, type, groupId, conversationId, candidate, targetSocketId } = data;

        let roomName;
        if (type === 'group' && groupId) {
          roomName = `${GROUP_MEETING_PREFIX}${normalizeId(groupId)}`;
        } else if (type === 'direct' && conversationId) {
          roomName = `${DIRECT_MEETING_PREFIX}${normalizeId(conversationId)}`;
        } else {
          return;
        }

        // Send ICE candidate to specific target or broadcast
        if (targetSocketId) {
          socket.to(targetSocketId).emit('meeting:ice-candidate', {
            fromUserId: userId,
            fromSocketId: socket.id,
            candidate,
            meetingId
          });
        } else {
          socket.to(roomName).emit('meeting:ice-candidate', {
            fromUserId: userId,
            fromSocketId: socket.id,
            candidate,
            meetingId
          });
        }
      } catch (error) {
        console.error('[Meeting] Error handling ICE candidate:', error);
      }
    });

    // Toggle audio/video
    socket.on('meeting:toggle-media', async (data) => {
      try {
        const { meetingId, type, groupId, conversationId, mediaType, enabled } = data;

        let roomName;
        if (type === 'group' && groupId) {
          roomName = `${GROUP_MEETING_PREFIX}${normalizeId(groupId)}`;
        } else if (type === 'direct' && conversationId) {
          roomName = `${DIRECT_MEETING_PREFIX}${normalizeId(conversationId)}`;
        } else {
          return;
        }

        // Broadcast media state change
        socket.to(roomName).emit('meeting:media-state', {
          userId,
          socketId: socket.id,
          mediaType, // 'audio' or 'video'
          enabled,
          meetingId
        });
      } catch (error) {
        console.error('[Meeting] Error toggling media:', error);
      }
    });

    // Handle disconnect - leave all meetings
    socket.on('disconnect', async () => {
      try {
        const rooms = Array.from(socket.rooms);
        const meetingRooms = rooms.filter(room => 
          room.startsWith(GROUP_MEETING_PREFIX) || room.startsWith(DIRECT_MEETING_PREFIX)
        );

        for (const roomName of meetingRooms) {
          await socket.leave(roomName);
          socket.to(roomName).emit('meeting:user-left', {
            userId,
            socketId: socket.id
          });
        }

        console.log(`[Meeting] User ${userId} disconnected from all meetings`);
      } catch (error) {
        console.error('[Meeting] Error handling disconnect:', error);
      }
    });
  });
};

module.exports = {
  setupMeetingHandlers,
  GROUP_MEETING_PREFIX,
  DIRECT_MEETING_PREFIX
};

