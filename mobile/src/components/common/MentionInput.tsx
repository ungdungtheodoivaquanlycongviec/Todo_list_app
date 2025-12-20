import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  StyleProp,
  ViewStyle,
  TextStyle,
  Keyboard,
  Pressable,
  Dimensions,
  Modal,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import * as LucideIcons from 'lucide-react-native';

const { ChevronUp, ChevronDown, X } = LucideIcons;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Types & Interfaces (Giữ nguyên từ bản Web) ---

export interface MentionableUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  mentionableUsers: MentionableUser[];
  mentionableRoles?: string[];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean;
  maxLength?: number;
}

interface MentionSuggestion {
  type: 'user' | 'role';
  id: string;
  display: string;
  subtext?: string;
  avatar?: string;
}

// --- Helper Functions (ĐẦY ĐỦ như bản Web) ---

export const parseMentions = (content: string): { userIds: string[], roleNames: string[] } => {
  const userIds: string[] = [];
  const roleNames: string[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const id = match[2];
    if (id.startsWith('role:')) {
      roleNames.push(id.replace('role:', ''));
    } else {
      userIds.push(id);
    }
  }
  return { userIds, roleNames };
};

export const parseMentionsByName = (
  content: string,
  mentionableUsers: MentionableUser[],
  mentionableRoles: string[] = []
): { userIds: string[], roleNames: string[] } => {
  const userIds: string[] = [];
  const roleNames: string[] = [];

  if (!content) return { userIds, roleNames };

  // First check for @[name](id) format (legacy)
  const legacyResult = parseMentions(content);
  if (legacyResult.userIds.length > 0 || legacyResult.roleNames.length > 0) {
    return legacyResult;
  }

  // Match @name pattern (name can contain spaces until next @ or end of string)
  // Look for @followed by text that matches a known user/role name
  for (const user of mentionableUsers) {
    const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`@${escapedName}(?:\\s|$|,|\\.|!|\\?)`, 'gi');
    if (regex.test(content)) {
      if (!userIds.includes(user._id)) {
        userIds.push(user._id);
      }
    }
  }

  for (const role of mentionableRoles) {
    const displayRole = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const escapedRole = displayRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`@${escapedRole}(?:\\s|$|,|\\.|!|\\?)`, 'gi');
    if (regex.test(content)) {
      if (!roleNames.includes(role)) {
        roleNames.push(role);
      }
    }
  }

  return { userIds, roleNames };
};

export const mentionsToPlainText = (content: string): string => {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
};

export const hasMentions = (content: string): boolean => {
  return /@\[([^\]]+)\]\([^)]+\)/.test(content) || /@\w/.test(content);
};

