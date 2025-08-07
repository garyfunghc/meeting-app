import { useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { Meeting, Summary } from '../services/meetingService';

export const useMeetings = () => {
  const {
    meetings,
    currentMeeting,
    loading,
    error,
    fetchMeetings,
    fetchMeeting,
    deleteMeeting,
    uploadAudio,
    getTranscription,
    getSummary,
    generateSummary,
    startTranscription,
    updateTranscription,
    reviewTranscript
  } = useMeetingStore();

  const loadMeetings = useCallback(async () => {
    await fetchMeetings();
  }, [fetchMeetings]);

  const loadMeeting = useCallback(async (id: string) => {
    await fetchMeeting(id);
  }, [fetchMeeting]);

  const removeMeeting = useCallback(async (id: string) => {
    await deleteMeeting(id);
  }, [deleteMeeting]);

  const createMeeting = useCallback(async (file: File, title: string, language: string) => {
    const meeting = await uploadAudio(file, title, language);
    await loadMeetings();
    return meeting;
  }, [uploadAudio, loadMeetings]);

  const loadTranscription = useCallback(async (id: string): Promise<string> => {
    return await getTranscription(id);
  }, [getTranscription]);

  const transcribeMeeting = useCallback(async (id: string): Promise<string> => {
    return await startTranscription(id);
  }, [startTranscription]);

  const loadSummary = useCallback(async (id: string): Promise<string> => {
    return await getSummary(id);
  }, [getSummary]);

  const createSummary = useCallback(async (meetingId: string, prompt?: string): Promise<string> => {
    return await generateSummary(meetingId, prompt);
  }, [generateSummary]);

  return {
    meetings,
    currentMeeting,
    loading,
    error,
    loadMeetings,
    loadMeeting,
    removeMeeting,
    createMeeting,
    loadTranscription,
    transcribeMeeting,
    loadSummary,
    createSummary,
    updateTranscription,
    reviewTranscript
  };
};
