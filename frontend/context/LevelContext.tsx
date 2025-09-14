import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  calculateUserLevel, 
  shouldLevelUp, 
  getLevelInfo,
  LEVEL_CONFIG 
} from '../utils/levelSystem';

interface LevelContextType {
  currentLevel: number;
  lifetimeSteps: number;
  levelUpPending: boolean;
  showLevelUpModal: boolean;
  showEnhancedLevelUpModal: boolean;
  pendingLevelUp: { oldLevel: number; newLevel: number } | null;
  updateLifetimeSteps: (newSteps: number) => Promise<void>;
  dismissLevelUpModal: () => void;
  dismissEnhancedLevelUpModal: () => void;
  initializeUserLevel: (steps: number) => Promise<void>;
  checkForOfflineLevelUp: () => Promise<void>;
}

const LevelContext = createContext<LevelContextType | undefined>(undefined);

interface LevelProviderProps {
  children: ReactNode;
}

export function LevelProvider({ children }: LevelProviderProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [lifetimeSteps, setLifetimeSteps] = useState(0);
  const [levelUpPending, setLevelUpPending] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showEnhancedLevelUpModal, setShowEnhancedLevelUpModal] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<{ oldLevel: number; newLevel: number } | null>(null);

  // Listen to user's level changes from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        // Use lifetimeTotalSteps from database, fallback to lifetimeSteps
        const userLifetimeSteps = userData.lifetimeTotalSteps || userData.lifetimeSteps || 0;
        const userCurrentLevel = userData.currentLevel || 0;
        
        setLifetimeSteps(userLifetimeSteps);
        setCurrentLevel(userCurrentLevel);

        // Check if user should be at a higher level based on their lifetime steps
        const calculatedLevel = calculateUserLevel(userLifetimeSteps);
        if (calculatedLevel.level > userCurrentLevel) {
          // Update the database with correct level (but don't show level-up modal since this is a correction)
          updateDoc(userRef, {
            currentLevel: calculatedLevel.level,
            coinMultiplier: calculatedLevel.coinMultiplier,
            levelUpdatedAt: new Date().toISOString(),
          }).catch((error) => {
            console.error('Error correcting level:', error);
          });
        }

        // Check for offline level-ups after data loads
        setTimeout(() => {
          checkForOfflineLevelUp();
        }, 1000);
      } else {
        // User document doesn't exist (possibly deleted), reset to defaults
        setLifetimeSteps(0);
        setCurrentLevel(0);
        setPendingLevelUp(null);
        setShowLevelUpModal(false);
        setShowEnhancedLevelUpModal(false);
      }
    }, (error) => {
      // Handle errors silently (e.g., when user document is deleted)
      console.log('Level context listener error (possibly deleted):', error.message);
      setLifetimeSteps(0);
      setCurrentLevel(0);
      setPendingLevelUp(null);
      setShowLevelUpModal(false);
      setShowEnhancedLevelUpModal(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Initialize user level for existing users who don't have level data
  const initializeUserLevel = async (steps: number): Promise<void> => {
    if (!auth.currentUser) return;

    try {
      const calculatedLevel = calculateUserLevel(steps);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      await updateDoc(userRef, {
        currentLevel: calculatedLevel.level,
        lifetimeSteps: steps,
        lifetimeTotalSteps: steps, // Sync both field names
        coinMultiplier: calculatedLevel.coinMultiplier,
        levelUpdatedAt: new Date().toISOString(),
      });

      setCurrentLevel(calculatedLevel.level);
      setLifetimeSteps(steps);
    } catch (error) {
      console.error('Error initializing user level:', error);
    }
  };

  // Update lifetime steps and check for level up
  const updateLifetimeSteps = async (newTotalSteps: number): Promise<void> => {
    if (!auth.currentUser || newTotalSteps <= lifetimeSteps) return;

    try {
      const oldLevel = currentLevel;
      const newLevel = calculateUserLevel(newTotalSteps);

      // Check if user should level up
      if (newLevel.level > oldLevel) {
        setLevelUpPending(true);
        setPendingLevelUp({ oldLevel, newLevel: newLevel.level });
        
        // Update database with new level
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          currentLevel: newLevel.level,
          lifetimeSteps: newTotalSteps,
          lifetimeTotalSteps: newTotalSteps, // Sync both field names
          coinMultiplier: newLevel.coinMultiplier,
          levelUpdatedAt: new Date().toISOString(),
        });

        // Update stored level to prevent showing offline level-up next time
        const lastKnownLevelKey = `lastKnownLevel_${auth.currentUser.uid}`;
        await AsyncStorage.setItem(lastKnownLevelKey, newLevel.level.toString());

        // Show enhanced level up modal after a short delay
        setTimeout(() => {
          setShowEnhancedLevelUpModal(true);
          setLevelUpPending(false);
        }, 500);
      } else {
        // Just update steps without level change
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          lifetimeSteps: newTotalSteps,
          lifetimeTotalSteps: newTotalSteps, // Sync both field names
        });
      }

      setLifetimeSteps(newTotalSteps);
      if (newLevel.level > oldLevel) {
        setCurrentLevel(newLevel.level);
      }
    } catch (error) {
      console.error('Error updating lifetime steps:', error);
    }
  };

  // Dismiss level up modal
  const dismissLevelUpModal = () => {
    setShowLevelUpModal(false);
    setPendingLevelUp(null);
  };

  // Dismiss enhanced level up modal
  const dismissEnhancedLevelUpModal = () => {
    setShowEnhancedLevelUpModal(false);
    setPendingLevelUp(null);
  };

  // Check for level-ups that occurred while app was closed
  const checkForOfflineLevelUp = async (): Promise<void> => {
    if (!auth.currentUser) return;

    try {
      const lastKnownLevelKey = `lastKnownLevel_${auth.currentUser.uid}`;
      const lastKnownLevelStr = await AsyncStorage.getItem(lastKnownLevelKey);
      const lastKnownLevel = lastKnownLevelStr ? parseInt(lastKnownLevelStr, 10) : 0;

      // If current level is higher than last known level, show celebration
      if (currentLevel > lastKnownLevel && lastKnownLevel > 0) {
        console.log(`🎉 [LEVEL CONTEXT] Offline level-up detected! ${lastKnownLevel} → ${currentLevel}`);
        setPendingLevelUp({ oldLevel: lastKnownLevel, newLevel: currentLevel });
        setShowEnhancedLevelUpModal(true);
      }

      // Update the stored last known level
      await AsyncStorage.setItem(lastKnownLevelKey, currentLevel.toString());
    } catch (error) {
      console.error('Error checking for offline level-up:', error);
    }
  };

  const value: LevelContextType = {
    currentLevel,
    lifetimeSteps,
    levelUpPending,
    showLevelUpModal,
    showEnhancedLevelUpModal,
    pendingLevelUp,
    updateLifetimeSteps,
    dismissLevelUpModal,
    dismissEnhancedLevelUpModal,
    initializeUserLevel,
    checkForOfflineLevelUp,
  };

  return (
    <LevelContext.Provider value={value}>
      {children}
    </LevelContext.Provider>
  );
}

