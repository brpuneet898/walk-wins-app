import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// A type for a single daily record
export interface DailyRecord {
  id: string;
  steps: number;
}

// A type for a single leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  username: string;
  steps: number;
}

// The final, correct shape of our context data
interface StepContextType {
  lifetimeSteps: number;
  setLifetimeSteps: React.Dispatch<React.SetStateAction<number>>;
  dailyRecords: DailyRecord[];
  setDailyRecords: React.Dispatch<React.SetStateAction<DailyRecord[]>>;
  leaderboardData: LeaderboardEntry[];
  setLeaderboardData: React.Dispatch<React.SetStateAction<LeaderboardEntry[]>>;
  isLoggingOut: boolean;
  setIsLoggingOut: React.Dispatch<React.SetStateAction<boolean>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  isBoostActive: boolean;
  boostType: 'sunrise' | 'sunset' | null;
}

const StepContext = createContext<StepContextType | undefined>(undefined);

// Helper function to check if current time is during boost hours
const checkBoostTime = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since midnight

  // Sunrise: 5:30 AM to 7:00 AM (330 to 420 minutes)
  const sunriseStart = 5 * 60 + 30; // 5:30 AM
  const sunriseEnd = 7 * 60; // 7:00 AM

  // Sunset: 5:30 PM to 7:00 PM (1050 to 1140 minutes)
  const sunsetStart = 17 * 60 + 30; // 5:30 PM
  const sunsetEnd = 19 * 60; // 7:00 PM

  if (currentTime >= sunriseStart && currentTime <= sunriseEnd) {
    return { isActive: true, type: 'sunrise' as const };
  } else if (currentTime >= sunsetStart && currentTime <= sunsetEnd) {
    return { isActive: true, type: 'sunset' as const };
  }

  return { isActive: false, type: null };
};

export const StepProvider = ({ children }: { children: ReactNode }) => {
  // All state variables are now correctly included
  const [lifetimeSteps, setLifetimeSteps] = useState(0);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [coins, setCoins] = useState(0);

  // Boost state - update every minute
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [boostType, setBoostType] = useState<'sunrise' | 'sunset' | null>(null);

  // Load coins from Firebase when user logs in
  useEffect(() => {
    const loadUserCoins = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userCoins = userData.coins || 0;
            setCoins(userCoins);

            // Initialize missing fields for existing users
            const updates = {};
            if (userData.coins === undefined) {
              updates.coins = 0;
            }
            if (userData.referralCode === undefined && userData.username) {
              // Generate referral code for existing users
              const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
              updates.referralCode = `${userData.username.toUpperCase().slice(0, 4)}${randomNum}`;
            }
            if (userData.totalReferrals === undefined) {
              updates.totalReferrals = 0;
            }

            if (Object.keys(updates).length > 0) {
              await updateDoc(doc(db, 'users', user.uid), updates);
            }
          }
        } catch (error) {
          console.error('Error loading user coins:', error);
        }
      }
    };

    // Load coins when component mounts
    loadUserCoins();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserCoins();
      } else {
        setCoins(0); // Reset coins when user logs out
      }
    });

    return () => unsubscribe();
  }, []);

  // Check boost status every minute
  useEffect(() => {
    const updateBoostStatus = () => {
      const boostStatus = checkBoostTime();
      setIsBoostActive(boostStatus.isActive);
      setBoostType(boostStatus.type);
    };

    // Check immediately
    updateBoostStatus();

    // Then check every minute
    const interval = setInterval(updateBoostStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    // The provider's value now correctly includes ALL state management functions
    <StepContext.Provider value={{
      lifetimeSteps,
      setLifetimeSteps,
      dailyRecords,
      setDailyRecords,
      leaderboardData,
      setLeaderboardData,
      isLoggingOut,
      setIsLoggingOut,
      coins,
      setCoins,
      isBoostActive,
      boostType
    }}>
      {children}
    </StepContext.Provider>
  );
};

// The custom hook to access the context
export const useSteps = () => {
  const context = useContext(StepContext);
  if (context === undefined) {
    throw new Error('useSteps must be used within a StepProvider');
  }
  return context;
};