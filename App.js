// File: BookManager/App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ReadingTimerScreen from './src/screens/ReadingTimerScreen';
// Import Screens
import HomeScreen from './src/screens/HomeScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';
import ReadBookScreen from './src/screens/ReadBookScreen';
import DashboardScreen from './src/screens/DashboardScreen';
const Stack = createNativeStackNavigator();
import { configDotenv } from 'dotenv';
configDotenv()
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerBackTitleVisible: false,
            headerTintColor: '#007AFF',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Thư viện của tôi' }} />
          <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Thêm sách mới' }} />
          <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Chi tiết sách' }} />
          <Stack.Screen 
            name="ReadingTimer" 
            component={ReadingTimerScreen} 
            options={{ headerShown: false }} // Ẩn header để tập trung hoàn toàn
          />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Thống kê' }} />
          <Stack.Screen name="ReadBook" component={ReadBookScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}