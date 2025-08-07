import React, { useEffect, useState } from 'react';
import { useMeetings } from '../hooks/useMeetings';
import { Meeting } from '../services/meetingService';

interface SidebarProps {
  activeMeeting: string | null;
  setActiveMeeting: (id: string | null) => void;
  onDeleteMeeting: (id: string) => void;
  onToggleSidebar?: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMeeting, setActiveMeeting, onDeleteMeeting, onToggleSidebar, className = '' }) => {
  const { meetings, loading, error, removeMeeting, loadMeetings } = useMeetings();
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  return (
    <div className={`sidebar ${className}`}>
      <div className="sidebar-header">
        <h3>Recent Meetings</h3>
        <button 
          className="sidebar-toggle-btn"
          onClick={() => onToggleSidebar && onToggleSidebar()}
        >
          <i className="fas fa-arrow-left"></i>
        </button>
      </div>
      <div className="meetings-list">
        {loading && <div>Loading meetings...</div>}
        {error && <div className="error">{error}</div>}
        {meetings?.map((meeting) => (
          <div
            key={meeting.id}
            className={`meeting-item ${activeMeeting === meeting.id ? 'active' : ''}`}
            onClick={() => setActiveMeeting(meeting.id)}
          >
            <h4>{meeting.title}</h4>
            <p>{new Date(meeting.created_at).toLocaleDateString()}</p>
            <button 
              className="delete-meeting-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMeetingToDelete(meeting.id);
                onDeleteMeeting(meeting.id);
              }}
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
