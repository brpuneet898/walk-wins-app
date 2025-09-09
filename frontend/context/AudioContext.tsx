import React, { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Audio Context Types
interface Song {
  id: string;
  title: string;
  artist?: string;
  category: 'Calm' | 'Happy' | 'Inspire' | 'Sunrise' | 'Sunset';
  audioUrl: string;
  duration?: number;
}

interface AudioContextType {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentSong: Song | null;
  currentPlaylist: Song[];
  currentCategory: string | null;
  
  // Playback controls
  playCategory: (category: string) => Promise<void>;
  playPause: () => Promise<void>;
  stopMusic: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State management
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Song[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize audio settings
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initializeAudio();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Fetch songs by category from Firestore
  const fetchSongsByCategory = async (category: string): Promise<Song[]> => {
    try {
      console.log(`🎵 Fetching songs for category: ${category}`);
      const songsRef = collection(db, 'songs');
      const q = query(songsRef, where('category', '==', category));
      const querySnapshot = await getDocs(q);
      
      const songs: Song[] = [];
      querySnapshot.forEach((doc) => {
        songs.push({ id: doc.id, ...doc.data() } as Song);
      });
      
      console.log(`🎵 Found ${songs.length} songs for ${category}`);
      return songs;
    } catch (error) {
      console.error('Error fetching songs:', error);
      throw error;
    }
  };

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Play a category (main function)
  const playCategory = async (category: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🎵 Starting playback for category: ${category}`);
      
      // Stop current music if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      // Fetch songs for category
      const songs = await fetchSongsByCategory(category);
      
      if (songs.length === 0) {
        throw new Error(`No songs found for category: ${category}`);
      }
      
      // Shuffle playlist
      const shuffledSongs = shuffleArray(songs);
      setCurrentPlaylist(shuffledSongs);
      setCurrentCategory(category);
      setCurrentIndex(0);
      
      // Play first song
      await playSpecificSong(shuffledSongs[0]);
      
    } catch (error) {
      console.error('Error playing category:', error);
      setError(error instanceof Error ? error.message : 'Failed to play music');
    } finally {
      setIsLoading(false);
    }
  };

  // Play specific song
  const playSpecificSong = async (song: Song) => {
    try {
      console.log(`🎵 Playing: ${song.title}`);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setCurrentSong(song);
      setIsPlaying(true);
      setIsPaused(false);
      
      // Handle when song finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          playNextSong();
        }
      });
      
    } catch (error) {
      console.error('Error playing song:', error);
      setError('Failed to play song');
    }
  };

  // Play next song in playlist
  const playNextSong = async () => {
    if (currentPlaylist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    setCurrentIndex(nextIndex);
    await playSpecificSong(currentPlaylist[nextIndex]);
  };

  // Play/Pause toggle
  const playPause = async () => {
    if (!sound) return;
    
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        setIsPaused(true);
        console.log('🎵 Music paused');
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        setIsPaused(false);
        console.log('🎵 Music resumed');
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError('Failed to control playback');
    }
  };

  // Stop music completely
  const stopMusic = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSong(null);
      setCurrentPlaylist([]);
      setCurrentCategory(null);
      setCurrentIndex(0);
      setError(null);
      
      console.log('🎵 Music stopped completely');
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  };

  const value: AudioContextType = {
    isPlaying,
    isPaused,
    currentSong,
    currentPlaylist,
    currentCategory,
    playCategory,
    playPause,
    stopMusic,
    isLoading,
    error,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
