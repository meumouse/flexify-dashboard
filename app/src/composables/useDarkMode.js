import { ref, onMounted, onUnmounted } from 'vue';

export function useDarkMode() {
  const isDark = ref(false);

  let observer = null;

  const checkDarkMode = () => {
    isDark.value = document.body.classList.contains('dark');
  };

  onMounted(() => {
    // Initial check
    checkDarkMode();

    // Set up the mutation observer
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          checkDarkMode();
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  return { isDark };
}
