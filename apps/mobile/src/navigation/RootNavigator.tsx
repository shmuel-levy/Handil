import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import SplashLoader from '../components/common/SplashLoader';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

export default function RootNavigator() {
  const { token, isLoading, loadAuth } = useAuthStore();

  useEffect(() => {
    loadAuth();
  }, []);

  if (isLoading) {
    return <SplashLoader />;
  }

  return (
    <NavigationContainer>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
