import { useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForWebPushNotifications(): Promise<string | null> {
  try {
    console.log("🌐 Setting up web push notifications...");
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log("⚠️ This browser does not support notifications");
      return null;
    }

    // Request permission for web notifications
    const permission = await Notification.requestPermission();
    console.log("📋 Web notification permission:", permission);
    
    if (permission !== 'granted') {
      console.error("❌ Web notification permissions denied!");
      alert('Please enable notifications in your browser to receive WalkWins updates!');
      return null;
    }

    // For now, create a web mock token until we set up Firebase web push properly
    const webToken = `WebPushToken[${Date.now()}]`;
    console.log("🌐 Generated web push token:", webToken);
    return webToken;

  } catch (error) {
    console.error("💥 Error in web push notification setup:", error);
    return null;
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    console.log("🔄 Starting push notification registration...");
    
    // For web platform, use web push notifications
    if (Platform.OS === 'web') {
      return await registerForWebPushNotifications();
    }
    
    // For mobile platforms, use Expo notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("📋 Existing permission status:", existingStatus);
    
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log("🙋 Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("📋 New permission status:", finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.error("❌ Notification permissions denied!");
      alert('Please enable notifications in your device settings to receive WalkWins updates!');
      return null;
    }

    console.log("✅ Permissions granted, getting push token...");
    
    // Try to get the push token, but catch FCM errors
    let token: string | null = null;
    try {
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: '7c18fb9a-ba30-4a1c-b482-b2131b091932', // From your app.json
      });
      token = tokenResult.data;
      console.log("📱 Got Expo Push Token:", token);
    } catch (fcmError: any) {
      console.warn("⚠️ FCM initialization failed, using mock token for testing:", fcmError?.message || fcmError);
      // Create a mock token for testing purposes
      token = `ExpoMockToken[dev-${Date.now()}]`;
      console.log("🧪 Using mock token for testing:", token);
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      console.log("🤖 Setting up Android notification channel...");
      await Notifications.setNotificationChannelAsync('default', {
        name: 'WalkWins Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8BC34A',
        enableVibrate: true,
      });
      console.log("✅ Android notification channel set up");
    }

    return token;
  } catch (error: any) {
    console.error("💥 Error in push notification registration:", error);
    alert(`Push notification setup failed: ${error?.message || error}`);
    return null;
  }
}

interface PushNotificationManagerProps {
  children: ReactNode;
}

export default function PushNotificationManager({ children }: PushNotificationManagerProps) {
  useEffect(() => {
    const setupAndSaveToken = async () => {
      console.log("🔧 Setting up push notifications...");
      const token = await registerForPushNotificationsAsync();
      console.log("📱 Got token:", token);
      console.log("👤 Current user:", auth.currentUser?.uid);
      
      if (token && auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userDocRef, {
            pushToken: token,
          });
          console.log("✅ Push token saved to user profile:", auth.currentUser.uid);
        } catch (error) {
          console.error("❌ Error saving push token:", error);
        }
      } else {
        console.log("⚠️ No token or user - token:", !!token, "user:", !!auth.currentUser);
      }
    };

    // We only want to run this setup when the user is logged in.
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        setupAndSaveToken();
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return children;
}