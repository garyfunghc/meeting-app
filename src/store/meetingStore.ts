import { create } from 'zustand';
import * as meetingService from '../services/meetingService';
import { Meeting, Summary } from '../services/meetingService';

interface MeetingState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  loading: boolean;
  error: string | null;
  fetchMeetings: () => Promise<void>;
  fetchMeeting: (id: string) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  uploadAudio: (file: File, title: string, language: string) => Promise<void>;
  getTranscription: (id: string) => Promise<string>;
  getSummary: (id: string) => Promise<string>;
  generateSummary: (meetingId: string, prompt?: string) => Promise<string>;
  startTranscription: (meetingId: string) => Promise<string>;
  updateTranscription: (meetingId: string, transcription: string) => Promise<void>;
  reviewTranscript: (meetingId: string) => Promise<string>;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meetings: [],
  currentMeeting: null,
  loading: false,
  error: null,

  fetchMeetings: async () => {
    set({ loading: true, error: null });
    try {
      const meetings = await meetingService.getMeetings();
      set({ meetings, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch meetings', loading: false });
    }
  },

  fetchMeeting: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const meeting = await meetingService.getMeeting(id);
      set({ currentMeeting: meeting, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch meeting', loading: false });
    }
  },

  deleteMeeting: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await meetingService.deleteMeeting(id);
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to delete meeting', loading: false });
    }
  },

  uploadAudio: async (file: File, title: string, language: string) => {
    set({ loading: true, error: null });
    try {
      const meeting = await meetingService.uploadAudio(file, title, language);
      set((state) => ({
        meetings: [meeting, ...state.meetings],
        currentMeeting: meeting,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to upload audio', loading: false });
    }
  },

  getTranscription: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const transcription = await meetingService.getMeetingSpeakerTranscription(id);
      set({ loading: false });
      return transcription;
    } catch (error) {
      set({ error: 'Failed to get transcription', loading: false });
      throw error;
    }
  },

  getSummary: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const summary = await meetingService.getMeetingSummary(id);
      set({ loading: false });
      return summary;
    } catch (error) {
      set({ error: 'Failed to get summary', loading: false });
      throw error;
    }
  },

  generateSummary: async (meetingId: string, prompt?: string) => {
    set({ loading: true, error: null });
    try {
      const summary = await meetingService.generateSummary(meetingId, prompt);
      set({ loading: false });
      return summary;
    } catch (error) {
      set({ error: 'Failed to generate summary', loading: false });
      throw error;
    }
  },

  startTranscription: async (meetingId: string) => {
    set({ loading: true, error: null });
    try {
      const transcription = await meetingService.startTranscription(meetingId);
      set({ loading: false });
      return transcription;
    } catch (error) {
      set({ error: 'Failed to start transcription', loading: false });
      throw error;
    }
  },

  updateTranscription: async (meetingId: string, transcription: string) => {
    set({ loading: true, error: null });
    try {
      await meetingService.updateSpeakerTranscription(meetingId, transcription);
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to update transcription', loading: false });
      throw error;
    }
  },
  reviewTranscript: async (meetingId: string) => {
    set({ loading: true, error: null });
    try {
      const reviewedTranscript = await meetingService.reviewTranscript(meetingId);
      set({ loading: false });
      return reviewedTranscript;
    } catch (error) {
      set({ error: 'Failed to review transcript', loading: false });
      throw error;
    }
  }
}));
