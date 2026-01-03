import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Platform,
  Keyboard
} from 'react-native';

// --- Interfaces ---
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
  suggestionsStyle?: StyleProp<ViewStyle>;
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean;
  maxLength?: number;
  isDark?: boolean;
}

interface MentionSuggestion {
  type: 'user' | 'role';
  id: string;
  display: string;
  subtext?: string;
  avatar?: string;
}

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
  suggestionsStyle,
  multiline = false,
  numberOfLines = 1,
  autoFocus = false,
  maxLength,
  isDark = false
}: MentionInputProps) {
  
  // Colors
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const listBg = isDark ? '#1F2937' : '#FFFFFF';

  // State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);

  const inputRef = useRef<TextInput>(null);

  // Logic tạo danh sách gợi ý
  const getAllSuggestions = useCallback((): MentionSuggestion[] => {
    if (mentionableUsers.length === 0 && mentionableRoles.length === 0) return [];
    
    const everyoneSuggestion: MentionSuggestion = {
      type: 'role', id: 'everyone', display: 'everyone', subtext: 'Notify all members'
    };
    
    const userSuggestions: MentionSuggestion[] = mentionableUsers.map(user => ({
      type: 'user', 
      id: user._id, 
      display: user.name, 
      subtext: user.email, 
      avatar: user.avatar
    }));
    
    const roleSuggestions: MentionSuggestion[] = mentionableRoles.map(role => ({
      type: 'role', 
      id: `role:${role}`, 
      display: role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
      subtext: 'Role'
    }));
    
    const base = mentionableUsers.length > 0 ? [everyoneSuggestion] : [];
    return [...base, ...roleSuggestions, ...userSuggestions];
  }, [mentionableUsers, mentionableRoles]);

  // Logic lọc danh sách
  const filterSuggestions = useCallback((query: string) => {
    const all = getAllSuggestions();
    if (!query) {
      setSuggestions(all.slice(0, 30));
      return;
    }
    const lowQuery = query.toLowerCase();
    const filtered = all.filter(s =>
      s.display.toLowerCase().includes(lowQuery) ||
      (s.subtext && s.subtext.toLowerCase().includes(lowQuery))
    ).slice(0, 30);
    
    setSuggestions(filtered);
  }, [getAllSuggestions]);

  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // Detect Trigger (@)
  useEffect(() => {
    if (!value) {
        setShowSuggestions(false);
        return;
    }

    let mentionStart = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = value[i];
      if (char === '@' && (i === 0 || /\s/.test(value[i - 1]))) {
        mentionStart = i;
        break;
      }
      if (char === '\n') break; 
    }

    if (mentionStart >= 0) {
      const query = value.slice(mentionStart + 1, cursorPosition);
      if (!query.includes(']') && !query.includes('(')) {
        setMentionStartIndex(mentionStart);
        filterSuggestions(query);
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
    setMentionStartIndex(-1);
  }, [value, cursorPosition, filterSuggestions]);

  const insertMention = (suggestion: MentionSuggestion) => {
    if (mentionStartIndex < 0) return;
    
    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(cursorPosition);
    
    const mentionText = `@[${suggestion.display}](${suggestion.id}) `; 
    const newValue = before + mentionText + after;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStartIndex(-1);
  };

  return (
    <View style={[styles.container, style, { zIndex: 9999 }]}>
      
      {showSuggestions && suggestions.length > 0 && (
        <View 
            style={[
                styles.absoluteList, 
                { backgroundColor: listBg, borderColor: borderColor },
                suggestionsStyle
            ]}
        >
          {/* FlatList cần nestedScrollEnabled cho Android */}
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true} 
            style={{ flexGrow: 0 }} // Quan trọng để list không chiếm hết không gian nếu ít item
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.item, { borderBottomColor: borderColor }]} 
                onPress={() => insertMention(item)}
              >
                <View style={[
                  styles.avatar, 
                  { backgroundColor: item.type === 'role' ? '#F3E8FF' : '#DBEAFE' }
                ]}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={{ 
                      fontWeight: 'bold', 
                      color: item.type === 'role' ? '#7E22CE' : '#1D4ED8' 
                    }}>
                      {item.type === 'role' ? '#' : item.display.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.nameText, { color: textColor }]}>
                    {item.display}
                  </Text>
                  <Text style={[styles.subText, { color: subTextColor }]}>
                    {item.subtext}
                  </Text>
                </View>

                {item.type === 'role' && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Role</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onSelectionChange={handleSelectionChange}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoFocus={autoFocus}
        maxLength={maxLength}
        style={[
            styles.input, 
            { color: textColor }, 
            inputStyle
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  input: {
    fontSize: 16,
    padding: 0,
  },
  absoluteList: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 999, // Tăng elevation lên cực đại
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: 'hidden',
    zIndex: 9999, // Tăng zIndex lên cực đại
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  nameText: {
    fontWeight: '500',
    fontSize: 14,
  },
  subText: {
    fontSize: 12,
  },
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    color: '#7E22CE',
    fontWeight: 'bold',
  },
});