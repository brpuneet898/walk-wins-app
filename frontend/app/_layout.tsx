import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import 'react-native-reanimated';

// ⭐️ 1. Import the new PushNotificationManager component
import PushNotificationManager from '../components/PushNotificationManager';
// ⭐️ 2. Import the LevelProvider for level system
import { LevelProvider } from '../context/LevelContext';
// ⭐️ 3. Import the GlobalLevelUpModal
import GlobalLevelUpModal from '../components/GlobalLevelUpModal';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return (
    <>
      {!loaded && <Stack.Screen options={{ headerShown: false }} />}
      {/* ⭐️ 2. Wrap the entire navigation with the PushNotificationManager */}
      {loaded && <RootLayoutNav />}
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // This useEffect for authentication remains the same
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[AUTH DEBUG] Current user:', currentUser ? currentUser.uid : 'null');
      console.log('[AUTH DEBUG] User email:', currentUser ? currentUser.email : 'null');
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // This useEffect for redirection remains the same
  useEffect(() => {
    if (loading) {
      return;
    }
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  if (loading) {
    return null;
  }

  // The ThemeProvider and Stack navigator remain the same
  return (
    <PushNotificationManager>
      <LevelProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          {/* ⭐️ Global level-up modal that can appear on any screen */}
          <GlobalLevelUpModal />
        </ThemeProvider>
      </LevelProvider>
    </PushNotificationManager>
  );
}