import { create } from 'zustand';
import { getSettings, saveSettings, Settings } from '../services/settingsService';

interface SettingsState {
  settings: Settings;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    whisperBasePath: '',
    aiProvider: 'ollama',
    ollamaPath: '',
    ollamaModel: '',
    lmstudioPath: '',
    lmstudioApiKey: '',
    lmstudioModel: '',
    initialPrompt: '',
    summaryPrompt: ''
  },
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getSettings();
      set({ settings, loading: false });
    } catch (error) {
      set({ error: 'Failed to load settings', loading: false });
    }
  },

  saveSettings: async (settings: Settings) => {
    set({ loading: true, error: null });
    try {
      await saveSettings(settings);
      set({ settings, loading: false });
    } catch (error) {
      set({ error: 'Failed to save settings', loading: false });
    }
  }
}));
