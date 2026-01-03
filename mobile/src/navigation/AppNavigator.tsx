import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

// --- 1. IMPORT CÁC CONTEXT CŨ ---
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FolderProvider } from '../context/FolderContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext'; 
import { RegionalProvider } from '../context/RegionalContext'; 
import { TimerProvider } from '../context/TimerContext';

// --- 2. IMPORT CÁC CONTEXT MỚI ---
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { UIStateProvider } from '../context/UIStateContext';

// --- 3. IMPORT CHATBOT (QUAN TRỌNG) ---
import ChatbotWidget from '../components/common/ChatbotWidget'; // Đảm bảo đường dẫn đúng

import AppInterface from '../screens/AppInterface';
import AuthPage from '../screens/AuthPage';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="AppInterface" component={AppInterface} />
      ) : (
        <Stack.Screen name="Auth" component={AuthPage} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    // THỨ TỰ BỌC PROVIDER
    <AuthProvider>
      <LanguageProvider>
        <RegionalProvider>
          <ThemeProvider>
            <UIStateProvider>
              <FolderProvider>
                <TimerProvider>
                  
                  <ConfirmProvider>
                    <ToastProvider>
                      
                      {/* --- PHẦN MÀN HÌNH CHÍNH --- */}
                      <NavigationContainer>
                        <RootNavigator />
                      </NavigationContainer>

                      {/* --- PHẦN OVERLAY (NỔI LÊN TRÊN) --- */}
                      {/* Đặt Chatbot ở đây! Nó nằm SAU NavigationContainer nên sẽ nổi đè lên trên */}
                      {/* Nó nằm TRONG các Provider nên sẽ dùng được useAuth, useUIState... */}
                      <ChatbotWidget />

                    </ToastProvider>
                  </ConfirmProvider>

                </TimerProvider>
              </FolderProvider>
            </UIStateProvider>
          </ThemeProvider>
        </RegionalProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}