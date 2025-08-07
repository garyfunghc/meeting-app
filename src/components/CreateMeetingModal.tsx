import React, { useState } from 'react';
import { useMeetings } from '../hooks/useMeetings';

interface CreateMeetingModalProps {
  show: boolean;
  onClose: () => void;
  onCreate: () => void;
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({ 
  show, 
  onClose,
  onCreate
}) => {
  const { createMeeting } = useMeetings();
  const [meetingName, setMeetingName] = useState('');
  const [language, setLanguage] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingName || !videoFile) return;
    
    setIsCreating(true);
    try {
      await createMeeting(videoFile, meetingName, language);
      setMeetingName('');
      setVideoFile(null);
      onCreate();
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
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
        <h3>Create New Meeting</h3>
        <form onSubmit={handleCreateMeeting} style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Meeting Name</label>
            <input
              type="text"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="Enter meeting name"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value="">Auto Detect</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="yue">Cantonese</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Upload Video</label>
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
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
              disabled={isCreating}
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
              disabled={isCreating || !meetingName || !videoFile}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                background: '#007bff',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {isCreating ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeetingModal;
