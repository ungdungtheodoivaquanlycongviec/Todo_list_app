// src/navigation/AppNavigator.tsx
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

// --- 2. IMPORT CÁC CONTEXT MỚI (VỪA TẠO) ---
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { UIStateProvider } from '../context/UIStateContext';

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
    // THỨ TỰ BỌC PROVIDER (Rất quan trọng)
    // AuthProvider thường ở ngoài cùng để quản lý session
    <AuthProvider>
      <LanguageProvider>
        <RegionalProvider>
          <ThemeProvider>
            {/* UIStateProvider quản lý trạng thái mở modal/noti toàn cục */}
            <UIStateProvider>
              <FolderProvider>
                <TimerProvider>
                  
                  {/* ConfirmProvider và ToastProvider chứa các UI Overlay (Modal, Popup)
                      Nên đặt chúng bao bọc NavigationContainer để chúng có thể 
                      hiển thị đè lên mọi màn hình. */}
                  
                  <ConfirmProvider>
                    <ToastProvider>
                      
                      <NavigationContainer>
                        <RootNavigator />
                      </NavigationContainer>

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