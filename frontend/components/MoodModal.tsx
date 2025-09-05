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
                  <Text style={styles.moodText}>{mood}</Text>
                  <Text style={styles.moodDescription}>{getMoodDescription(mood)}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
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
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  moodContainer: {
    gap: 16,
  },
  moodButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    gap: 16,
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  moodDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  specialNote: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  specialNoteText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  closeButton: {
    backgroundColor: '#6C757D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MoodModal;
