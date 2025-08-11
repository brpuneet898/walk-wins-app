import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Corrected Path
import { useColorScheme } from '@/hooks/useColorScheme';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return (
    <>
      {/* Keep the splash screen open until the assets have loaded. */}
      {!loaded && <Stack.Screen options={{ headerShown: false }} />}
      {loaded && <RootLayoutNav />}
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Set up the authentication listener from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Stop loading once we have the user state
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, []);

  // 2. Handle redirection based on user's login state
  useEffect(() => {
    if (loading) {
      return; // Do nothing while we are checking for the user
    }
    
    if (user) {
      // If user is logged in, send them to the main app
      router.replace('/(tabs)');
    } else {
      // If user is not logged in, send them to the login screen
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  // Don't render anything until we know the user's auth state
  if (loading) {
    return null;
  }

  // 3. Define the screen layouts
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* The (tabs) group is for logged-in users. Hide the header. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* The (auth) group is for logged-out users. Hide the header. */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* You can add other screens like a modal here if needed */}
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}