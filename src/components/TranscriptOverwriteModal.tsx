import React from 'react';

interface TranscriptOverwriteModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TranscriptOverwriteModal: React.FC<TranscriptOverwriteModalProps> = ({ 
  show, 
  onConfirm, 
  onCancel
}) => {
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
        <h3 style={{ marginTop: 0 }}>Confirm Overwrite</h3>
        <p>The transcript is not empty. All changes will be overwritten. Continue?</p>
        <div className="modal-actions" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
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
            className="btn btn-primary" 
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              background: '#007bff',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptOverwriteModal;
