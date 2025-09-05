import React from 'react';
import { useLevelSystem } from '../context/LevelContext';
import EnhancedLevelUpModal from './EnhancedLevelUpModal';
import LevelUpModal from './LevelUpModal';

export default function GlobalLevelUpModal() {
  const {
    showLevelUpModal,
    showEnhancedLevelUpModal,
    pendingLevelUp,
    dismissLevelUpModal,
    dismissEnhancedLevelUpModal,
  } = useLevelSystem();

  if (!pendingLevelUp) return null;

  return (
    <>
      {/* Enhanced modal for major celebrations */}
      <EnhancedLevelUpModal
        visible={showEnhancedLevelUpModal}
        oldLevel={pendingLevelUp.oldLevel}
        newLevel={pendingLevelUp.newLevel}
        onClose={dismissEnhancedLevelUpModal}
      />
      
      {/* Regular modal as fallback */}
      <LevelUpModal
        visible={showLevelUpModal}
        oldLevel={pendingLevelUp.oldLevel}
        newLevel={pendingLevelUp.newLevel}
        lifetimeSteps={0} // This will be handled by the context
        onClose={dismissLevelUpModal}
      />
    </>
  );
}
