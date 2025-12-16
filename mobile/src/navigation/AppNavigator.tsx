// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

// 👇 QUAN TRỌNG: Tất cả đều dùng dấu ngoặc nhọn { }
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FolderProvider } from '../context/FolderContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext'; 
import { RegionalProvider } from '../context/RegionalContext'; 
import { TimerProvider } from '../context/TimerContext'; // 👈 BỔ SUNG Ở ĐÂY

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
    // Cấu trúc lồng nhau chuẩn:
    <AuthProvider>
      <LanguageProvider>
        <RegionalProvider>
          <ThemeProvider>
            <FolderProvider>
              {/* 👇 BỔ SUNG TIMER PROVIDER VÀO ĐÂY */}
              <TimerProvider> 
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </TimerProvider>
              {/* 👆 KẾT THÚC TIMER PROVIDER */}
            </FolderProvider>
          </ThemeProvider>
        </RegionalProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}