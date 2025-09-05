import api from './api';

export interface Settings {
  whisperBasePath: string;
  aiProvider: 'ollama' | 'lmstudio' | 'openai';
  ollamaPath: string;
  ollamaModel: string;
  lmstudioPath: string;
  lmstudioApiKey: string;
  lmstudioModel: string;
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
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
    openaiBaseUrl: response.data.openai_base_url || '',
    openaiApiKey: response.data.openai_api_key || '',
    openaiModel: response.data.openai_model || '',
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
    openai_base_url: settings.openaiBaseUrl,
    openai_api_key: settings.openaiApiKey,
    openai_model: settings.openaiModel,
    whisper_base_path: settings.whisperBasePath,
    summary_prompt: settings.summaryPrompt
  });
};
