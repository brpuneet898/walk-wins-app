import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
// @ts-ignore - firebaseConfig is JS without TS types
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';

// A type for a single daily record
export interface DailyRecord {
  id: string;
  steps: number;
  time?: string | null;
}

// A type for a single leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  username: string;
  steps: number;
  userId?: string; // Add optional userId field
}

// The final, correct shape of our context data
interface StepContextType {
  lifetimeSteps: number;
  setLifetimeSteps: React.Dispatch<React.SetStateAction<number>>;
  dailyRecords: DailyRecord[];
  setDailyRecords: React.Dispatch<React.SetStateAction<DailyRecord[]>>;
  isLoggingOut: boolean;
  setIsLoggingOut: React.Dispatch<React.SetStateAction<boolean>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  isBoostActive: boolean;
  boostType: 'sunrise' | 'sunset' | null;
  boostSteps: number;
  setBoostSteps: React.Dispatch<React.SetStateAction<number>>;
}

const StepContext = createContext<StepContextType | undefined>(undefined);

// Helper function to check if current time is during boost hours
const checkBoostTime = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since midnight

  // Sunrise: 4:00 AM to 7:00 AM (240 to 420 minutes) - TEMPORARILY EXTENDED FOR TESTING
  const sunriseStart = 4 * 60; // 4:00 AM (240 minutes)
  const sunriseEnd = 7 * 60; // 7:00 AM (420 minutes)

  // Sunset: 5:30 PM to 7:00 PM (1050 to 1140 minutes)
  const sunsetStart = 17 * 60 + 30; // 5:30 PM (1050 minutes)
  const sunsetEnd = 19 * 60; // 7:00 PM (1140 minutes)

  console.log(`[BOOST DEBUG] Current time: ${hours}:${minutes.toString().padStart(2, '0')} (${currentTime} minutes)`);
  console.log(`[BOOST DEBUG] Sunrise: ${sunriseStart}-${sunriseEnd}, Sunset: ${sunsetStart}-${sunsetEnd}`);

  if (currentTime >= sunriseStart && currentTime <= sunriseEnd) {
    console.log('[BOOST DEBUG] SUNRISE BOOST ACTIVE!');
    return { isActive: true, type: 'sunrise' as const };
  } else if (currentTime >= sunsetStart && currentTime <= sunsetEnd) {
    console.log('[BOOST DEBUG] SUNSET BOOST ACTIVE!');
    return { isActive: true, type: 'sunset' as const };
  }

  console.log('[BOOST DEBUG] No boost active');
  return { isActive: false, type: null };
};

export const StepProvider = ({ children }: { children: ReactNode }) => {
  // All state variables are now correctly included
  const [lifetimeSteps, setLifetimeSteps] = useState(0);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [coins, setCoins] = useState(0);

  // Boost state - update every minute
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [boostType, setBoostType] = useState<'sunrise' | 'sunset' | null>(null);
  const [boostSteps, setBoostSteps] = useState(0);

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
            const updates: any = {};
            if (userData.coins === undefined) {
              updates.coins = 0;
            }
            if (userData.boostSteps === undefined) {
              updates.boostSteps = 0;
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

    // Load user data when component mounts
    loadUserCoins();

    // Listen for auth state changes
    // cast to any because firebase config is a JS module without types
    // @ts-ignore
    const currentAuth: any = auth;
    const unsubscribeAuth = currentAuth.onAuthStateChanged((user: any) => {
      if (user) {
        loadUserCoins();
      } else {
        setCoins(0); // Reset coins when user logs out
        setBoostSteps(0);
        setLifetimeSteps(0); // Reset lifetime steps when user logs out
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Check boost status every minute
  useEffect(() => {
    const updateBoostStatus = () => {
      const boostStatus = checkBoostTime();
      console.log(`[STEP CONTEXT] Setting boost active: ${boostStatus.isActive}, type: ${boostStatus.type}`);
      setIsBoostActive(boostStatus.isActive);
      setBoostType(boostStatus.type);
    };

    // Check immediately
    updateBoostStatus();

    // Then check every 10 seconds for testing (normally 60000 for 1 minute)
    const interval = setInterval(updateBoostStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  // Keep boostSteps (aggregated) in sync via realtime listener on the user's doc
  useEffect(() => {
    let unsubscribeUserSnap: (() => void) | null = null;
    // @ts-ignore
    const currentAuth: any = auth;
    const unsubscribeAuth = currentAuth.onAuthStateChanged((user: any) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeUserSnap = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const dbBoost = Number(data.boostSteps) || 0;
            // avoid overwriting local, unsynced increments: keep the larger of local vs db
            setBoostSteps((prev) => Math.max(Number(prev) || 0, dbBoost));
            if (data.coins !== undefined) setCoins(data.coins || 0);
            
            // Load lifetime steps from Firebase (use lifetimeTotalSteps, fallback to lifetimeSteps)
            const dbLifetimeSteps = Number(data.lifetimeTotalSteps || data.lifetimeSteps) || 0;
            setLifetimeSteps(dbLifetimeSteps);
          } else {
            // User document doesn't exist (possibly deleted), reset to defaults
            setBoostSteps(0);
            setLifetimeSteps(0);
            setCoins(0);
          }
        }, (err) => {
          // Handle errors silently (e.g., when user document is deleted)
          console.log('User document listener error (possibly deleted):', err.message);
          setBoostSteps(0);
          setLifetimeSteps(0);
          setCoins(0);
        });
      } else {
        setBoostSteps(0);
        setLifetimeSteps(0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserSnap) unsubscribeUserSnap();
    };
  }, []);

  // Sync daily records from Firebase
  useEffect(() => {
    let unsubscribeDailyRecords: (() => void) | null = null;
    // @ts-ignore
    const currentAuth: any = auth;
    const unsubscribeAuth = currentAuth.onAuthStateChanged((user: any) => {
      if (user) {
        const dailyStepsRef = collection(db, `users/${user.uid}/dailySteps`);
        unsubscribeDailyRecords = onSnapshot(dailyStepsRef, (querySnapshot: any) => {
          const records: DailyRecord[] = [];
          querySnapshot.forEach((doc: any) => {
            const data = doc.data();
            records.push({
              id: doc.id,
              steps: data.steps || 0,
              time: data.timestamp || null
            });
          });
          
          // Sort by date (newest first)
          records.sort((a, b) => b.id.localeCompare(a.id));
          setDailyRecords(records);
        }, (err: any) => {
          // Handle errors silently (e.g., when subcollection doesn't exist or user is deleted)
          console.log('Daily records listener error (possibly deleted):', err.message);
          setDailyRecords([]);
        });
      } else {
        setDailyRecords([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDailyRecords) unsubscribeDailyRecords();
    };
  }, []);

  return (
    // The provider's value now correctly includes ALL state management functions
    <StepContext.Provider value={{
      lifetimeSteps,
      setLifetimeSteps,
      dailyRecords,
      setDailyRecords,
      isLoggingOut,
      setIsLoggingOut,
      coins,
      setCoins,
      isBoostActive,
  boostType,
  boostSteps,
  setBoostSteps
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