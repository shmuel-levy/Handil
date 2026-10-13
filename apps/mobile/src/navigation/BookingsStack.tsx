import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { siteHeader } from './stackOptions';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import { BookingsStackParamList } from './types';

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export default function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={siteHeader}
    >
      <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: 'ההזמנות שלי' }} />
    </Stack.Navigator>
  );
}
