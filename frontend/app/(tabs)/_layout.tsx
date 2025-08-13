import { Tabs } from 'expo-router';
import React, { useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
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
        // ⭐️ FIX: The query is changed here. We remove the 'where' clause.
        const leaderboardQuery = query(
          collectionGroup(db, 'dailySteps'),
          orderBy('steps', 'desc'),
          limit(100)
        );
        const leaderboardSnapshot = await getDocs(leaderboardQuery);

        // We filter for today's date here, in the app's code, instead of in the query.
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
        // This will now catch the new "index required" error
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
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            tabBarStyle: Platform.select({ ios: { position: 'absolute' }, default: {} }),
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