import { Tabs } from 'expo-router';
import React, { useEffect, ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
// Make sure you have this package installed by running: npx expo install expo-blur
import { BlurView } from 'expo-blur';

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
    const fetchData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        console.log("[Data Controller] Fetching latest data...");

        // Fetch user-specific data
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setLifetimeSteps(userDoc.data().lifetimeTotalSteps || 0);
        }
        const dailyStepsRef = collection(db, `users/${currentUser.uid}/dailySteps`);
        const personalHistoryQuery = query(dailyStepsRef, orderBy('__name__', 'desc'));
        const personalHistorySnapshot = await getDocs(personalHistoryQuery);
        const records = personalHistorySnapshot.docs.map(d => ({ id: d.id, steps: d.data().steps || 0 }));
        setDailyRecords(records);
        
        // Fetch global leaderboard data
        const todayString = getLocalDateString();
        const leaderboardQuery = query(
          collectionGroup(db, 'dailySteps'),
          orderBy('steps', 'desc'),
          limit(100)
        );
        const leaderboardSnapshot = await getDocs(leaderboardQuery);

        const todaysEntries = leaderboardSnapshot.docs.filter(doc => doc.id === todayString);
        
        const leaderboardPromises = todaysEntries.map(async (dailyDoc, index) => {
          const userRef = dailyDoc.ref.parent.parent;
          const userSnap = await getDoc(userRef);
          return {
            rank: index + 1,
            username: userSnap.exists() ? userSnap.data().username : 'Unknown',
            steps: dailyDoc.data().steps,
          };
        });
        const leaderboard = await Promise.all(leaderboardPromises);
        setLeaderboardData(leaderboard);

        console.log("[Data Controller] Data fetch complete.");

      } catch (error) {
        console.error('[Data Controller] Error fetching data:', error);
      }
    };
    
    fetchData();
    const hourlyFetchInterval = setInterval(fetchData, 3600000);
    return () => clearInterval(hourlyFetchInterval);
  }, []);

  return children;
};


export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <StepProvider>
      <AppDataController>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#6c7584',
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarBackground: () => (
              <View style={styles.tabBarBackgroundContainer}>
                <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
              </View>
            ),
            // --- START: Updated Tab Bar Styles for 3D Effect ---
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              left: 20,
              right: 20,
              height: 80,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: '#1d2635',
              
              // Shine effect on the top edge
              borderTopWidth: 2,
              borderTopColor: '#384150',
              
              // Shadow for the 3D floating effect (iOS)
              shadowColor: '#ffffffff',
              shadowOffset: {
                width: 0,
                height: -5, // Casts shadow upwards
              },
              shadowOpacity: 0.5,
              shadowRadius: 10,

              // Elevation for Android shadow (subtler effect)
              elevation: 10,
            },
            // --- END: Updated Tab Bar Styles ---
          }}>
          <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} /> }} />
          <Tabs.Screen name="coin" options={{ title: 'Coins', tabBarIcon: ({ color }) => <IconSymbol size={28} name="indianrupeesign.circle.fill" color={color} /> }} />
          <Tabs.Screen name="leaderboard" options={{ title: 'Leaders', tabBarIcon: ({ color }) => <IconSymbol size={28} name="trophy.fill" color={color} /> }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} /> }} />
        </Tabs>
      </AppDataController>
    </StepProvider>
  );
}

const styles = StyleSheet.create({
  tabBarBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});
