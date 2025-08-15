// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvAIjwRDkbqDBT11At7BxktxNc4l4gV8U",
  authDomain: "walk-wins-app.firebaseapp.com",
  projectId: "walk-wins-app",
  storageBucket: "walk-wins-app.firebasestorage.app",
  messagingSenderId: "284357284895",
  appId: "1:284357284895:web:20dc3a91eab784258ef12a",
  measurementId: "G-BK2C2530ZM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// --- UPDATED AUTH INITIALIZATION ---
// This setup works for both web and mobile
import { Platform } from 'react-native';

let auth;
if (Platform.OS === 'web') {
  // For web, use the default auth
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
} else {
  // For mobile, use React Native persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

export { auth };
