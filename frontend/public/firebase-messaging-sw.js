// Firebase messaging service worker for web push notifications
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv4aZaxW7ThqumT-aiaAcKe_Sl1G3XEvU",
  authDomain: "walkwins-4c968.firebaseapp.com",
  projectId: "walkwins-4c968",
  storageBucket: "walkwins-4c968.firebasestorage.app",
  messagingSenderId: "151057703376",
  appId: "1:151057703376:web:e20ec9617647b3e87219d5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'WalkWins';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'walkwins-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('localhost') || client.url.includes('walkwins')) {
            return client.focus();
          }
        }
        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
