import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import CreatePostScreen from '../screens/posts/CreatePostScreen';
import PostDetailScreen from '../screens/posts/PostDetailScreen';
import PostsFeedScreen from '../screens/posts/PostsFeedScreen';
import { colors } from '../constants/colors';
import { PostsStackParamList } from './types';

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
      <Stack.Screen
        name="PostsFeed"
        component={PostsFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'פרסום עבודה', headerBackTitle: 'חזרה' }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: 'פרטי העבודה', headerBackTitle: 'חזרה' }}
      />
    </Stack.Navigator>
  );
}
