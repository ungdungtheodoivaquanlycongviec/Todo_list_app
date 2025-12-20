import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle, View, useColorScheme } from 'react-native';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // --- Style Logic Helper ---
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

    // 2. Tin nhắn nhận được với Light/Dark mode
    if (isEveryone) {
      return isDark ? styles.receivedEveryoneDark : styles.receivedEveryoneLight;
    }
    if (isCurrentUser) {
      return isDark ? styles.receivedCurrentUserDark : styles.receivedCurrentUserLight;
    }
    if (isRole) {
      return isDark ? styles.receivedRoleDark : styles.receivedRoleLight;
    }
    
    // Mặc định cho mention người khác
    return isDark ? styles.receivedUserDark : styles.receivedUserLight;
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

// --- Helper Functions (Giống hệt bản Web) ---

export const getMentionDisplayText = (content: string): string => {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
};

export const extractMentionedUserIds = (content: string): string[] => {
  const ids: string[] = [];
  let match;

  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = regex.exec(content)) !== null) {
      const id = match[2];
      if (!id.startsWith('role:')) {
          ids.push(id);
      }
  }

  return ids;
};

export const extractMentionedRoles = (content: string): string[] => {
  const roles: string[] = [];
  let match;

  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = regex.exec(content)) !== null) {
      const id = match[2];
      if (id.startsWith('role:')) {
          roles.push(id.replace('role:', ''));
      }
  }

  return roles;
};

// --- Styles với Dark Mode Support ---
const styles = StyleSheet.create({
  textContainer: {
    flexWrap: 'wrap',
  },
  baseMention: {
    fontWeight: '600',
    borderRadius: 4,
    overflow: 'hidden', // Để borderRadius hoạt động với background
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

  // -- RECEIVED MESSAGE STYLES - LIGHT MODE --
  receivedEveryoneLight: {
    backgroundColor: '#FEE2E2', // bg-red-100
    color: '#B91C1C', // text-red-700
  },
  receivedCurrentUserLight: {
    backgroundColor: '#DCFCE7', // bg-green-100
    color: '#15803D', // text-green-700
  },
  receivedRoleLight: {
    backgroundColor: '#F3E8FF', // bg-purple-100
    color: '#7E22CE', // text-purple-700
  },
  receivedUserLight: {
    backgroundColor: '#DBEAFE', // bg-blue-100
    color: '#1D4ED8', // text-blue-700
  },

  // -- RECEIVED MESSAGE STYLES - DARK MODE --
  receivedEveryoneDark: {
    backgroundColor: 'rgba(153, 27, 27, 0.3)', // dark:bg-red-900/30
    color: '#FCA5A5', // dark:text-red-400
  },
  receivedCurrentUserDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.3)', // dark:bg-green-900/30
    color: '#34D399', // dark:text-green-400
  },
  receivedRoleDark: {
    backgroundColor: 'rgba(76, 29, 149, 0.3)', // dark:bg-purple-900/30
    color: '#C084FC', // dark:text-purple-400
  },
  receivedUserDark: {
    backgroundColor: 'rgba(30, 58, 138, 0.3)', // dark:bg-blue-900/30
    color: '#93C5FD', // dark:text-blue-400
  },
});