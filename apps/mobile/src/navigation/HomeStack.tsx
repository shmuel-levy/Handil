import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { siteHeader } from './stackOptions';
import BookingRequestScreen from '../screens/bookings/BookingRequestScreen';
import HomeScreen from '../screens/home/HomeScreen';
import InfoScreen, { TOPICS } from '../screens/info/InfoScreen';
import WorkerDetailScreen from '../screens/workers/WorkerDetailScreen';
import WorkerListScreen from '../screens/workers/WorkerListScreen';
import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={siteHeader}
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
      <Stack.Screen
        name="Info"
        component={InfoScreen}
        options={({ route }) => ({ title: TOPICS[route.params.topic].title })}
      />
    </Stack.Navigator>
  );
}
