import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LEVEL_CONFIG, formatSteps, formatCoins } from '../utils/levelSystem';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

interface LevelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserLevel: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function LevelInfoModal({ 
  visible, 
  onClose, 
  currentUserLevel 
}: LevelInfoModalProps) {
  const [levelUserCounts, setLevelUserCounts] = useState<{ [level: number]: number }>({});
  const [loading, setLoading] = useState(false);

  // Fetch user counts for each level
  useEffect(() => {
    if (visible) {
      fetchLevelCounts();
    }
  }, [visible]);

  const fetchLevelCounts = async () => {
    setLoading(true);
    try {
      const counts: { [level: number]: number } = {};
      
      // Fetch counts for each level
      for (let level = 0; level <= 10; level++) {
        const q = query(
          collection(db, 'users'),
          where('currentLevel', '==', level)
        );
        const snapshot = await getCountFromServer(q);
        counts[level] = snapshot.data().count;
      }
      
      setLevelUserCounts(counts);
    } catch (error) {
      console.error('Error fetching level counts:', error);
      // Set default counts if fetch fails
      const defaultCounts: { [level: number]: number } = {};
      for (let level = 0; level <= 10; level++) {
        defaultCounts[level] = 0;
      }
      setLevelUserCounts(defaultCounts);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColors = (level: number) => {
    const colorSets = [
      ['#757575', '#424242'], // Level 0 - Gray
      ['#8BC34A', '#689F38'], // Level 1 - Light Green
      ['#4CAF50', '#388E3C'], // Level 2 - Green
      ['#2196F3', '#1976D2'], // Level 3 - Blue
      ['#9C27B0', '#7B1FA2'], // Level 4 - Purple
      ['#FF9800', '#F57C00'], // Level 5 - Orange
      ['#F44336', '#D32F2F'], // Level 6 - Red
      ['#E91E63', '#C2185B'], // Level 7 - Pink
      ['#673AB7', '#512DA8'], // Level 8 - Deep Purple
      ['#FF5722', '#E64A19'], // Level 9 - Deep Orange
      ['#FFD700', '#FFA000']  // Level 10 - Gold
    ];
    return colorSets[Math.min(level, 10)] || colorSets[0];
  };

  const renderLevelCard = (levelInfo: any, index: number) => {
    const [primaryColor, secondaryColor] = getLevelColors(levelInfo.level);
    const isCurrentLevel = levelInfo.level === currentUserLevel;
    const userCount = levelUserCounts[levelInfo.level] || 0;

    return (
      <LinearGradient
        key={levelInfo.level}
        colors={isCurrentLevel ? [primaryColor + '40', secondaryColor + '20'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={[
          styles.levelCard,
          isCurrentLevel && styles.currentLevelCard
        ]}
      >
        <View style={styles.levelHeader}>
          <LinearGradient
            colors={[primaryColor, secondaryColor]}
            style={styles.levelBadge}
          >
            <Text style={styles.levelNumber}>{levelInfo.level}</Text>
          </LinearGradient>
          
          <View style={styles.levelDetails}>
            <Text style={styles.levelName}>{levelInfo.name}</Text>
            <Text style={styles.levelDescription}>{levelInfo.description}</Text>
          </View>
          
          {isCurrentLevel && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>YOU</Text>
            </View>
          )}
        </View>

        <View style={styles.levelStats}>
          <View style={styles.statItem}>
            <Ionicons name="footsteps" size={16} color="#8BC34A" />
            <Text style={styles.statLabel}>Required Steps</Text>
            <Text style={styles.statValue}>
              {formatSteps(levelInfo.requiredSteps)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.coinIcon}
            />
            <Text style={styles.statLabel}>Coin Rate</Text>
            <Text style={styles.statValue}>
              {formatCoins(levelInfo.coinMultiplier)} per step
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#2196F3" />
            <Text style={styles.statLabel}>Users at Level</Text>
            <Text style={styles.statValue}>
              {loading ? '...' : userCount.toLocaleString()}
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        style={styles.modalContainer}
      >
        <View style={styles.header}>
          <Text style={styles.modalTitle}>Level System</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>
            🏃🏻‍♂️ Your Walking Journey Levels
          </Text>
          <Text style={styles.sectionDescription}>
            Progress through levels by accumulating lifetime steps. Higher levels earn more coins per step!
          </Text>

          {LEVEL_CONFIG.map(renderLevelCard)}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Keep walking to unlock higher levels and earn more coins! 🚶‍♀️💰
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 24,
    lineHeight: 22,
  },
  levelCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currentLevelCard: {
    borderColor: '#8BC34A',
    borderWidth: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelDetails: {
    flex: 1,
    marginLeft: 12,
  },
  levelName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  levelDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 18,
  },
  currentBadge: {
    backgroundColor: '#8BC34A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: '#8BC34A',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  coinIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFD700',
  },
});
