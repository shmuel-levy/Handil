import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { siteHeader } from './stackOptions';
import BookingRequestScreen from '../screens/bookings/BookingRequestScreen';
import WorkerListScreen from '../screens/workers/WorkerListScreen';
import WorkerDetailScreen from '../screens/workers/WorkerDetailScreen';
import { SearchStackParamList } from './types';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={siteHeader}
    >
      <Stack.Screen name="Search" component={WorkerListScreen} options={{ title: 'חיפוש' }} />
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
