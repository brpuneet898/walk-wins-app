import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, Text, TouchableOpacity, Alert, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSteps } from '../../context/StepContext';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapScreen() {
  const [ready, setReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [viewReady, setViewReady] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const webRef = useRef<WebView | null>(null);
  const mapContainerRef = useRef<View | null>(null);
  const queueRef = useRef<string[]>([]);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const centeredRef = useRef(false);
  const screenshotPromiseRef = useRef<((value: string) => void) | null>(null);
  const { lifetimeSteps } = useSteps();
  const insets = useSafeAreaInsets();

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
    
    // Prevent multiple simultaneous captures
    if (isCapturingScreenshot) {
      Alert.alert('Please Wait', 'A screenshot is already being captured. Please wait.');
      return;
    }
    
    try {
      setIsCapturingScreenshot(true);

      // Check if WebView is ready
      if (!ready) {
        Alert.alert('Map Not Ready', 'Please wait for the map to fully load before taking a screenshot.');
        return;
      }

      // Request media library permissions if not already granted
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access is required to save screenshots.');
        return;
      }

      // Show loading indicator
      Alert.alert('Capturing Screenshot', 'Please wait while we capture your walking trail...', [{ text: 'OK' }]);

      // Small delay to ensure WebView is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try capture with different quality settings if first attempt fails
      let base64Data;
      try {
        base64Data = await new Promise<string>((resolve, reject) => {
          screenshotPromiseRef.current = resolve;
          webRef.current?.injectJavaScript('captureMapScreenshot();');
          // Reduced timeout for first attempt
          setTimeout(() => reject(new Error('timeout')), 15000);
        });
      } catch (firstAttemptError) {
        console.log('First capture attempt failed, trying with reduced quality...');
        
        // Try again with reduced quality settings
        try {
          base64Data = await new Promise<string>((resolve, reject) => {
            screenshotPromiseRef.current = resolve;
            webRef.current?.injectJavaScript('captureMapScreenshotLowQuality();');
            setTimeout(() => reject(new Error('timeout')), 20000);
          });
        } catch (secondAttemptError) {
          throw new Error('Screenshot timeout - the map may be too large or slow to capture. Try again.');
        }
      }

      // Save base64 to temporary file
      const fileName = `walk-trail-${Date.now()}.png`;
      const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(tempUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Move to permanent location
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({
        from: tempUri,
        to: permanentUri,
      });

      // Save to device's media library (gallery)
      const asset = await MediaLibrary.createAssetAsync(permanentUri);
      await MediaLibrary.createAlbumAsync('WalkWins Screenshots', asset, false);

      // Share the saved image
      const result = await Share.share({
        message: `🚶‍♂️ Check out my walking trail! 

📊 Today's Steps: ${todaysSteps.toLocaleString()}
🏆 Lifetime Total: ${lifetimeSteps.toLocaleString()} steps
💰 Total Earned: ₹${(lifetimeSteps * 0.01).toFixed(2)}
${isTracking ? '🟢 Currently tracking my route!' : '⭕ Not tracking at the moment'}

Can you beat me? 💪

Track your steps with WalkWins! 📱`,
        url: permanentUri, // Share the image URI
        title: 'My Walking Trail Screenshot',
      }, {
        dialogTitle: 'Share Your Walking Achievement',
        subject: 'Check out my walking progress!',
      });

      if (result.action === Share.sharedAction) {
        console.log('Successfully shared screenshot!');
        Alert.alert(
          'Shared Successfully! 🎉', 
          'Your walking trail screenshot has been saved to gallery and shared!',
          [{ text: 'Awesome!' }]
        );
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
        Alert.alert('Saved to Gallery', 'Screenshot saved, but sharing was cancelled.');
      }
        
    } catch (error: any) {
      console.error('Error taking/saving/sharing screenshot:', error);
      let errorMessage = 'Failed to capture or share screenshot. Please try again.';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Screenshot capture timed out. The map may be too large or the network is slow. Please try again with a simpler view.';
      } else if (error.message?.includes('html2canvas')) {
        errorMessage = 'Screenshot capture failed. Please ensure the map is fully loaded and try again.';
      }
      
      Alert.alert('Screenshot Error', errorMessage);
    } finally {
      setIsCapturingScreenshot(false);
      screenshotPromiseRef.current = null;
    }
  };

  useEffect(() => {
    (async () => {
      // Check if location services are enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use the map features.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Location permission is required to show your position on the map and track your walks.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
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
        // Check location services and permissions before getting position
        const locationEnabled = await Location.hasServicesEnabledAsync();
        if (!locationEnabled) {
          Alert.alert(
            'Location Services Disabled',
            'Please enable location services in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Location permission is required to center the map on your current location.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Grant Permission', onPress: async () => {
                const result = await Location.requestForegroundPermissionsAsync();
                if (result.status === 'granted') {
                  // Retry after permission granted
                  sendLocate();
                }
              }}
            ]
          );
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.High
        });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const msg = JSON.stringify({ type: 'locate', coords });
      if (ready) {
        webRef.current?.postMessage(msg);
      } else {
        queueRef.current.push(msg);
      }
    } catch (err: any) {
      console.error('sendLocate error', err);
      let errorMessage = 'Unable to get your current location.';
      
      if (err.message?.includes('Not authorized')) {
        errorMessage = 'Location permission is required. Please grant permission in settings.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (err.message?.includes('services disabled')) {
        errorMessage = 'Location services are disabled. Please enable them in settings.';
      }
      
      Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
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
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
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

      function captureMapScreenshot() {
        // Reset state before capturing
        resetScreenshotState();
        
        // Check if html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'screenshotError',
            error: 'Screenshot library not loaded'
          }));
          return;
        }

        // Small delay to ensure map is fully rendered
        setTimeout(() => {
          html2canvas(document.getElementById('map'), {
            useCORS: true,
            allowTaint: false,
            scale: 1,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: '#ffffff',
            logging: false,
            foreignObjectRendering: true, // Enable SVG rendering
            removeContainer: false, // Keep container structure
            ignoreElements: function(element) {
              // Skip scripts and styles that might interfere
              return element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || 
                     element.tagName === 'LINK' || element.id === 'html2canvas-proxy';
            },
            onclone: function(clonedDoc) {
              // Ensure map container is properly sized
              const clonedMap = clonedDoc.getElementById('map');
              if (clonedMap) {
                clonedMap.style.width = '100%';
                clonedMap.style.height = '100%';
                // Force redraw of SVG elements
                const svgElements = clonedMap.querySelectorAll('svg, canvas');
                svgElements.forEach(el => {
                  el.style.display = 'block';
                  el.style.visibility = 'visible';
                });
              }
            }
          }).then(canvas => {
            // Compress the image for better performance
            const compressedCanvas = document.createElement('canvas');
            const ctx = compressedCanvas.getContext('2d');
            compressedCanvas.width = canvas.width * 0.8; // 80% size
            compressedCanvas.height = canvas.height * 0.8;
            
            ctx.drawImage(canvas, 0, 0, compressedCanvas.width, compressedCanvas.height);
            
            const imageData = compressedCanvas.toDataURL('image/png', 0.8); // 80% quality
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'screenshot',
              data: imageData
            }));
          }).catch(err => {
            console.error('html2canvas error:', err);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'screenshotError',
              error: 'Failed to capture map: ' + err.message
            }));
          });
        }, 500); // 500ms delay to ensure rendering is complete
      }

      function captureMapScreenshotLowQuality() {
        // Check if html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'screenshotError',
            error: 'Screenshot library not loaded'
          }));
          return;
        }

        // Small delay to ensure map is fully rendered
        setTimeout(() => {
          html2canvas(document.getElementById('map'), {
            useCORS: true,
            allowTaint: false,
            scale: 0.5, // Much lower scale for speed
            width: window.innerWidth * 0.5,
            height: window.innerHeight * 0.5,
            backgroundColor: '#ffffff',
            logging: false,
            foreignObjectRendering: true, // Enable SVG rendering
            removeContainer: false, // Keep container structure
            ignoreElements: function(element) {
              // Skip complex elements that might slow down capture
              return element.tagName === 'SCRIPT' || element.tagName === 'LINK' || 
                     element.tagName === 'STYLE' || element.id === 'html2canvas-proxy';
            },
            onclone: function(clonedDoc) {
              const clonedMap = clonedDoc.getElementById('map');
              if (clonedMap) {
                clonedMap.style.width = '50%';
                clonedMap.style.height = '50%';
                // Force redraw of SVG elements
                const svgElements = clonedMap.querySelectorAll('svg, canvas');
                svgElements.forEach(el => {
                  el.style.display = 'block';
                  el.style.visibility = 'visible';
                });
              }
            }
          }).then(canvas => {
            // Even more aggressive compression
            const compressedCanvas = document.createElement('canvas');
            const ctx = compressedCanvas.getContext('2d');
            compressedCanvas.width = canvas.width * 0.6; // 60% of already reduced size
            compressedCanvas.height = canvas.height * 0.6;
            
            ctx.drawImage(canvas, 0, 0, compressedCanvas.width, compressedCanvas.height);
            
            const imageData = compressedCanvas.toDataURL('image/png', 0.6); // 60% quality
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'screenshot',
              data: imageData
            }));
          }).catch(err => {
            console.error('Low quality html2canvas error:', err);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'screenshotError',
              error: 'Failed to capture map with low quality: ' + err.message
            }));
          });
        }, 300); // Shorter delay for low quality
      }

      function resetScreenshotState() {
        // Clear any cached canvases or large objects
        if (window.screenshotCanvas) {
          window.screenshotCanvas = null;
        }
        // Force garbage collection hint
        if (window.gc) {
          window.gc();
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
            } else if (data?.type === 'screenshot' && data.data) {
              // Handle screenshot data
              const base64Data = data.data.replace('data:image/png;base64,', '');
              screenshotPromiseRef.current?.(base64Data);
            } else if (data?.type === 'screenshotError') {
              console.error('Screenshot error from WebView:', data.error);
              Alert.alert('Screenshot Error', 'Failed to capture screenshot from map.');
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
          { backgroundColor: isTracking ? '#FF4757' : '#8BC34A', bottom: 110 + insets.bottom }
        ]}
        onPress={toggleTracking}
      >
        <Text style={styles.trackingText}>
          {isTracking ? 'E' : 'S'}
        </Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity 
        style={[styles.screenshotButton, { top: 60 + insets.top }]} 
        onPress={takeScreenshotAndShare}
      >
        {/* <Text style={styles.screenshotText}>�</Text> */}
        <Ionicons name="camera-outline" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Existing Locator Button */}
      <TouchableOpacity
        style={[styles.locatorButton, { bottom: 110 + insets.bottom }]}
        onPress={() => {
          // user pressed locator; center map immediately
          sendLocate();
        }}
      >
        {/* <Text style={styles.locatorText}>◎</Text> */}
        <Ionicons name="locate" size={28} color="#fff" />
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
    backgroundColor: '#000000ff',
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