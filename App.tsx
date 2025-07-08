import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ReaderProvider } from '@epubjs-react-native/core';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import ReadingScreen from './src/screens/ReadingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';

// Services
import { useAuthState } from './src/services/authService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Library':
            iconName = 'library-books';
            break;
          case 'History':
            iconName = 'history';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'home';
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6200EE',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      tabBarStyle: {
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{
        tabBarLabel: 'Home',
      }}/>
    <Tab.Screen name="Library" component={LibraryScreen} options={{
        tabBarLabel: 'Library',
      }}/>
      <Tab.Screen 
      name="History" 
      component={HistoryScreen}
      options={{
        tabBarLabel: 'History',
      }}
    />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{
        tabBarLabel: 'Profile',
      }}/>
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuthState();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Reading" component={ReadingScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
      <ReaderProvider>
        <SafeAreaProvider>
          <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
          <AppNavigator />
        </SafeAreaProvider></ReaderProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}