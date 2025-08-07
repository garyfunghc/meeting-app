import React, { useState, useEffect } from 'react';
import './styles.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import WelcomeScreen from './components/WelcomeScreen';
import CreateMeetingModal from './components/CreateMeetingModal';
import SettingsModal from './components/SettingsModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { useSettingsStore } from './store/settingsStore';
import { useMeetings } from './hooks/useMeetings';

function App() {
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const { loadSettings } = useSettingsStore();
  const { removeMeeting } = useMeetings();
  
  useEffect(() => {
    if (showSettingsModal) {
      loadSettings();
    }
  }, [showSettingsModal, loadSettings]);

  return (
    <div className="app">
      <Header 
        onShowModal={() => setShowModal(true)}
        onShowSettings={() => setShowSettingsModal(true)}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        sidebarVisible={sidebarVisible}
      />
      <div className="main-content">
        {!sidebarVisible && (
          <button 
            className="floating-sidebar-toggle"
            onClick={() => setSidebarVisible(true)}
          >
            <i className="fas fa-arrow-right"></i>
          </button>
        )}
        <Sidebar 
          className={sidebarVisible ? '' : 'collapsed'}
          activeMeeting={activeMeeting}
          setActiveMeeting={setActiveMeeting}
          onDeleteMeeting={(id) => {
            setMeetingToDelete(id);
            setShowDeleteModal(true);
          }}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        />
        <ContentArea 
          sidebarVisible={sidebarVisible}
          activeMeeting={activeMeeting}
          onShowModal={() => setShowModal(true)}
          onDeleteMeeting={(id) => {
            setMeetingToDelete(id);
            setShowDeleteModal(true);
          }}
        />
      </div>
      <CreateMeetingModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onCreate={() => setShowModal(false)}
      />
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={async () => {}}
      />
      <DeleteConfirmationModal
        show={showDeleteModal}
        onConfirm={async () => {
          if (meetingToDelete) {
            await removeMeeting(meetingToDelete);
            if (activeMeeting === meetingToDelete) {
              setActiveMeeting(null);
            }
            setShowDeleteModal(false);
            setMeetingToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteModal(false);
          setMeetingToDelete(null);
        }}
        itemName="this meeting"
      />
    </div>
  );
}

export default App;
