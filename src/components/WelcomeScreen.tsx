import React from 'react';

interface WelcomeScreenProps {
  onShowModal: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onShowModal }) => {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <i className="fas fa-clock"></i>
        </div>
        <h2>Welcome to Meeting Minutes</h2>
        <p>
          Get started by creating a new meeting or selecting an existing one from the sidebar.
        </p>
        <button 
          className="btn btn-primary btn-large"
          onClick={onShowModal}
        >
          <i className="fas fa-plus"></i> Create New Meeting
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
