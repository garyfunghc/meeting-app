import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (settings: {
    whisperBasePath: string;
    aiProvider: 'ollama' | 'lmstudio';
    ollamaPath: string;
    ollamaModel: string;
    lmstudioPath: string;
    lmstudioApiKey: string;
    lmstudioModel: string;
    initialPrompt: string;
    summaryPrompt: string;
  }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ show, onClose, onSave }) => {
  const {
    settings,
    loading: isLoading,
    error: storeError,
    loadSettings,
    saveSettings: saveToStore
  } = useSettingsStore();

  const [whisperBasePath, setWhisperBasePath] = useState(settings.whisperBasePath);
  const [aiProvider, setAiProvider] = useState<'ollama' | 'lmstudio'>(settings.aiProvider);
  const [lmstudioPath, setLmstudioPath] = useState(settings.lmstudioPath || '');
  const [lmstudioApiKey, setLmstudioApiKey] = useState(settings.lmstudioApiKey || '');
  const [lmstudioModel, setLmstudioModel] = useState(settings.lmstudioModel || '');
  const [ollamaPath, setOllamaPath] = useState(settings.ollamaPath);
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel);
  const [initialPrompt, setInitialPrompt] = useState(settings.initialPrompt);
  const [summaryPrompt, setSummaryPrompt] = useState(settings.summaryPrompt || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(storeError || '');

  useEffect(() => {
    if (show) {
      loadSettings();
    }
  }, [show]);

  useEffect(() => {
    setWhisperBasePath(settings.whisperBasePath);
    setAiProvider(settings.aiProvider);
    setOllamaPath(settings.ollamaPath);
    setOllamaModel(settings.ollamaModel);
    setLmstudioPath(settings.lmstudioPath || '');
    setLmstudioApiKey(settings.lmstudioApiKey || '');
    setLmstudioModel(settings.lmstudioModel || '');
    setInitialPrompt(settings.initialPrompt);
    setSummaryPrompt(settings.summaryPrompt || '');
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    try {
      const newSettings = {
        whisperBasePath,
        aiProvider,
        ollamaPath,
        ollamaModel,
        lmstudioPath,
        lmstudioApiKey,
        lmstudioModel,
        initialPrompt,
        summaryPrompt
      };
      await saveToStore(newSettings);
      await onSave(newSettings);
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3>Settings</h3>
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as 'ollama' | 'lmstudio')}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value="ollama">Ollama</option>
              <option value="lmstudio">LM Studio</option>
            </select>
          </div>

          {aiProvider === 'ollama' && (
            <>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Ollama Path</label>
                <input
                  type="text"
                  value={ollamaPath}
                  onChange={(e) => setOllamaPath(e.target.value)}
                  placeholder="Enter Ollama path (e.g., http://localhost:11434)"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Ollama Model</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="Enter Ollama model (e.g., llama2, mistral)"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            </>
          )}


          {aiProvider === 'lmstudio' && (
            <>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>LM Studio Path</label>
                <input
                  type="text"
                  value={lmstudioPath}
                  onChange={(e) => setLmstudioPath(e.target.value)}
                  placeholder="Enter LM Studio path (e.g., http://localhost:1234)"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>LM Studio API Key</label>
                <input
                  type="password"
                  value={lmstudioApiKey}
                  onChange={(e) => setLmstudioApiKey(e.target.value)}
                  placeholder="Enter LM Studio API key"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>LM Studio Model</label>
                <input
                  type="text"
                  value={lmstudioModel}
                  onChange={(e) => setLmstudioModel(e.target.value)}
                  placeholder="Enter LM Studio model name"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            </>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Whisper Base Path</label>
            <input
              type="text"
              value={whisperBasePath}
              onChange={(e) => setWhisperBasePath(e.target.value)}
              placeholder="Enter Whisper base path"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Initial Prompt</label>
            <input
              type="text"
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              placeholder="Enter initial prompt"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Summary Prompt</label>
            <textarea
              value={summaryPrompt}
              onChange={(e) => setSummaryPrompt(e.target.value)}
              placeholder="Enter summary prompt"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                minHeight: '100px'
              }}
            />
          </div>
          {error && (
            <div style={{
              color: 'red',
              margin: '1rem 0',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          <div className="modal-actions" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: 'pointer',
                color: '#333'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                background: '#007bff',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
