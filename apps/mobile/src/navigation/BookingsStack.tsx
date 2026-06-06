import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import { colors } from '../constants/colors';
import { BookingsStackParamList } from './types';

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export default function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: 'ההזמנות שלי' }} />
    </Stack.Navigator>
  );
}
