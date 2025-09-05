// Utility functions for mood-based audio system

/**
 * Get current time in minutes from midnight
 */
export const getCurrentTimeInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Check if current time is within a specific range
 */
export const isWithinTimeRange = (current: number, start: number, end: number): boolean => {
  return current >= start && current <= end;
};

/**
 * Get sunrise and sunset time ranges (in minutes from midnight)
 */
export const getSunriseSunsetTimes = () => {
  return {
    sunrise: {
      start: 4 * 60,      // 4:00 AM
      end: 7 * 60,        // 7:00 AM
    },
    sunset: {
      start: 17 * 60 + 30, // 5:30 PM
      end: 19 * 60,        // 7:00 PM
    },
  };
};

/**
 * Get available mood options based on current time
 */
export const getAvailableMoods = (): string[] => {
  const currentTime = getCurrentTimeInMinutes();
  const { sunrise, sunset } = getSunriseSunsetTimes();
  
  // Base moods always available
  const baseMoods = ['Calm', 'Happy', 'Inspire'];
  
  // Check for special time-based moods
  if (isWithinTimeRange(currentTime, sunrise.start, sunrise.end)) {
    return [...baseMoods, 'Sunrise'];
  } else if (isWithinTimeRange(currentTime, sunset.start, sunset.end)) {
    return [...baseMoods, 'Sunset'];
  }
  
  return baseMoods;
};

/**
 * Get a motivational message based on selected mood
 */
export const getMoodMessage = (mood: string): string => {
  const messages = {
    Calm: '🧘‍♀️ Find your inner peace with calming melodies',
    Happy: '😊 Let the upbeat rhythms energize your day!',
    Inspire: '💪 Power up with motivational music that drives you forward',
    Sunrise: '🌅 Welcome the new day with fresh morning vibes',
    Sunset: '🌅 Unwind with peaceful evening serenity',
  };
  
  return messages[mood as keyof typeof messages] || '🎵 Enjoy your music!';
};

/**
 * Format time for display (e.g., "4:30 AM")
 */
export const formatTimeRange = (startMinutes: number, endMinutes: number): string => {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };
  
  return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
};

/**
 * Check if it's currently a special time (sunrise/sunset)
 */
export const getCurrentSpecialTime = (): 'sunrise' | 'sunset' | null => {
  const currentTime = getCurrentTimeInMinutes();
  const { sunrise, sunset } = getSunriseSunsetTimes();
  
  if (isWithinTimeRange(currentTime, sunrise.start, sunrise.end)) {
    return 'sunrise';
  } else if (isWithinTimeRange(currentTime, sunset.start, sunset.end)) {
    return 'sunset';
  }
  
  return null;
};
