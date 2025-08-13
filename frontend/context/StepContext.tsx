import React, { createContext, useState, useContext, ReactNode } from 'react';

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
}

const StepContext = createContext<StepContextType | undefined>(undefined);

export const StepProvider = ({ children }: { children: ReactNode }) => {
  // All state variables are now correctly included
  const [lifetimeSteps, setLifetimeSteps] = useState(0);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      setIsLoggingOut 
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