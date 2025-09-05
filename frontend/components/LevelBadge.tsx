import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getLevelInfo } from '../utils/levelSystem';

interface LevelBadgeProps {
  userLevel: number;
  lifetimeSteps: number;
  onInfoPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function LevelBadge({ 
  userLevel, 
  lifetimeSteps, 
  onInfoPress, 
  size = 'medium' 
}: LevelBadgeProps) {
  const levelInfo = getLevelInfo(userLevel);
  
  // Dynamic sizing
  const dimensions = {
    small: { badge: 60, text: 12, icon: 14 },
    medium: { badge: 80, text: 14, icon: 16 },
    large: { badge: 100, text: 16, icon: 18 }
  };
  
  const dim = dimensions[size];
  
  // Level-based colors
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
  
  const [primaryColor, secondaryColor] = getLevelColors(userLevel);
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={styles.cardContainer}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <LinearGradient
              colors={[primaryColor, secondaryColor]}
              style={[
                styles.levelBadge,
                { 
                  width: dim.badge, 
                  height: dim.badge,
                  borderRadius: dim.badge / 2 
                }
              ]}
            >
              <Text style={[styles.levelNumber, { fontSize: dim.text }]}>
                {userLevel}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.sectionTitle}>{levelInfo.name}</Text>
        </View>
        
        <View style={styles.levelContent}>
          <View style={styles.levelInfo}>
            <Text style={styles.levelDescription}>{levelInfo.description}</Text>
            <Text style={styles.lifetimeStepsText}>
              {lifetimeSteps.toLocaleString()} lifetime steps
            </Text>
          </View>
          
          <Pressable onPress={onInfoPress} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={20} color="#8BC34A" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 20,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  levelContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  levelDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  lifetimeStepsText: {
    color: '#8BC34A',
    fontSize: 14,
    fontWeight: '500',
  },
  infoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139,195,74,0.1)',
  },
});
