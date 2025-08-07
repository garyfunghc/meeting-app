import api from './api';

export interface Settings {
  whisperBasePath: string;
  ollamaPath: string;
  ollamaModel: string;
  initialPrompt: string;
  summaryPrompt: string;
}

export const getSettings = async (): Promise<Settings> => {
  const response = await api.get('/settings');
  return {
    whisperBasePath: response.data.whisper_base_path || '',
    ollamaPath: response.data.ollama_path || '',
    ollamaModel: response.data.ollama_model || '',
    initialPrompt: response.data.initial_prompt || '',
    summaryPrompt: response.data.summary_prompt || ''
  };
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  await api.post('/settings', {
    initial_prompt: settings.initialPrompt,
    ollama_model: settings.ollamaModel,
    ollama_path: settings.ollamaPath,
    whisper_base_path: settings.whisperBasePath,
    summary_prompt: settings.summaryPrompt
  });
};
