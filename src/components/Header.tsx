import React from 'react';

interface HeaderProps {
  onShowModal: () => void;
  onShowSettings: () => void;
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShowModal, onShowSettings, onToggleSidebar, sidebarVisible }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>
          <i className="fas fa-clock"></i>
          AI Meeting Minutes
        </h1>
        <nav className="header-nav">
          {/* Sidebar toggle button removed as per request */}
          <button 
            className="btn btn-primary"
            onClick={onShowModal}
          >
            <i className="fas fa-plus"></i> New Meeting
          </button>
          <button 
            className="btn btn-secondary"
            onClick={onShowSettings}
          >
            <i className="fas fa-cog"></i> Settings
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
