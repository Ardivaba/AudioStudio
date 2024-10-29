import { computed, onMounted, ref } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { useThemeStore } from '../stores/theme';

interface Theme {
  name: string;
  label: string;
}

export const useSettingsView = () => {
  const settingsStore = useSettingsStore();
  const themeStore = useThemeStore();

  const isLoaded = ref(false);
  const selectedTheme = ref('');

  const themes: Theme[] = [
    { name: 'light', label: 'Hele' },
    { name: 'dark', label: 'Tume' },
    { name: 'cupcake', label: 'Cupcake' },
    { name: 'bumblebee', label: 'Bumblebee' },
    { name: 'emerald', label: 'Emerald' },
    { name: 'corporate', label: 'Corporate' },
    { name: 'synthwave', label: 'Synthwave' },
    { name: 'retro', label: 'Retro' },
    { name: 'cyberpunk', label: 'Cyberpunk' },
    { name: 'valentine', label: 'Valentine' },
  ];

  const validationError = computed(() => {
    return null;
  });

  const init = async () => {
    await settingsStore.getSettings();
    selectedTheme.value = themeStore.currentTheme;
    isLoaded.value = true;
  };

  const saveSettings = async () => {
    if (validationError.value) {
      return;
    }
    try {
      await settingsStore.updateSettings();
      alert('Seaded edukalt salvestatud!');
    } catch (error) {
      alert('Viga seadete salvestamisel: ' + (error as Error).message);
    }
  };

  const changeTheme = () => {
    themeStore.setTheme(selectedTheme.value);
  };

  onMounted(init);

  return {
    isLoaded,
    selectedTheme,
    themes,
    validationError,
    saveSettings,
    changeTheme,
  };
};