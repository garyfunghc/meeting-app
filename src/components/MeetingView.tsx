import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { debounce } from 'lodash';
import { useMeetings } from '../hooks/useMeetings';
import ReviewConfirmationModal from './ReviewConfirmationModal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import '../jspdf-custom'; // For Chinese font support
import { exportTranscriptToCSV } from '../services/meetingService';

// Memoized row component to prevent unnecessary re-renders
interface TranscriptionRowProps {
  item: {
    timestamp: string;
    speaker: string;
    content: string;
  };
  index: number;
  currentSegment: number | null;
  speakers: string[];
  onSpeakerChange: (index: number, value: string) => void;
  onContentChange: (index: number, value: string) => void;
  onTimestampClick: (index: number, timestamp: string) => void;
}

const TranscriptionRow = memo(({
  item,
  index,
  currentSegment,
  speakers,
  onSpeakerChange,
  onContentChange,
  onTimestampClick
}: TranscriptionRowProps) => {
  return (
    <tr className="transcription-row">
      <td
        className={`time-cell ${currentSegment === index ? 'playing' : ''}`}
        onClick={() => onTimestampClick(index, item.timestamp)}
        style={{ cursor: 'pointer' }}
      >
        {item.timestamp}
      </td>
      <td className="speaker-cell">
        <input
          type="text"
          value={item.speaker}
          onChange={(e) => onSpeakerChange(index, e.target.value)}
          list="speaker-suggestions"
          style={{ width: '100%' }}
        />
        <datalist id="speaker-suggestions">
          {speakers.map((s, idx) => (
            <option key={idx} value={s} />
          ))}
        </datalist>
      </td>
      <td className="content-cell">
        <AutoResizeTextarea
          value={item.content}
          onChange={(e) => onContentChange(index, e.target.value)}
        />
      </td>
    </tr>
  );
});

TranscriptionRow.displayName = 'TranscriptionRow';
interface MeetingViewProps {
  meetingId: string;
  onDeleteMeeting: (id: string) => void;
}

