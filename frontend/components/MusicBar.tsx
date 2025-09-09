import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useAudio } from '../context/AudioContext';

const MusicBar: React.FC = () => {
  const { 
    currentSong, 
    isPlaying, 
    isPaused, 
    playPause, 
    stopMusic, 
    currentCategory 
  } = useAudio();

  // Don't render if no song is playing
  if (!currentSong && !isPaused) {
    return null;
  }

  const handlePlayPause = async () => {
    await playPause();
  };

  const handleStop = async () => {
    await stopMusic();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Song Info */}
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong?.title || 'Unknown Track'}
          </Text>
          <Text style={styles.categoryText} numberOfLines={1}>
            {currentCategory} • {currentSong?.artist || 'Various Artists'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.playPauseButton]}
            onPress={handlePlayPause}
          >
            <Text style={styles.controlIcon}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>

          {/* Stop Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStop}
          >
            <Text style={styles.stopIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: isPlaying ? '#4CAF50' : '#FF9800' }
          ]} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#2C3E50',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryText: {
    color: '#BDC3C7',
    fontSize: 12,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playPauseButton: {
    backgroundColor: '#3498DB',
  },
  stopButton: {
    backgroundColor: '#E74C3C',
  },
  controlIcon: {
    fontSize: 16,
    color: 'white',
  },
  stopIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  statusIndicator: {
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default MusicBar;
