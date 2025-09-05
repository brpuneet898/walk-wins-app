// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv4aZaxW7ThqumT-aiaAcKe_Sl1G3XEvU",
  authDomain: "walkwins-4c968.firebaseapp.com",
  projectId: "walkwins-4c968",
  storageBucket: "walkwins-4c968.firebasestorage.app",
  messagingSenderId: "151057703376",
  appId: "1:151057703376:web:e20ec9617647b3e87219d5",
  measurementId: "G-3G012ST35C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// --- AUTH INITIALIZATION ---
// This setup works for both web and mobile
let auth: Auth;

if (Platform.OS === 'web') {
  // For web, use the default auth
  auth = getAuth(app);
  console.log("🌐 Web platform detected - using web auth");
} else {
  // For mobile, try React Native auth with fallback to web auth
  try {
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
    console.log("📱 Mobile platform detected - using React Native auth");
  } catch (error) {
    // Fallback to web auth if React Native auth fails
    auth = getAuth(app);
    console.log("📱 Mobile platform detected - fallback to web auth");
  }
}

export { auth };
