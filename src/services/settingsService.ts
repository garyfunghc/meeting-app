import api from './api';

export interface Settings {
  whisperBasePath: string;
  aiProvider: 'ollama' | 'lmstudio';
  ollamaPath: string;
  ollamaModel: string;
  lmstudioPath: string;
  lmstudioApiKey: string;
  lmstudioModel: string;
  initialPrompt: string;
  summaryPrompt: string;
}

export const getSettings = async (): Promise<Settings> => {
  const response = await api.get('/settings');
  return {
    whisperBasePath: response.data.whisper_base_path || '',
    aiProvider: response.data.ai_provider || 'ollama',
    ollamaPath: response.data.ollama_path || '',
    ollamaModel: response.data.ollama_model || '',
    lmstudioPath: response.data.lmstudio_path || '',
    lmstudioApiKey: response.data.lmstudio_api_key || '',
    lmstudioModel: response.data.lmstudio_model || '',
    initialPrompt: response.data.initial_prompt || '',
    summaryPrompt: response.data.summary_prompt || ''
  };
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  await api.post('/settings', {
    ai_provider: settings.aiProvider,
    initial_prompt: settings.initialPrompt,
    ollama_model: settings.ollamaModel,
    ollama_path: settings.ollamaPath,
    lmstudio_path: settings.lmstudioPath,
    lmstudio_api_key: settings.lmstudioApiKey,
    lmstudio_model: settings.lmstudioModel,
    whisper_base_path: settings.whisperBasePath,
    summary_prompt: settings.summaryPrompt
  });
};
