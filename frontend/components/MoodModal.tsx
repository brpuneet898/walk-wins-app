import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useAudio } from '../context/AudioContext';

interface MoodModalProps {
  visible: boolean;
  onClose: () => void;
  availableMoods: string[];
}

const MoodModal: React.FC<MoodModalProps> = ({ visible, onClose, availableMoods }) => {
  const { playCategory, isLoading } = useAudio();

  const handleMoodSelect = async (mood: string) => {
    try {
      await playCategory(mood);
      onClose();
    } catch (error) {
      Alert.alert(
        'Playback Error',
        'Failed to start music. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'calm': return '🧘‍♀️';
      case 'happy': return '😊';
      case 'inspire': return '💪';
      case 'sunrise': return '🌅';
      case 'sunset': return '🌅';
      default: return '🎵';
    }
  };

  const getMoodDescription = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'calm': return 'Peaceful & Relaxing';
      case 'happy': return 'Upbeat & Energetic';
      case 'inspire': return 'Motivational & Powerful';
      case 'sunrise': return 'Fresh Morning Vibes';
      case 'sunset': return 'Evening Serenity';
      default: return 'Music for your mood';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🎵 Choose Your Mood</Text>
            <Text style={styles.subtitle}>What matches your vibe right now?</Text>
          </View>

          {/* Scrollable content area */}
          <ScrollView 
            style={styles.contentArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Mood Options */}
            <View style={styles.moodContainer}>
              {availableMoods.map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={styles.moodButton}
                  onPress={() => handleMoodSelect(mood)}
                  disabled={isLoading}
                >
                  <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
                  <Text style={styles.moodText} numberOfLines={2}>{mood}</Text>
                  <Text style={styles.moodDescription} numberOfLines={2} adjustsFontSizeToFit={true}>{getMoodDescription(mood)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Special note for time-based moods */}
            {(availableMoods.includes('Sunrise') || availableMoods.includes('Sunset')) && (
              <View style={styles.specialNote}>
                <Text style={styles.specialNoteText}>
                  ✨ Special {availableMoods.includes('Sunrise') ? 'sunrise' : 'sunset'} playlist available!
                </Text>
              </View>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>🎵 Loading your playlist...</Text>
              </View>
            )}
          </ScrollView>

          {/* Fixed cancel button at bottom */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    paddingBottom: 0, // Remove bottom padding as button has its own container
    width: width * 0.9,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contentArea: {
    maxHeight: 400, // Set a maximum height instead of flex: 1
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  moodContainer: {
    gap: 16,
  },
  moodButton: {
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 195, 74, 0.3)',
    flexDirection: 'row',
    gap: 12,
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  moodDescription: {
    fontSize: 12,
    color: '#8BC34A',
    fontStyle: 'italic',
  },
  specialNote: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  specialNoteText: {
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  loadingText: {
    fontSize: 16,
    color: '#8BC34A',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MoodModal;
