// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Export the services for use in other parts of your app
export { auth, db };