export function useLevelSystem() {
  const context = useContext(LevelContext);
  if (context === undefined) {
    throw new Error('useLevelSystem must be used within a LevelProvider');
  }
  return context;
}

// Hook for level calculations
export function useLevelCalculations() {
  const { currentLevel, lifetimeSteps } = useLevelSystem();
  
  const levelInfo = getLevelInfo(currentLevel);
  const nextLevel = currentLevel < 10 ? getLevelInfo(currentLevel + 1) : null;
  
  // Calculate progress to next level
  const getProgressToNextLevel = () => {
    if (!nextLevel) return { progress: 100, stepsNeeded: 0, stepsRemaining: 0 };
    
    const currentLevelSteps = levelInfo.requiredSteps;
    const nextLevelSteps = nextLevel.requiredSteps;
    const progressSteps = lifetimeSteps - currentLevelSteps;
    const totalStepsNeeded = nextLevelSteps - currentLevelSteps;
    const progress = Math.min((progressSteps / totalStepsNeeded) * 100, 100);
    const stepsRemaining = Math.max(nextLevelSteps - lifetimeSteps, 0);
    
    return {
      progress,
      stepsNeeded: totalStepsNeeded,
      stepsRemaining,
    };
  };

  return {
    levelInfo,
    nextLevel,
    getProgressToNextLevel,
    isMaxLevel: currentLevel >= 10,
  };
}
