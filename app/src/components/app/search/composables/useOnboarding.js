import { ref, onMounted } from 'vue';
import { STORAGE_KEYS } from '../state/constants.js';

/**
 * Composable for managing search onboarding state
 * @returns {Object} Onboarding state and functions
 */
export const useOnboarding = () => {
  const hasSeenOnboarding = ref(false);
  const showOnboarding = ref(false);

  /**
   * Checks if user has seen onboarding
   */
  const checkOnboardingStatus = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN);
    hasSeenOnboarding.value = stored === 'true';
  };

  /**
   * Marks onboarding as seen
   */
  const markOnboardingSeen = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    hasSeenOnboarding.value = true;
    showOnboarding.value = false;
  };

  /**
   * Shows onboarding tutorial
   */
  const showOnboardingTutorial = () => {
    showOnboarding.value = true;
  };

  /**
   * Hides onboarding tutorial
   */
  const hideOnboarding = () => {
    showOnboarding.value = false;
  };

  /**
   * Triggers onboarding display if not seen
   * @param {number} delay - Delay in milliseconds before showing
   */
  const triggerOnboardingIfNeeded = (delay = 300) => {
    if (!hasSeenOnboarding.value) {
      checkOnboardingStatus();
      if (!hasSeenOnboarding.value) {
        setTimeout(() => {
          showOnboarding.value = true;
        }, delay);
      }
    }
  };

  // Check status on mount
  onMounted(() => {
    checkOnboardingStatus();
  });

  return {
    hasSeenOnboarding,
    showOnboarding,
    checkOnboardingStatus,
    markOnboardingSeen,
    showOnboardingTutorial,
    hideOnboarding,
    triggerOnboardingIfNeeded,
  };
};
