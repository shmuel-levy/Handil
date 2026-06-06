import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import BookingRequestScreen from '../screens/bookings/BookingRequestScreen';
import HomeScreen from '../screens/home/HomeScreen';
import WorkerDetailScreen from '../screens/workers/WorkerDetailScreen';
import WorkerListScreen from '../screens/workers/WorkerListScreen';
import { colors } from '../constants/colors';
import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerBackTitle: '',
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="WorkerList"
        component={WorkerListScreen}
        options={({ route }) => ({ title: route.params.categoryName })}
      />
      <Stack.Screen
        name="WorkerDetail"
        component={WorkerDetailScreen}
        options={({ route }) => ({ title: route.params.workerName })}
      />
      <Stack.Screen
        name="BookingRequest"
        component={BookingRequestScreen}
        options={{ title: 'בקשת הזמנה' }}
      />
    </Stack.Navigator>
  );
}
