import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { colors } from '../constants/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import WebSidebar from '../components/layout/WebSidebar';
import { MainTabParamList } from './types';
import BookingsStack from './BookingsStack';
import ChatStack from './ChatStack';
import HomeStack from './HomeStack';
import PostsStack from './PostsStack';
import SearchStack from './SearchStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const { isDesktop } = useBreakpoint();

  return (
    <Tab.Navigator
      tabBar={(props) =>
        isDesktop
          ? <WebSidebar {...props} />
          : <BottomTabBar {...props} />
      }
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isDesktop
          ? { display: 'none' as any }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: 4,
              height: 60,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: string; inactive: string }> = {
            HomeTab:     { active: 'home',           inactive: 'home-outline' },
            SearchTab:   { active: 'search',         inactive: 'search-outline' },
            BookingsTab: { active: 'calendar',       inactive: 'calendar-outline' },
            PostsTab:    { active: 'newspaper',      inactive: 'newspaper-outline' },
            ChatTab:     { active: 'chatbubbles',    inactive: 'chatbubbles-outline' },
            ProfileTab:  { active: 'person',         inactive: 'person-outline' },
          };
          const set = icons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={(focused ? set.active : set.inactive) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"     component={HomeStack}     options={{ title: 'בית' }} />
      <Tab.Screen name="SearchTab"   component={SearchStack}   options={{ title: 'חיפוש' }} />
      <Tab.Screen name="PostsTab"    component={PostsStack}    options={{ title: 'עבודות' }} />
      <Tab.Screen name="BookingsTab" component={BookingsStack} options={{ title: 'הזמנות' }} />
      <Tab.Screen name="ChatTab"     component={ChatStack}     options={{ title: 'הודעות' }} />
      <Tab.Screen name="ProfileTab"  component={ProfileScreen} options={{ title: 'פרופיל', headerShown: false }} />
    </Tab.Navigator>
  );
}
