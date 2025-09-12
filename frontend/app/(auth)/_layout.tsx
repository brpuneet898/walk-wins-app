import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            title: 'Login to WalkWins',
            headerShown: false, // Make sure the header is visible
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            title: 'Create Account',
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}