// --- Component Chính ---

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a message...",
  mentionableUsers,
  mentionableRoles = [],
  disabled = false,
  style,
  inputStyle,
  multiline = false,
  numberOfLines = 3,
  autoFocus = false,
  maxLength,
}: MentionInputProps) {
  // State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // --- Logic tạo danh sách gợi ý ---
  const getAllSuggestions = useCallback((): MentionSuggestion[] => {
    const everyoneSuggestion: MentionSuggestion = {
      type: 'role',
      id: 'everyone',
      display: 'everyone',
      subtext: 'Notify all members',
    };

    const userSuggestions: MentionSuggestion[] = mentionableUsers.map(user => ({
      type: 'user',
      id: user._id,
      display: user.name,
      subtext: user.email,
      avatar: user.avatar,
    }));

    const roleSuggestions: MentionSuggestion[] = mentionableRoles.map(role => ({
      type: 'role',
      id: `role:${role}`,
      display: role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      subtext: 'Role',
    }));

    return [everyoneSuggestion, ...userSuggestions, ...roleSuggestions];
  }, [mentionableUsers, mentionableRoles]);

  // --- Logic lọc gợi ý ---
  const filterSuggestions = useCallback((query: string) => {
    const all = getAllSuggestions();
    if (!query) {
      setSuggestions(all.slice(0, 8)); // Giới hạn 8 kết quả
      return;
    }

    const lowQuery = query.toLowerCase();
    const filtered = all.filter(suggestion =>
      suggestion.display.toLowerCase().includes(lowQuery) ||
      (suggestion.subtext && suggestion.subtext.toLowerCase().includes(lowQuery))
    ).slice(0, 8);

    setSuggestions(filtered);
    setSelectedIndex(0); // Reset về đầu khi filter
  }, [getAllSuggestions]);

  // --- Xử lý thay đổi text ---
  const handleChangeText = (text: string) => {
    onChange(text);
  };

  // --- Theo dõi value và cursor để kích hoạt gợi ý ---
  useEffect(() => {
    if (cursorPosition < 0 || !value) return;

    let mentionStart = -1;
    // Quét ngược từ con trỏ
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = value[i];
      if (char === '@') {
        if (i === 0 || /\s/.test(value[i - 1])) {
          mentionStart = i;
          break;
        }
      }
      if (/\s/.test(char)) break; // Dừng nếu gặp khoảng trắng
    }

    if (mentionStart >= 0) {
      const query = value.slice(mentionStart + 1, cursorPosition);
      // Không hiện nếu query chứa ký tự đặc biệt của legacy format
      if (!query.includes(']') && !query.includes('(')) {
        setMentionStartIndex(mentionStart);
        setMentionQuery(query);
        filterSuggestions(query);
        setShowSuggestions(true);
        return;
      }
    }

    setShowSuggestions(false);
    setMentionStartIndex(-1);
  }, [value, cursorPosition, filterSuggestions]);

  // --- Cập nhật vị trí con trỏ ---
  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // --- Chèn Mention khi chọn ---
  const insertMention = (suggestion: MentionSuggestion) => {
    if (mentionStartIndex < 0) return;

    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(cursorPosition);

    const mention = `@${suggestion.display} `;
    const newValue = before + mention + after;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStartIndex(-1);

    // Focus lại input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Tính vị trí cursor mới
        const newCursorPos = before.length + mention.length;
        inputRef.current.setNativeProps({
          selection: { start: newCursorPos, end: newCursorPos }
        });
      }
    }, 10);
  };

  // --- Keyboard Navigation (giống web) ---
  const handleKeyPress = (e: any) => {
    if (showSuggestions && suggestions.length > 0) {
      const key = e.nativeEvent.key;
      
      switch (key) {
        case 'ArrowDown':
          e.preventDefault?.();
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault?.();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (!e.nativeEvent.shiftKey) {
            e.preventDefault?.();
            insertMention(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault?.();
          setShowSuggestions(false);
          break;
        case 'Tab':
          e.preventDefault?.();
          insertMention(suggestions[selectedIndex]);
          break;
      }
    }
  };

  // --- Scroll suggestion được chọn vào view ---
  useEffect(() => {
    if (showSuggestions && suggestions.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewPosition: 0.5
        });
      }, 50);
    }
  }, [selectedIndex, showSuggestions, suggestions.length]);

  // --- Đóng suggestions khi click ra ngoài (mobile) ---
  useEffect(() => {
    const hideKeyboard = Keyboard.addListener('keyboardDidHide', () => {
      setShowSuggestions(false);
    });

    return () => {
      hideKeyboard.remove();
    };
  }, []);

  // --- Xử lý keyboard height ---
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // --- Render Item trong danh sách gợi ý ---
  const renderSuggestionItem = ({ item, index }: { item: MentionSuggestion; index: number }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === selectedIndex && styles.selectedSuggestionItem
      ]}
      onPress={() => insertMention(item)}
      activeOpacity={0.7}
    >
      {/* Avatar / Icon */}
      <View style={[
        styles.avatarContainer,
        item.type === 'role' ? styles.roleAvatarBg : styles.userAvatarBg
      ]}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={[
            styles.avatarText,
            item.type === 'role' ? styles.roleAvatarText : styles.userAvatarText
          ]}>
            {item.type === 'role' ? '#' : item.display.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionName} numberOfLines={1}>
          {item.display}
        </Text>
        {item.subtext && (
          <Text style={styles.suggestionSubtext} numberOfLines={1}>
            {item.subtext}
          </Text>
        )}
      </View>

      {/* Role Badge */}
      {item.type === 'role' && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Role</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // --- Handle Submit (cho single line) ---
  const handleSubmitEditing = () => {
    if (!multiline && onSubmit) {
      onSubmit();
    }
  };

  // --- Render Suggestions Modal (cho mobile) ---
  const renderSuggestionsModal = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <Modal
        transparent={true}
        visible={showSuggestions}
        animationType="slide"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSuggestions(false)}>
          <View style={styles.modalOverlay}>
            <View 
              style={[
                styles.suggestionsModalContainer,
                { bottom: keyboardHeight + 10 }
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Mention</Text>
                <TouchableOpacity
                  onPress={() => setShowSuggestions(false)}
                  style={styles.closeButton}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                ref={flatListRef}
                data={suggestions}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestionItem}
                keyboardShouldPersistTaps="always"
                style={styles.suggestionsList}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                getItemLayout={(data, index) => ({
                  length: 60,
                  offset: 60 * index,
                  index,
                })}
              />
              
              <View style={styles.modalFooter}>
                <Text style={styles.modalFooterText}>
                  Use ↑↓ arrows to navigate, Enter to select
                </Text>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Input Field */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        autoFocus={autoFocus}
        style={[
          styles.input,
          multiline && { 
            minHeight: Math.max(40, numberOfLines * 20),
            textAlignVertical: 'top',
            paddingTop: 12
          },
          inputStyle
        ]}
        onSubmitEditing={handleSubmitEditing}
        blurOnSubmit={!multiline}
        returnKeyType={multiline ? 'default' : 'send'}
      />

      {/* Suggestions Modal (Mobile) */}
      {renderSuggestionsModal()}

      {/* Inline Suggestions (cho web/tablet) */}
      {Platform.OS === 'web' && showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { bottom: '100%' }]}>
          <FlatList
            ref={flatListRef}
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={renderSuggestionItem}
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  
  // Modal Styles (Mobile)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  suggestionsModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    width: '100%',
    position: 'absolute',
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Inline Suggestions (Web/Tablet)
  suggestionsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 999,
  },
  suggestionsList: {
    flexGrow: 0,
  },
  
  // Suggestion Item
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedSuggestionItem: {
    backgroundColor: '#EFF6FF', // bg-blue-50
  },
  
  // Avatar Styles
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarBg: { 
    backgroundColor: '#DBEAFE',
  },
  roleAvatarBg: { 
    backgroundColor: '#F3E8FF',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userAvatarText: { 
    color: '#1D4ED8',
  },
  roleAvatarText: { 
    color: '#7E22CE',
  },

  // Text Styles
  suggestionInfo: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  suggestionSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Badge Styles
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '600',
  },
});