import React from 'react';
import WelcomeScreen from './WelcomeScreen';
import MeetingView from './MeetingView';

interface ContentAreaProps {
  activeMeeting: string | null;
  onShowModal: () => void;
  onDeleteMeeting: (id: string) => void;
  sidebarVisible: boolean;
}

const ContentArea: React.FC<ContentAreaProps> = ({ activeMeeting, onShowModal, onDeleteMeeting, sidebarVisible }) => {
  return (
      <div className={`content-area ${sidebarVisible ? '' : 'full-width'}`}>
      {activeMeeting ? (
        <MeetingView 
          key={activeMeeting}
          meetingId={activeMeeting}
          onDeleteMeeting={onDeleteMeeting}
        />
      ) : (
        <WelcomeScreen onShowModal={onShowModal} />
      )}
    </div>
  );
};

export default ContentArea;
