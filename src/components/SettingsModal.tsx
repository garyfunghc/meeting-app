import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (settings: {
    whisperBasePath: string;
    ollamaPath: string;
    ollamaModel: string;
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
    setOllamaPath(settings.ollamaPath);
    setOllamaModel(settings.ollamaModel);
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
        ollamaPath,
        ollamaModel,
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
            <label>Ollama Path</label>
            <input
              type="text"
              value={ollamaPath}
              onChange={(e) => setOllamaPath(e.target.value)}
              placeholder="Enter Ollama path"
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
              placeholder="Enter Ollama model"
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
