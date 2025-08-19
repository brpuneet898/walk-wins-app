import { Tabs } from 'expo-router';
import React, { useEffect, ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StepProvider, useSteps } from '../../context/StepContext';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, getDocs, query, orderBy, collectionGroup, limit } from 'firebase/firestore';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AppDataController = ({ children }: { children: ReactNode }) => {
  const { setLifetimeSteps, setDailyRecords, setLeaderboardData } = useSteps();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        console.log('[Data Controller] Fetching latest data...');

        // User doc (lifetime total)
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!cancelled && userDoc.exists()) {
          setLifetimeSteps(userDoc.data().lifetimeTotalSteps || 0);
        }

        // Personal daily history
        const dailyStepsRef = collection(db, `users/${currentUser.uid}/dailySteps`);
        const personalHistoryQuery = query(dailyStepsRef, orderBy('__name__', 'desc'));
        const personalHistorySnapshot = await getDocs(personalHistoryQuery);
        if (!cancelled) {
          const records = personalHistorySnapshot.docs.map(d => ({
            id: d.id,
            steps: d.data().steps || 0,
            // include any timestamp stored on the document (optional)
            time: d.data().updatedAt || d.data().timestamp || null,
          }));
          setDailyRecords(records);
        }

        // Global leaderboard for today
        const todayString = getLocalDateString();
        const leaderboardQuery = query(
          collectionGroup(db, 'dailySteps'),
          orderBy('steps', 'desc'),
          limit(100)
        );
        const leaderboardSnapshot = await getDocs(leaderboardQuery);

        // Filter to entries whose doc id equals today's date (depends on how you store daily docs)
        const todaysEntries = leaderboardSnapshot.docs.filter(d => d.id === todayString);

        const leaderboardPromises = todaysEntries.map(async (dailyDoc, index) => {
          const userRef = dailyDoc.ref.parent.parent; // parent is dailySteps collection, its parent is user doc
          let username = 'Unknown';
          if (userRef) {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) username = userSnap.data().username || 'Unknown';
          }
          return {
            rank: index + 1,
            username,
            steps: dailyDoc.data().steps || 0,
            date: dailyDoc.id, // typically the date string
            time: dailyDoc.data().updatedAt || dailyDoc.data().timestamp || null,
          };
        });

        const leaderboard = await Promise.all(leaderboardPromises);
        if (!cancelled) setLeaderboardData(leaderboard);

        console.log('[Data Controller] Data fetch complete.');
      } catch (error) {
        console.error('[Data Controller] Error fetching data:', error);
      }
    };

    fetchData();
    const hourlyFetchInterval = setInterval(fetchData, 3600000);
    return () => {
      cancelled = true;
      clearInterval(hourlyFetchInterval);
    };
  }, [setLifetimeSteps, setDailyRecords, setLeaderboardData]);

  return children;
};

// Enhanced TabBarBackground with more visible changes
const TabBarBackground = () => (
  <View style={styles.tabBarBackgroundContainer}>
    <LinearGradient
      colors={['#0D1B2A', '#1B263B', '#0D1B2A']} // Changed gradient for more visibility
      style={styles.tabBarGradient}
    />
    <BlurView 
      tint="dark" 
      intensity={20} // Reduced for better visibility
      style={StyleSheet.absoluteFill} 
    />
    {/* Enhanced border with more visibility */}
    <View style={styles.tabBarBorder} />
    <View style={styles.tabBarTopAccent} />
  </View>
);

export default function TabLayout() {
  return (
    <StepProvider>
      <AppDataController>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#8BC34A', // Green for active
            tabBarInactiveTintColor: '#94A3B8', // Lighter gray for inactive
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarBackground: () => <TabBarBackground />,
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 90, // Increased height
              borderTopLeftRadius: 30, // More rounded
              borderTopRightRadius: 30,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              shadowColor: '#8BC34A', // Green shadow
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.25,
              shadowRadius: 25,
              elevation: 20,
              paddingBottom: Platform.OS === 'ios' ? 30 : 15,
              paddingTop: 15,
              paddingHorizontal: 10,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700', // Bolder text
              marginTop: 4,
              marginBottom: Platform.OS === 'ios' ? 0 : 5,
              textTransform: 'uppercase', // Make labels uppercase
              letterSpacing: 0.5,
            },
            tabBarIconStyle: {
              marginTop: 8,
            },
          }}
        >
          <Tabs.Screen 
            name="index" 
            options={{ 
              title: 'Home', 
              tabBarIcon: ({ color, focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <IconSymbol size={26} name="house.fill" color={color} />
                </View>
              )
            }} 
          />
          <Tabs.Screen 
            name="coin" 
            options={{ 
              title: 'Coins', 
              tabBarIcon: ({ color, focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <IconSymbol size={26} name="indianrupeesign.circle.fill" color={color} />
                </View>
              )
            }} 
          />
          <Tabs.Screen 
            name="MapScreen" 
            options={{ 
              title: 'Map', 
              tabBarIcon: ({ color, focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <IconSymbol size={26} name="map.fill" color={color} />
                </View>
              )
            }} 
          />
          
          {/* Hidden screens - accessible only through specific buttons */}
          <Tabs.Screen 
            name="leaderboard" 
            options={{ 
              href: null, // Hide from tab bar
            }} 
          />
          <Tabs.Screen 
            name="profile" 
            options={{ 
              href: null, // Hide from tab bar
            }} 
          />
        </Tabs>
      </AppDataController>
    </StepProvider>
  );
}

const styles = StyleSheet.create({
  tabBarBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tabBarBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2, // Thicker border
    backgroundColor: 'rgba(139,195,74,0.6)', // More visible green
  },
  tabBarTopAccent: {
    position: 'absolute',
    top: 2,
    left: '50%',
    width: 60,
    height: 4,
    backgroundColor: '#8BC34A',
    borderRadius: 2,
    marginLeft: -30, // Center the accent
  },
  iconContainer: {
    width: 45, // Larger container
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(139,195,74,0.25)', // More visible background
    borderWidth: 2, // Thicker border
    borderColor: 'rgba(139,195,74,0.6)',
    shadowColor: '#8BC34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});