import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }
  
  token = (await Notifications.getExpoPushTokenAsync({
    projectId: '7c18fb9a-ba30-4a1c-b482-b2131b091932', // Find this in your app.json
  })).data;
  console.log("Expo Push Token:", token);

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export default function PushNotificationManager({ children }) {
  useEffect(() => {
    const setupAndSaveToken = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token && auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userDocRef, {
            pushToken: token,
          });
          console.log("Push token saved to user profile.");
        } catch (error) {
          console.error("Error saving push token:", error);
        }
      }
    };

    // We only want to run this setup when the user is logged in.
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setupAndSaveToken();
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return children;
}