import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageSquare, Send, X, Sparkles } from 'lucide-react-native'; // Sparkles thay cho icon svg ngôi sao
import { useAuth } from '../../context/AuthContext';
import { useUIState } from '../../context/UIStateContext';

// CẤU HÌNH API:
// Lưu ý: Nếu chạy trên Android Emulator, localhost phải là 'http://10.0.2.2:5000'
// Nếu chạy trên máy thật, hãy dùng IP LAN của máy tính: 'http://192.168.1.x:5000'
const CHATBOT_API_URL = 'http://10.0.2.2:5000'; 

interface Message {
  name: string;
  message: string;
}

interface ChatbotWidgetProps {
  hidden?: boolean;
}

export default function ChatbotWidget({ hidden = false }: ChatbotWidgetProps) {
  const { user } = useAuth();
  // Giả sử context UIState bên mobile có logic tương tự, nếu không có thể bỏ qua
  const { isTaskDetailOpen } = useUIState ? useUIState() : { isTaskDetailOpen: false };
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, isOpen]);

  const getToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('accessToken');
    } catch (error) {
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const currentMsg = inputMessage;
    const userMessage: Message = { name: 'User', message: currentMsg };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = await getToken();
      // Logic fetch giữ nguyên, chỉ thay đổi URL nếu cần thiết cho mobile env
      const response = await fetch(`${CHATBOT_API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMsg,
          token: token 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();
      const botMessage: Message = { name: 'Bot', message: data.answer || 'Xin lỗi, tôi không thể trả lời câu hỏi này.' };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        name: 'Bot',
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng kiểm tra kết nối mạng.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && messages.length === 0) {
      // Logic Welcome Message giữ nguyên từ bản Web
      const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

      let welcomeText = `Xin chào ${user?.name || 'bạn'}! Tôi là trợ lý ảo của bạn.`;

      if (isAdmin) {
        welcomeText += ` Tôi có thể giúp bạn với các câu hỏi về quản trị hệ thống, quản lý người dùng, và nhiều điều khác. Bạn cần giúp gì không?`;
      } else {
        welcomeText += ` Tôi có thể giúp bạn kiểm tra tasks, hỏi về lịch làm việc và nhiều điều khác. Bạn cần giúp gì không?`;
      }

      const welcomeMessage: Message = {
        name: 'Bot',
        message: welcomeText
      };
      setMessages([welcomeMessage]);
    }
  };

  // Điều kiện render giống hệt bản Web
 // if (!user || hidden || isTaskDetailOpen) {
 //   return null;
 // }

  // Render từng tin nhắn
  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.name === 'User';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        <View style={[
          styles.messageBubble, 
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* 1. Nút mở Chat (Floating Button) */}
      {!isOpen && (
        <TouchableOpacity
          onPress={toggleChat}
          style={styles.floatingButton}
          activeOpacity={0.8}
        >
          <Sparkles color="#fff" size={20} />
          <Text style={styles.floatingButtonText}>AI</Text>
        </TouchableOpacity>
      )}

      {/* 2. Modal Chat Window */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isOpen}
        onRequestClose={toggleChat} // Xử lý nút Back cứng trên Android
      >
        <View style={styles.modalOverlay}>
          {/* Vùng bấm ra ngoài để đóng modal */}
          <TouchableOpacity 
            style={styles.backdrop} 
            activeOpacity={1} 
            onPress={() => setIsOpen(false)}
          />

          {/* Container chính của Chat */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.chatContainer}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <View style={styles.iconContainer}>
                  <MessageSquare size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                  <Text style={styles.headerSubtitle}>Tôi có thể giúp gì cho bạn?</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChat} style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Danh sách tin nhắn */}
            <View style={styles.listContainer}>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
              {/* Loading Indicator bên trong list */}
              {loading && (
                <View style={styles.loadingContainer}>
                   <View style={[styles.messageBubble, styles.botBubble]}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                   </View>
                </View>
              )}
            </View>

            {/* Khu vực nhập liệu */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#9CA3AF"
                editable={!loading}
                multiline={false} // Chỉnh thành true nếu muốn cho phép xuống dòng
                onSubmitEditing={sendMessage} // Enter để gửi
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!inputMessage.trim() || loading}
                style={[
                  styles.sendButton,
                  (!inputMessage.trim() || loading) && styles.sendButtonDisabled
                ]}
              >
                <Send size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// STYLES - Tái hiện lại giao diện Tailwind bằng StyleSheet
const styles = StyleSheet.create({
  // Nút nổi bên phải
  floatingButton: {
    position: 'absolute',
    bottom: 80, // Điều chỉnh tùy theo TabBar của bạn
    right: 0,
    backgroundColor: '#3B82F6', // Blue-500
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 50,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  floatingButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)', // Làm mờ nền sau lưng
  },
  backdrop: {
    flex: 1, // Khoảng trống phía trên chatbox
  },
  chatContainer: {
    height: '80%', // Chiếm 80% màn hình
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    elevation: 10,
  },

  // Header
  header: {
    backgroundColor: '#3B82F6', // Tạm dùng màu solid thay cho gradient
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },

  // List tin nhắn
  listContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6', // gray-100
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#3B82F6', // Blue-500
    borderTopRightRadius: 2,
  },
  botBubble: {
    backgroundColor: '#E5E7EB', // Gray-200
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#111827', // Gray-900
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12, // Xử lý iPhone tai thỏ
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    color: '#000',
    height: 40,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
});