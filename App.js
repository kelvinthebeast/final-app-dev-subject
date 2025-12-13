// File: BookManager/App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Import Screens
import HomeScreen from './src/screens/HomeScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';

const Stack = createNativeStackNavigator();

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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}