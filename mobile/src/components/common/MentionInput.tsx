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
  Keyboard
} from 'react-native';

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
  numberOfLines?: number; // Thay cho rows
}

interface MentionSuggestion {
  type: 'user' | 'role';
  id: string;
  display: string;
  subtext?: string;
  avatar?: string;
}

// --- Helper Functions (Logic giữ nguyên, chỉ bỏ export nếu không cần dùng ở ngoài) ---

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
}: MentionInputProps) {
  // State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);

  const inputRef = useRef<TextInput>(null);

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
  }, [getAllSuggestions]);

  // --- Xử lý thay đổi text ---
  const handleChangeText = (text: string) => {
    onChange(text);
    
    // Logic tìm '@' dựa trên cursorPosition hiện tại (được cập nhật bởi onSelectionChange)
    // Lưu ý: Trong RN, onChangeText chạy trước khi cursorPosition cập nhật từ state, 
    // nên ta cần tính toán lại vị trí cursor tạm thời.
    // Tuy nhiên, để đơn giản và chính xác, ta sẽ quét lại dựa trên text mới và vị trí ước tính.
    
    // Tìm kiếm '@' gần nhất phía trước con trỏ
    // Vì state cursorPosition có thể chưa kịp cập nhật, ta dùng text.length tạm thời nếu đang gõ ở cuối
    // Để chính xác hơn, logic này nên nằm trong useEffect phụ thuộc vào value và selection.
  };

  // Sử dụng useEffect để theo dõi value và cursorPosition nhằm kích hoạt gợi ý
  useEffect(() => {
    if (cursorPosition < 0) return;

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
    // Phần sau tính từ con trỏ hiện tại
    const after = value.slice(cursorPosition);

    const mention = `@${suggestion.display} `;
    const newValue = before + mention + after;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStartIndex(-1);

    // Focus lại input (nếu bị mất focus do bấm nút)
    // Lưu ý: RN TextInput không hỗ trợ setSelection trực tiếp dễ dàng như Web sau khi render lại
    // Tuy nhiên, việc thay đổi value thường tự đẩy con trỏ về cuối hoặc vị trí hợp lý.
  };

  // --- Render Item trong danh sách gợi ý ---
  const renderSuggestionItem = ({ item }: { item: MentionSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => insertMention(item)}
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
        <Text style={styles.suggestionName} numberOfLines={1}>{item.display}</Text>
        {item.subtext && (
          <Text style={styles.suggestionSubtext} numberOfLines={1}>{item.subtext}</Text>
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

  return (
    <View style={[styles.container, style]}>
      {/* Suggestions List (Popup) - Hiển thị phía trên Input */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={renderSuggestionItem}
            keyboardShouldPersistTaps="always" // Quan trọng: để bấm được khi bàn phím đang mở
            style={styles.suggestionsList}
          />
        </View>
      )}

      {/* Input Field */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          multiline && { minHeight: numberOfLines * 20, textAlignVertical: 'top' }, // Style cho textarea
          inputStyle
        ]}
        onSubmitEditing={(!multiline && onSubmit) ? onSubmit : undefined}
      />
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative', // Để popup định vị tuyệt đối so với container
    zIndex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF', // bg-white
    borderColor: '#D1D5DB', // border-gray-300
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827', // text-gray-900
  },
  
  // Suggestions Popup Styling
  suggestionsContainer: {
    position: 'absolute',
    bottom: '100%', // Hiển thị bên trên input
    left: 0,
    right: 0,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB', // border-gray-200
    elevation: 4, // Shadow Android
    shadowColor: '#000', // Shadow iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200, // Giới hạn chiều cao
    zIndex: 999,
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // border-gray-50
  },
  
  // Avatar Styles
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarBg: { backgroundColor: '#DBEAFE' }, // bg-blue-100
  roleAvatarBg: { backgroundColor: '#F3E8FF' }, // bg-purple-100
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userAvatarText: { color: '#1D4ED8' }, // text-blue-600
  roleAvatarText: { color: '#7E22CE' }, // text-purple-600

  // Text Styles
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  suggestionSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Badge Styles
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  roleBadgeText: {
    fontSize: 10,
    color: '#7E22CE',
    fontWeight: '500',
  },
});