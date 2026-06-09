import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { colors } from '../constants/colors';
import { PostsStackParamList } from './types';
import CreatePostScreen  from '../screens/posts/CreatePostScreen';
import PostDetailScreen  from '../screens/posts/PostDetailScreen';
import PostsFeedScreen   from '../screens/posts/PostsFeedScreen';
import QuoteSubmitScreen from '../screens/posts/QuoteSubmitScreen';
import QuotesListScreen  from '../screens/posts/QuotesListScreen';

const Stack = createNativeStackNavigator<PostsStackParamList>();

export default function PostsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="PostsFeed"   component={PostsFeedScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="CreatePost"  component={CreatePostScreen}  options={{ title: 'פרסום עבודה' }} />
      <Stack.Screen name="PostDetail"  component={PostDetailScreen}  options={{ title: 'פרטי העבודה' }} />
      <Stack.Screen name="QuoteSubmit" component={QuoteSubmitScreen} options={{ title: 'שליחת הצעת מחיר' }} />
      <Stack.Screen name="QuotesList"  component={QuotesListScreen}  options={{ title: 'הצעות שהתקבלו' }} />
    </Stack.Navigator>
  );
}
