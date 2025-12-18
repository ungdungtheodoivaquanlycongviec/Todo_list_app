import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle, View } from 'react-native';

interface MentionHighlightProps {
  content: string;
  mentions?: string[]; // User IDs that were mentioned
  currentUserId?: string; // To highlight "you" differently
  mentionedNames?: string[]; // Display names that were mentioned (for @name matching)
  isOwnMessage?: boolean; // True if this is the current user's message
  style?: StyleProp<TextStyle>; // Replaces className
}

// Regex to match mention formats: @[display name](id)
const LEGACY_MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

export default function MentionHighlight({
  content,
  mentions = [],
  currentUserId,
  mentionedNames = [],
  isOwnMessage = false,
  style,
}: MentionHighlightProps) {
  
  // --- Style Logic Helper ---
  // Chuyển đổi logic Tailwind sang StyleSheet object
  const getMentionStyle = (
    isEveryone: boolean,
    isCurrentUser: boolean,
    isRole: boolean
  ) => {
    // 1. Nếu là tin nhắn của chính mình (nền xanh), highlight màu trắng mờ
    if (isOwnMessage) {
      if (isEveryone) return styles.ownMessageEveryone;
      return styles.ownMessageMention;
    }

    // 2. Tin nhắn nhận được (nền xám/trắng)
    if (isEveryone) return styles.receivedEveryone;
    if (isCurrentUser) return styles.receivedCurrentUser;
    if (isRole) return styles.receivedRole;
    
    // Mặc định cho mention người khác
    return styles.receivedUser;
  };

  // --- Render Logic ---

  const renderContent = () => {
    if (!content) return null;

    // First check for legacy @[name](id) format
    LEGACY_MENTION_REGEX.lastIndex = 0;
    if (LEGACY_MENTION_REGEX.test(content)) {
      return renderLegacyFormat();
    }

    // For plain @name format
    return renderSimpleFormat();
  };

  // Render legacy @[name](id) format
  const renderLegacyFormat = () => {
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    LEGACY_MENTION_REGEX.lastIndex = 0;
    while ((match = LEGACY_MENTION_REGEX.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const displayName = match[1];
      const id = match[2];
      const isCurrentUser = currentUserId ? id === currentUserId : false;
      const isRole = id.startsWith('role:');
      const isEveryone = displayName.toLowerCase() === 'everyone';

      const mentionStyle = getMentionStyle(isEveryone, isCurrentUser, isRole);

      parts.push(
        <Text key={`mention-${match.index}`} style={[styles.baseMention, mentionStyle]}>
          @{displayName}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Render simple @name format
  const renderSimpleFormat = () => {
    if (mentionedNames.length === 0) {
      return highlightSimpleAtMentions();
    }

    // Build a list of known mentions to look for
    const knownMentions = [...mentionedNames, 'everyone'];
    // Sort by length descending
    knownMentions.sort((a, b) => b.length - a.length);

    const escapedNames = knownMentions.map((name) =>
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = new RegExp(`@(${escapedNames.join('|')})(?=\\s|$|[,\\.!?])`, 'gi');

    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const mentionText = match[1];
      const isEveryone = mentionText.toLowerCase() === 'everyone';
      
      // Simple format doesn't have IDs, so we can't strictly check isCurrentUser/isRole easily 
      // without extra lookup logic, defaulting to generic user styling unless everyone.
      const mentionStyle = getMentionStyle(isEveryone, false, false);

      parts.push(
        <Text key={`mention-${match.index}`} style={[styles.baseMention, mentionStyle]}>
          @{mentionText}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Fallback highlight all @ mentions
  const highlightSimpleAtMentions = () => {
    const pattern = /@([^@\n]+)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      let mentionText = match[1].trim();
      mentionText = mentionText.replace(/[,\.\!\?]+$/, '');

      const isEveryone = mentionText.toLowerCase() === 'everyone';
      const isMention = mentionText.length > 0 && !/^[0-9]+$/.test(mentionText);

      if (isMention) {
        const mentionStyle = getMentionStyle(isEveryone, false, false);

        parts.push(
          <Text key={`mention-${match.index}`} style={[styles.baseMention, mentionStyle]}>
            @{mentionText}
          </Text>
        );

        const fullMatch = match[1];
        const remaining = fullMatch.slice(mentionText.length);
        if (remaining.trim()) {
          parts.push(remaining);
        }
      } else {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <Text style={[styles.textContainer, style]}>
      {renderContent()}
    </Text>
  );
}

// --- Helper Functions (Giữ nguyên logic nhưng export chuẩn TS) ---

export const getMentionDisplayText = (content: string): string => {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
};

export const extractMentionedUserIds = (content: string): string[] => {
  const ids: string[] = []
  let match

  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = regex.exec(content)) !== null) {
      const id = match[2]
      if (!id.startsWith('role:')) {
          ids.push(id)
      }
  }

  return ids
}

export const extractMentionedRoles = (content: string): string[] => {
  const roles: string[] = []
  let match

  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = regex.exec(content)) !== null) {
      const id = match[2]
      if (id.startsWith('role:')) {
          roles.push(id.replace('role:', ''))
      }
  }

  return roles
}

// --- Styles ---
const styles = StyleSheet.create({
  textContainer: {
    // Tương đương whitespace-pre-wrap break-words
    // React Native mặc định wrap text
  },
  baseMention: {
    fontWeight: '600', // font-medium/semibold
    // px-1 rounded: Trong RN Text không hỗ trợ padding/borderRadius tốt nếu không lồng View,
    // nhưng background color vẫn hoạt động trên Text (trên iOS/Android mới).
    // Nếu muốn padding chuẩn, cần backgroundColor phủ lên.
  },
  
  // -- OWN MESSAGE STYLES (Trên nền xanh) --
  ownMessageMention: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // bg-white/20
    color: '#FFFFFF',
  },
  ownMessageEveryone: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // bg-white/30
    color: '#FFFFFF',
  },

  // -- RECEIVED MESSAGE STYLES (Trên nền trắng/xám) --
  // Colors mapped from Tailwind approximations
  receivedEveryone: {
    backgroundColor: '#FEE2E2', // bg-red-100
    color: '#B91C1C', // text-red-700
  },
  receivedCurrentUser: {
    backgroundColor: '#DCFCE7', // bg-green-100
    color: '#15803D', // text-green-700
  },
  receivedRole: {
    backgroundColor: '#F3E8FF', // bg-purple-100
    color: '#7E22CE', // text-purple-700
  },
  receivedUser: {
    backgroundColor: '#DBEAFE', // bg-blue-100
    color: '#1D4ED8', // text-blue-700
  },
});