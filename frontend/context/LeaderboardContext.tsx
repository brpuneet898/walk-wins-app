import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A type for a single leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  username: string;
  steps: number;
  userId?: string;
  date?: string;
  time?: string | null;
}

interface LeaderboardContextType {
  leaderboardData: LeaderboardEntry[];
  setLeaderboardData: React.Dispatch<React.SetStateAction<LeaderboardEntry[]>>;
  isLoadingLeaderboard: boolean;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

const LEADERBOARD_CACHE_KEY = 'leaderboard_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const LeaderboardProvider = ({ children }: { children: ReactNode }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  // Load cached leaderboard data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(LEADERBOARD_CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = Date.now();

          // Check if cache is still valid (within 30 minutes)
          if (now - timestamp < CACHE_DURATION) {
            console.log('[Leaderboard Cache] Loading cached data:', data.length, 'entries');
            setLeaderboardData(data);
          } else {
            console.log('[Leaderboard Cache] Cache expired, will fetch fresh data');
          }
        }
      } catch (error) {
        console.error('[Leaderboard Cache] Error loading cached data:', error);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    loadCachedData();
  }, []);

  // Cache leaderboard data whenever it changes
  useEffect(() => {
    const cacheData = async () => {
      if (leaderboardData.length > 0) {
        try {
          const cacheObject = {
            data: leaderboardData,
            timestamp: Date.now()
          };
          await AsyncStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(cacheObject));
          console.log('[Leaderboard Cache] Saved data to cache:', leaderboardData.length, 'entries');
        } catch (error) {
          console.error('[Leaderboard Cache] Error saving to cache:', error);
        }
      }
    };

    // Only cache if we have data and it's not loading
    if (!isLoadingLeaderboard && leaderboardData.length > 0) {
      cacheData();
    }
  }, [leaderboardData, isLoadingLeaderboard]);

  // Enhanced setLeaderboardData that also updates cache
  const enhancedSetLeaderboardData = (value: React.SetStateAction<LeaderboardEntry[]>) => {
    setLeaderboardData(prevData => {
      const newData = typeof value === 'function' ? value(prevData) : value;
      console.log('[Leaderboard Context] Data updated:', newData.length, 'entries');

      // Cache the new data immediately
      if (newData.length > 0) {
        const cacheObject = {
          data: newData,
          timestamp: Date.now()
        };
        AsyncStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(cacheObject))
          .catch(error => console.error('[Leaderboard Cache] Error saving updated data:', error));
      }

      return newData;
    });
  };

  return (
    <LeaderboardContext.Provider value={{
      leaderboardData,
      setLeaderboardData: enhancedSetLeaderboardData,
      isLoadingLeaderboard
    }}>
      {children}
    </LeaderboardContext.Provider>
  );
};

export const useLeaderboard = () => {
  const context = useContext(LeaderboardContext);
  if (context === undefined) {
    throw new Error('useLeaderboard must be used within a LeaderboardProvider');
  }
  return context;
};
