import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, Text, TouchableOpacity, Alert, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSteps } from '../../context/StepContext';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export default function MapScreen() {
  const [ready, setReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [viewReady, setViewReady] = useState(false);
  const webRef = useRef<WebView | null>(null);
  const mapContainerRef = useRef<View | null>(null);
  const queueRef = useRef<string[]>([]);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const centeredRef = useRef(false);
  const { lifetimeSteps } = useSteps();

  // Add effect to ensure view is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewReady(true);
    }, 2000); // Wait 2 seconds for view to be fully rendered
    
    return () => clearTimeout(timer);
  }, []);

  // Function to get local date string
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load today's steps
  useEffect(() => {
    const loadTodaysSteps = async () => {
      try {
        const today = getLocalDateString();
        const storedData = await AsyncStorage.getItem(`dailySteps_${today}`);
        const steps = storedData ? parseInt(storedData, 10) : 0;
        setTodaysSteps(steps);
      } catch (error) {
        console.error('Error loading today\'s steps:', error);
      }
    };

    loadTodaysSteps();
    // Update steps every 10 seconds when on map screen
    const interval = setInterval(loadTodaysSteps, 10000);
    return () => clearInterval(interval);
  }, []);

  // Screenshot and share functionality - NEW APPROACH
  const takeScreenshotAndShare = async () => {
    console.log('Screenshot button pressed!');
    
    try {
      // Create a simple data card instead of trying to capture WebView
      const message = `🚶‍♂️ Check out my walking achievement! 

📊 Today's Steps: ${todaysSteps.toLocaleString()}
🏆 Lifetime Total: ${lifetimeSteps.toLocaleString()} steps
💰 Total Earned: ₹${(lifetimeSteps * 0.01).toFixed(2)}
${isTracking ? '� Currently tracking my route!' : '⭕ Not tracking at the moment'}

Can you beat me? 💪

Track your steps with WalkWins! 📱`;

      // Share the data directly
      const result = await Share.share({
        message: message,
        title: 'My Walking Stats',
      }, {
        dialogTitle: 'Share Your Walking Achievement',
        subject: 'Check out my walking progress!',
      });

      if (result.action === Share.sharedAction) {
        console.log('Successfully shared walking stats!');
        Alert.alert(
          'Shared Successfully! 🎉', 
          'Your walking achievement has been shared! Screenshot feature coming in future updates.',
          [{ text: 'Awesome!' }]
        );
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
        
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
        (loc) => {
          const msg = JSON.stringify({
            type: 'location',
            coords: { lat: loc.coords.latitude, lng: loc.coords.longitude },
            tracking: isTracking,
          });

          if (ready) {
            webRef.current?.postMessage(msg);
          } else {
            queueRef.current.push(msg);
          }
        }
      );
    })();

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
      queueRef.current = [];
    };
  }, [ready, isTracking]);

  // send a locate message (centers map). queued if webview not ready.
  const sendLocate = async (lat?: number, lng?: number) => {
    try {
      let coords = { lat, lng };
      if (lat == null || lng == null) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const msg = JSON.stringify({ type: 'locate', coords });
      if (ready) {
        webRef.current?.postMessage(msg);
      } else {
        queueRef.current.push(msg);
      }
    } catch (err) {
      console.error('sendLocate error', err);
    }
  };

  // 👈 ADD: Function to toggle tracking
  const toggleTracking = () => {
    if (isTracking) {
      // Stop tracking
      setIsTracking(false);
      // Send stop message to webview
      const msg = JSON.stringify({ type: 'stopTracking' });
      if (ready) {
        webRef.current?.postMessage(msg);
      }
    } else {
      // Start tracking
      setIsTracking(true);
      // Send start message to webview
      const msg = JSON.stringify({ type: 'startTracking' });
      if (ready) {
        webRef.current?.postMessage(msg);
      }
    }
  };

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <style> html,body,#map { height:100%; margin:0; padding:0 } </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map').setView([37.78825, -122.4324], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      let poly = L.polyline([], { color: '#8BC34A', weight: 4 }).addTo(map);
      let marker = null;
      let isTrackingActive = false; // 👈 ADD: Tracking state in webview

      function handleLocation(lat, lng, tracking) {
        const latlng = [lat, lng];
        
        // 👈 ADD: Only add to trail if tracking is active
        if (tracking && isTrackingActive) {
          poly.addLatLng(latlng);
        }
        
        // Always update marker position
        if (!marker) {
          marker = L.circleMarker(latlng, { 
            radius: 8, 
            color: '#64B5F6', 
            fillColor: '#64B5F6', 
            fillOpacity: 1 
          }).addTo(map);
        } else {
          marker.setLatLng(latlng);
        }
      }

      function onMessage(e) {
        try {
          const raw = e && e.data ? e.data : e;
          const data = JSON.parse(raw);
          if (!data) return;
          
          if (data.type === 'location' && data.coords) {
            handleLocation(data.coords.lat, data.coords.lng, data.tracking);
            // only recenter automatically if map wasn't explicitly centered yet
            if (!window.__explicitlyCentered) {
              map.setView([data.coords.lat, data.coords.lng]);
            }
          } else if (data.type === 'locate' && data.coords) {
            // mark that user explicitly centered
            window.__explicitlyCentered = true;
            map.setView([data.coords.lat, data.coords.lng], 17);
            handleLocation(data.coords.lat, data.coords.lng, false);
          } else if (data.type === 'startTracking') {
            // 👈 ADD: Start tracking handler
            isTrackingActive = true;
            // Clear previous trail
            poly.setLatLngs([]);
          } else if (data.type === 'stopTracking') {
            // 👈 ADD: Stop tracking handler
            isTrackingActive = false;
          }
        } catch (err) {
          // ignore
        }
      }

      window.addEventListener('message', onMessage, false);
      document.addEventListener('message', onMessage, false);

      // Notify RN that the map is ready to receive location updates
      const sendReady = () => {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }
      };

      setTimeout(sendReady, 250);
    </script>
  </body>
  </html>
  `;

  return (
    <View style={styles.container} ref={mapContainerRef}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        onMessage={async (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === 'ready') {
              setReady(true);
              // flush queue
              queueRef.current.forEach(m => webRef.current?.postMessage(m));
              queueRef.current = [];

              // center map at current location once (startup)
              if (!centeredRef.current) {
                centeredRef.current = true;
                await sendLocate();
              }
            }
          } catch (err) {
            // ignore
          }
        }}
        onLoadEnd={() => {
          // fallback handshake
          if (!ready) {
            setTimeout(async () => {
              queueRef.current.forEach(m => webRef.current?.postMessage(m));
              queueRef.current = [];
              setReady(true);
              if (!centeredRef.current) {
                centeredRef.current = true;
                await sendLocate();
              }
            }, 600);
          }
        }}
      />

      {/* Start/Stop Tracking Button */}
      <TouchableOpacity
        style={[
          styles.trackingButton,
          { backgroundColor: isTracking ? '#FF4757' : '#8BC34A' }
        ]}
        onPress={toggleTracking}
      >
        <Text style={styles.trackingText}>
          {isTracking ? 'E' : 'S'}
        </Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity 
        style={styles.screenshotButton} 
        onPress={takeScreenshotAndShare}
      >
        <Text style={styles.screenshotText}>�</Text>
      </TouchableOpacity>

      {/* Existing Locator Button */}
      <TouchableOpacity
        style={styles.locatorButton}
        onPress={() => {
          // user pressed locator; center map immediately
          sendLocate();
        }}
      >
        <Text style={styles.locatorText}>◎</Text>
      </TouchableOpacity>

      {!ready && <Text style={styles.loadingText}>Loading map…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  loadingText: { position: 'absolute', top: 12, alignSelf: 'center', color: '#888' },
  
  // 👈 ADD: Start/Stop Tracking Button Style
  trackingButton: {
    position: 'absolute',
    left: 18,
    bottom: 110,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  trackingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  
  // Share Button
  screenshotButton: {
    position: 'absolute',
    right: 18,
    top: 60,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  screenshotText: {
    fontSize: 24,
  },
  
  // Existing Locator Button (positioned on right)
  locatorButton: {
    position: 'absolute',
    right: 18,
    bottom: 110,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1d2635',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  locatorText: { color: '#fff', fontSize: 22, lineHeight: 26 },
});