import api from './api';

export interface Meeting {
  id: string;
  title: string;
  audio_file_path: string;
  transcription: string;
  transcription_with_speaker: string;
  language: string;
  created_at: string;
  updated_at: string;
  audio_url?: string;
}

export interface Summary {
  id: string;
  meeting_id: string;
  content: string;
  created_at: string;
}

export const getMeetings = async (): Promise<Meeting[]> => {
  const response = await api.get('/meetings');
  return response.data;
};

export const getMeeting = async (id: string): Promise<Meeting> => {
  const response = await api.get(`/meeting/${id}`);
  return response.data;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  await api.delete(`/meeting/${id}`);
};

export const uploadAudio = async (file: File, title: string, language: string): Promise<Meeting> => {
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('title', title);
  formData.append('language', language);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getMeetingTranscription = async (id: string): Promise<string> => {
  const response = await api.get(`/meeting/${id}/transcription`);
  return response.data.transcription;
};

export const getMeetingSpeakerTranscription = async (id: string): Promise<string> => {
  const response = await api.get(`/meeting/${id}/transcription-with-speaker`);
  return response.data.transcription_with_speaker;
};

export const getMeetingSummary = async (id: string): Promise<string> => {
  const response = await api.get(`/meeting/${id}/summary`);
  return response.data.summary;
};

export const generateSummary = async (meetingId: string, prompt?: string): Promise<string> => {
  const response = await api.post(`/summary/${meetingId}`, { prompt });
  return response.data.summary;
};

export const updateTranscription = async (meetingId: string, transcription: string): Promise<void> => {
  await api.post(`/meeting/${meetingId}/transcription/update`, { transcription });
};

export const updateSpeakerTranscription = async (meetingId: string, transcription_with_speaker: string): Promise<void> => {
  await api.post(`/meeting/${meetingId}/transcription-with-speaker/update`, { transcription_with_speaker });
};

export const startTranscription = async (meetingId: string): Promise<string> => {
  const response = await api.post(`/meeting/${meetingId}/transcription/`);
  return response.data.transcription;
};

export const reviewTranscript = async (meetingId: string): Promise<string> => {
  const response = await api.post(`/meeting/${meetingId}/transcription/review`);
  return response.data.transcription;
};

export const exportTranscriptToCSV = (transcriptJson: Array<{
  timestamp: string;
  speaker: string;
  content: string;
}>, meetingTitle: string): void => {
  // Convert transcript data to CSV format
  const csvData = transcriptJson.map(item => ({
    Timestamp: item.timestamp,
    Speaker: item.speaker,
    Content: item.content
  }));

  // Create CSV content
  const csvContent = [
    ['Timestamp', 'Speaker', 'Content'], // Header row
    ...csvData.map(item => [item.Timestamp, item.Speaker, item.Content])
  ].map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')).join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${meetingTitle.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