// Component for auto-resizing textarea
interface AutoResizeTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ value, onChange, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to scrollHeight + a little extra for padding
      textarea.style.height = `${textarea.scrollHeight + 4}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    adjustHeight();
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={{ width: '100%', minHeight: '50px', resize: 'vertical' }}
    />
  );
};

const MeetingView: React.FC<MeetingViewProps> = ({ meetingId, onDeleteMeeting }) => {
  const {
    currentMeeting,
    loading,
    error,
    loadMeeting,
    removeMeeting,
    loadTranscription,
    transcribeMeeting,
    loadSummary,
    createSummary,
    updateTranscription,
    reviewTranscript
  } = useMeetings();

  const [transcription, setTranscription] = useState('');
  const [transcriptJson, setTranscriptJson] = useState<Array<{
    timestamp: string;
    speaker: string;
    content: string;
  }>>([]);
  const [summary, setSummary] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);

  useEffect(() => {
    if (transcription) {
      setTranscriptLines(transcription.split('\n'));

      const jsonArray = transcription.split('\n')
        .filter(line => line.trim()) // Remove empty lines
        .map(line => {
          // Extract timestamp - matches [HH:MM:SS] at start of line with optional spaces
          const timestampMatch = line.match(/^\s*\[(\d{2}:\d{2}:\d{2})\]\s*/);
          const timestamp = timestampMatch ? timestampMatch[1] : '00:00:00';

          // Remove timestamp part to process the rest
          let remaining = timestampMatch
            ? line.slice(timestampMatch[0].length)
            : line;

          // Handle speaker - take first [speaker] or empty [] and ignore any subsequent ones
          let speaker = '';
          const speakerMatch = remaining.match(/^\s*\[([^\]]*)\]\s*/);
          if (speakerMatch) {
            speaker = speakerMatch[1].trim();
            remaining = remaining.slice(speakerMatch[0].length);

            // Remove any additional brackets that might exist
            while (remaining.match(/^\s*\[[^\]]*\]\s*/)) {
              remaining = remaining.replace(/^\s*\[[^\]]*\]\s*/, '');
            }
          }

          // Extract content - whatever remains after processing
          const content = remaining.trim();

          return {
            timestamp,
            speaker,
            content
          };
        });

      setTranscriptJson(jsonArray);

      // Extract unique speakers from transcriptJson
      const speakerSet = new Set<string>();
      jsonArray.forEach(item => {
        if (item.speaker) {
          speakerSet.add(`${item.speaker}`);
        }
      });
      setSpeakers(Array.from(speakerSet));
    }
  }, [transcription]);

  const updateTranscriptLine = (index: number, speaker: string, content: string) => {
    // Get current timestamp before updating to avoid async issues
    const currentTimestamp = transcriptJson[index]?.timestamp || '00:00:00';
    
    // Update JSON array using functional update to avoid copying entire array
    setTranscriptJson(prevJson => {
      const updatedJson = [...prevJson];
      updatedJson[index] = {
        timestamp: currentTimestamp,
        speaker: speaker || '',
        content
      };
      return updatedJson;
    });

    // Update lines array and return the updated full transcript
    setTranscriptLines(prevLines => {
      const updatedLines = [...prevLines];
      const timestamp = `[${currentTimestamp}]`;
      const speakerPart = `[${speaker}]`;
      updatedLines[index] = `${timestamp} ${speakerPart} ${content}`.trim();
      
      const updatedFullTranscript = updatedLines.join('\n');
      
      // Update the transcription state with the new full transcript
      setTranscription(updatedFullTranscript);
      
      return updatedLines;
    });

    // Since state updates are async, we need to construct the updated transcript manually for immediate return
    const updatedLines = [...transcriptLines];
    const timestamp = `[${currentTimestamp}]`;
    const speakerPart = `[${speaker}]`;
    updatedLines[index] = `${timestamp} ${speakerPart} ${content}`.trim();
    const updatedFullTranscript = updatedLines.join('\n');
    
    console.log("updatedFullTranscript+++", updatedFullTranscript);
    
    return updatedFullTranscript;
  };

  const debouncedSpeakerApiUpdate = useRef(
    debounce(async (meetingId: string, fullTranscript: string) => {
      try {
        await updateTranscription(meetingId, fullTranscript);
      } catch (error) {
        console.error('Failed to update transcription:', error);
      }
    }, 1000)
  ).current;

  const debouncedContentApiUpdate = useRef(
    debounce(async (meetingId: string, fullTranscript: string) => {
      try {
        console.log('Attempting to update transcription for meeting:', meetingId);
        console.log('Transcript content:', fullTranscript);
        const result = await updateTranscription(meetingId, fullTranscript);
        console.log('Update successful:', result);
      } catch (error) {
        console.error('Failed to update transcription:', error);
      }
    }, 3000)
  ).current;

  const handleSpeakerChange = (index: number, value: string) => {
    applySpeakerChange(index, value);
  };

  const handleContentChange = (index: number, value: string) => {
    applyContentChange(index, value);
  };

  const applySpeakerChange = (index: number, value: string) => {
    // Use the current content from the already-parsed transcriptJson
    const currentContent = transcriptJson[index]?.content || '';
    
    const fullTranscript = updateTranscriptLine(index, value, currentContent);
    setTranscription(fullTranscript);

    // Add new speaker to suggestions if not already present using functional update
    if (value) {
      setSpeakers(prevSpeakers => {
        if (!prevSpeakers.includes(value)) {
          return [...prevSpeakers, value];
        }
        return prevSpeakers;
      });
    }

    debouncedSpeakerApiUpdate.cancel();
    debouncedSpeakerApiUpdate(meetingId, fullTranscript);
  };

  const applyContentChange = (index: number, value: string) => {
    // Use the current speaker from the already-parsed transcriptJson
    const speaker = transcriptJson[index]?.speaker || 'Speaker';
    const fullTranscript = updateTranscriptLine(index, speaker, value);
    setTranscription(fullTranscript);
    debouncedContentApiUpdate.cancel();
    debouncedContentApiUpdate(meetingId, fullTranscript);
  };

  const handleTimestampClick = (index: number, timestamp: string) => {
    if (!audioRef.current) return;

    // Parse timestamp (HH:MM:SS) into seconds
    const [hours, minutes, seconds] = timestamp.split(':').map(Number);
    const startTime = hours * 3600 + minutes * 60 + seconds;

    // Find next timestamp or use end of audio
    const lines = transcription.split('\n');
    let endTime = audioRef.current.duration;

    for (let i = index + 1; i < lines.length; i++) {
      const nextTimestampMatch = lines[i].match(/^\[(\d{2}:\d{2}:\d{2})\]/);
      if (nextTimestampMatch) {
        const [nextHours, nextMinutes, nextSeconds] = nextTimestampMatch[1].split(':').map(Number);
        endTime = nextHours * 3600 + nextMinutes * 60 + nextSeconds;
        break;
      }
    }

    // Play the segment
    audioRef.current.currentTime = startTime;
    audioRef.current.play();
    setCurrentSegment(index);

    // Stop at end time
    const checkTime = () => {
      if (audioRef.current && audioRef.current.currentTime >= endTime) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', checkTime);
        setCurrentSegment(null);
      }
    };

    audioRef.current.addEventListener('timeupdate', checkTime);
  };


  useEffect(() => {
    const fetchData = async () => {
      await loadMeeting(meetingId);
      const transcription = await loadTranscription(meetingId);
      const summary = await loadSummary(meetingId);
      setTranscription(transcription);
      setSummary(summary);
    };
    fetchData();
  }, [meetingId, loadMeeting, loadTranscription, loadSummary]);

  const generatePDF = () => {
    setIsExporting(true);

    // Initialize jsPDF with Chinese support
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });

    // Set Chinese font
    doc.setFont('NotoSansSC', 'normal');
    doc.setFontSize(12);

    const lineHeight = 7;
    const margin = 15;
    let y = margin;

    // Add title
    doc.setFontSize(20);
    doc.text(currentMeeting?.title || 'Meeting Minutes', 105, y, { align: 'center' });
    y += 20;

    // Add summary section
    doc.setFontSize(16);
    doc.text('Summary', margin, y);
    y += 10;
    doc.setFontSize(12);

    const cleanSummary = (summary || '')
      .replace(/<think[\s\S]*?<\/think>/g, '')
      .replace(/<note[\s\S]*?<\/note>/g, '')
      .replace(/\n{3,}/g, '\n\n') // Normalize excessive newlines
      .trim();

    const summaryLines = doc.splitTextToSize(cleanSummary, 180);
    summaryLines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
    y += 15;

    // Add transcript section
    doc.setFontSize(16);
    doc.text('Transcript', margin, y);
    y += 10;

    doc.setFontSize(10);
    transcriptJson.forEach(item => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }

      // Timestamp
      doc.text(item.timestamp, margin, y);

      // Speaker
      doc.text(item.speaker, margin + 30, y);

      // Content (split into multiple lines if needed)
      const contentLines = doc.splitTextToSize(item.content, 120);
      contentLines.forEach((line: string, i: number) => {
        if (i > 0) y += lineHeight;
        doc.text(line, margin + 80, y);
      });

      y += lineHeight * Math.max(1, contentLines.length) + 2;
    });

    // Save the PDF
    const fileName = `${currentMeeting?.title || 'meeting'}.pdf`;
    doc.save(fileName);
    setIsExporting(false);
  };

  if (loading && !currentMeeting) {
    return <div className="loading">Loading meeting details...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!currentMeeting) {
    return <div className="not-found">Meeting not found</div>;
  }

  return (
    <div className="meeting-view">
      {(isTranscribing || isSummarizing || isReviewing) && (
        <div className="loading-overlay">
          <div className="loading-content">Loading...</div>
        </div>
      )}
      <div className="meeting-header">
        <h2>{currentMeeting.title}</h2>
        <div className="meeting-actions">
          <button
            className="btn btn-primary"
            onClick={async () => {
              setIsTranscribing(true);
              try {
                const transcription = await transcribeMeeting(meetingId);
                setTranscription(transcription);
                await loadTranscription(meetingId);
              } finally {
                setIsTranscribing(false);
              }
            }}
            disabled={isTranscribing}
          >
            <i className="fas fa-comment-dots"></i> Generate
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              setIsSummarizing(true);
              try {
                const summary = await createSummary(meetingId);
                setSummary(summary);
                await loadSummary(meetingId); // Refresh the summary
              } finally {
                setIsSummarizing(false);
              }
            }}
          >
            <i className="fas fa-magic"></i> AI Summary
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => exportTranscriptToCSV(transcriptJson, currentMeeting?.title || 'meeting')}
            disabled={transcriptJson.length === 0}
          >
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="audio-player" style={{ marginBottom: '20px' }}>
        <audio ref={audioRef} controls src={currentMeeting.audio_url}></audio>
      </div>

      <div className="transcription-section" style={{ marginBottom: '20px', marginTop: '20px' }}>
        <h3>Transcription</h3>
        {transcription ? (
          <table className="transcription-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Time</th>
                <th style={{ width: '150px' }}>Speaker</th>
                <th>Content</th>
              </tr>
            </thead>
            <tbody>
              {transcriptJson.map((item, i) => (
                <TranscriptionRow
                  key={i}
                  item={item}
                  index={i}
                  currentSegment={currentSegment}
                  speakers={speakers}
                  onSpeakerChange={handleSpeakerChange}
                  onContentChange={handleContentChange}
                  onTimestampClick={handleTimestampClick}
                />
              ))}
            </tbody>
          </table>
        ) : 'No transcription available'}
      </div>

      <div className="summary-section">
        <h3>Summary</h3>
        <div className="summary-content">
          <ReactMarkdown>{
          summary ? summary.replace(/<think[\s\S]*?<\/think>/g, "") : 'No summary available'
          }</ReactMarkdown>
        </div>
      </div>

      <ReviewConfirmationModal
        show={showReviewConfirm}
        onConfirm={async () => {
          setShowReviewConfirm(false);
          setIsReviewing(true);
          try {
            const reviewedTranscript = await reviewTranscript(meetingId);
            setTranscription(reviewedTranscript);
            await loadTranscription(meetingId);
          } finally {
            setIsReviewing(false);
          }
        }}
        onCancel={() => setShowReviewConfirm(false)}
      />

      {/* Transcript overwrite confirmation removed */}
    </div>
  );
};

export default MeetingView;
