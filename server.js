module.exports = (userDataPath) => {
  const express = require('express');
  const path = require('path');
  const cors = require('cors');
  const bodyParser = require('body-parser');
  const multer = require('multer');
  const fs = require('fs');
  const { v4: uuidv4 } = require('uuid');
  const sqlite3 = require('sqlite3').verbose();
  const http = require('http');
  const socketio = require('socket.io');
  const axios = require('axios');
  const FormData = require('form-data');

  const app = express();
  const server = http.createServer(app);
  const io = socketio(server);
  const PORT = process.env.PORT || 13001;
  const NODE_ENV = process.env.NODE_ENV === 'prod' ? 'prod' : 'dev' ;

  // Create necessary directories in user data folder
  const uploadsDir = path.join(userDataPath, 'uploads');
  const databaseDir = path.join(userDataPath, 'database');

[uploadsDir, databaseDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Database setup
const dbPath = path.join(databaseDir, 'meetings.db');
const db = new sqlite3.Database(dbPath);

const defaultReviewPrompt = `Please carefully review this meeting transcript and perform light editing to improve readability while maintaining the original speaker's voice and meaning. Focus on:
              - Contextual Correction - Fix obvious transcription errors (e.g., '听音乐' artifacts, repeated phrases) while keeping industry terms and natural speech patterns
              - Grammar Flow - Make minimal grammatical adjustments only when necessary for comprehension
              - Duplicate Handling - Remove duplicate lines that appear to be transcription errors (keep intentional repetitions like emphasis)
              - Format Retention - Maintain the original timestamp format: [HH:MM:SS][Speaker]Text

              Example conversion:
              Original: [00:01:07] [speaker] I think this will be our next big hit. 听音乐
              Edited: [00:01:07] [speaker] I think this will be our next big hit. [removed audio artifact]
              
              Now process this full transcript with light-touch edits: \n\n`;

const defaultSummaryPrompt = `Generate a formal business meeting minutes document in both Traditional Chinese and English. Follow this structure:
                  - Header: Include meeting title, date, time, location (physical/virtual).
                  - Attendees: List names and titles/departments (mark absentees if any).
                  - Meeting Summary:
                    - Organize by agenda items, with key discussion points and decisions.
                    - Use bullet points for clarity.
                  - Action Items: Present in a table with columns: Task, Owner, Deadline, Notes.
                  - Other Notes: Any additional items or follow-ups.
                  - Footer: Recorder's name and next meeting date (if confirmed).
                  
                  Requirements:
                  - Maintain a professional tone.
                  - Output both languages side-by-side or sequentially (clearly labeled).
                  - Highlight decisions and deadlines in bold.
                  
                  Example Input for Context:
                  - Meeting Title: Q3 Marketing Strategy Review
                  - Key Topics: Campaign performance, budget allocation, vendor selection.
                  
                  Transcription format:
                  [time1] [speaker1] content1
                  [time2] [] content2
                  sample:
                  [00:00:00] [Amy] Hello everyone! Thank you guys for coming to our weekly Student Success Meeting. Let's just get started.
                  [00:00:00] [] I think that's a great idea. Let's try that next week.
                  
                  Please create a meeting summary from the following transcription:\n\n`;

// Initialize database tables
db.serialize(() => {
  // Meetings table
  db.run(`CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    audio_file_path TEXT,
    transcription TEXT,
    transcription_with_speaker TEXT,
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Summaries table
  db.run(`CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    meeting_id TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings (id)
  )`);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 100MB limit
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.get('/api/meetings', (req, res) => {
  db.all('SELECT id, title, language, created_at FROM meetings ORDER BY created_at DESC', [], (err, meetings) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to get meetings', details: err.message });
    }
    res.json(meetings);
  });
});

// Helper functions
async function transcribeWithFasterWhisper(audioPath, whisperBasePath, language = 'auto', initialPrompt) {
  try {
    // If custom whisper path is provided, use it
    if (!whisperBasePath) {
      whisperBasePath = 'http://localhost:9000';
    }

    // Fallback to HTTP API
    const formData = new FormData();
    formData.append('audio_file', fs.createReadStream(audioPath), {
      filename: path.basename(audioPath),
      contentType: 'audio/wav'
    });

    const params = new URLSearchParams();
    params.append('task', 'transcribe');
    params.append('language', language || 'auto');
    params.append('output', 'json');
    params.append('word_timestamps', 'true');
    params.append('initial_prompt', initialPrompt || `This is a professional meeting recording with multiple speakers.  The discussion may include project updates, action items, deadlines, and strategic planning.  Speakers use common business terms like 'KPIs,' 'ROI,' 'milestones,' and 'stakeholders.'  Transcribe with proper punctuation, capitalization, and paragraph breaks for clarity.  Ignore filler words like 'um,' 'uh,' or 'you know' unless critical to context.`);


    const response = await axios.post(`${whisperBasePath}/asr?${params.toString()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1000 * 60 * 60 * 4
    });

    // Process response to include timestamps
    if (response.data && response.data.segments) {
      let formattedText = '';
      response.data.segments.forEach(segment => {
        const startTime = new Date(segment.start * 1000).toISOString().substr(11, 8);
        formattedText += `[${startTime}] ${segment.text}\n`;
      });
      return formattedText.trim();
    }

    return response.data || 'Transcription failed';
  } catch (error) {
    console.error('Faster-Whisper transcription error:', error.message);
    return JSON.stringify(error);
  }
}

async function reviewTranscription(transcription, ollamaUrl, ollamaModel = 'qwen3:8b', prompt) {
  try {
    const response = await axios.post(`${ollamaUrl}/api/chat`, {
      model: ollamaModel,
      messages: [
        {
          role: 'system',
          content: `Respond concisely with only the answer to my question. Do not add any extra text, disclaimers, or commentary`
        },
        {
          role: 'user',
          content: `${defaultReviewPrompt}: ${transcription}`
        }
      ],
      options: {
        temperature: 0.1
      },
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 1000 * 60 * 60
    });

    if (!response.data?.message?.content) {
      return 'Invalid response format from Ollama';
    }

    return response.data.message.content;
  } catch (error) {
    console.error('Summary generation error:', error);
    if (error.response) {
      console.error('Ollama API error response:', error.response.data);
    }
    return 'Failed to generate summary. Please check your Ollama settings and try again';
  }
}

async function generateSummary(transcription, ollamaUrl, ollamaModel = 'qwen3:8b', prompt) {
  try {
    const response = await axios.post(`${ollamaUrl}/api/chat`, {
      model: ollamaModel,
      messages: [
        {
          role: 'system',
          content: ``
        },
        {
          role: 'user',
          content: `${prompt} ${transcription}`
        }
      ],
      options: {
        temperature: 0.5
      },
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 1000 * 60 * 60
    });

    if (!response.data?.message?.content) {
      return ('Invalid response format from Ollama');
    }

    return response.data.message.content;
  } catch (error) {
    console.error('Summary generation error:', error);
    if (error.response) {
      console.error('Ollama API error response:', error.response.data);
    }
    return (`Failed to generate summary. Please check your Ollama settings and try again: ${JSON.stringify(error)}`);
  }
}

// LM Studio API functions
async function reviewWithLMStudio(transcription, apiKey, model, prompt, lmstudioUrl) {
  try {
    const response = await axios.post(`${lmstudioUrl}/v1/chat/completions`, {
      model: model,
      messages: [
        {
          role: 'system',
          content: `Respond concisely with only the answer to my question. Do not add any extra text, disclaimers, or commentary`
        },
        {
          role: 'user',
          content: `${prompt || defaultReviewPrompt}: ${transcription}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 1000 * 60 * 60
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      return ('Invalid response format from LM Studio');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('LM Studio review error:', error);
    if (error.response) {
      console.error('LM Studio API error response:', error.response.data);
    }
    return (`Failed to generate summary. Please check your LM Studio settings and try again: ${JSON.stringify(error)}`);
  }
}

async function generateSummaryWithLMStudio(transcription, apiKey, model, prompt, lmstudioUrl) {
  try {
    const response = await axios.post(`${lmstudioUrl}/v1/chat/completions`, {
      model: model,
      messages: [
        {
          role: 'system',
          content: ``
        },
        {
          role: 'user',
          content: `${prompt} ${transcription}`
        }
      ],
      temperature: 0.5,
      max_tokens: 4000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 1000 * 60 * 60
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      return ('Invalid response format from LM Studio');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('LM Studio summary error:', error);
    if (error.response) {
      console.error('LM Studio API error response:', error.response.data);
    }
    return (`Failed to generate summary with LM Studio. Please check your LM Studio settings and try again: ${JSON.stringify(error)}`);
  }
}

// OpenAI API functions
async function generateSummaryWithOpenAI(transcription, apiKey, model, prompt, openaiBaseUrl = 'https://api.openai.com/v1') {
  try {
    const response = await axios.post(`${openaiBaseUrl}/chat/completions`, {
      model: model,
      messages: [
        {
          role: 'system',
          content: ``
        },
        {
          role: 'user',
          content: `${prompt} ${transcription}`
        }
      ],
      temperature: 0.5,
      max_tokens: 4000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 1000 * 60 * 60
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      return ('Invalid response format from OpenAI');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI summary error:', error);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    return (`Failed to generate summary with OpenAI. Please check your OpenAI settings and try again: ${JSON.stringify(error)}`);
  }
}

async function reviewWithOpenAI(transcription, apiKey, model, prompt, openaiBaseUrl = 'https://api.openai.com/v1') {
  try {
    const response = await axios.post(`${openaiBaseUrl}/chat/completions`, {
      model: model,
      messages: [
        {
          role: 'system',
          content: `Respond concisely with only the answer to my question. Do not add any extra text, disclaimers, or commentary`
        },
        {
          role: 'user',
          content: `${prompt || defaultReviewPrompt}: ${transcription}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 1000 * 60 * 60
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      return ('Invalid response format from OpenAI');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI review error:', error);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    return (`Failed to review transcript with OpenAI. Please check your OpenAI settings and try again: ${JSON.stringify(error)}`);
  }
}

// API Routes

// Upload audio file and create meeting
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const meetingId = uuidv4();
    const title = req.body.title || `Meeting ${new Date().toISOString().split('T')[0]}`;

    // Save meeting to database
    db.run(
      'INSERT INTO meetings (id, title, audio_file_path, language, transcription_with_speaker) VALUES (?, ?, ?, ?, ?)',
      [meetingId, title, req.file.path, req.body.language || 'en', ''],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save meeting', details: err.message });
        }

        res.json({
          meetingId,
          title,
          audioPath: req.file.path,
          message: 'Audio file uploaded successfully'
        });
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error });
  }
});

// Transcribe audio directly with Ollama
app.post('/api/meeting/:meetingId/transcription/', async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Get meeting from database
    db.get('SELECT * FROM meetings WHERE id = ?', [meetingId], async (err, meeting) => {
      if (err || !meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // If transcription already exists, return it
      if (meeting.transcription) {
        return res.json({
          message: 'Using existing transcription',
          transcription: meeting.transcription
        });
      }

      // Get transcription settings
      db.all('SELECT key, value FROM settings WHERE key IN (?, ?, ?)',
        ['whisper_base_path', 'initial_prompt'], async (err, settings) => {

          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to get settings', details: err });
          }

          console.log("settings", settings)

          const settingsMap = {};
          settings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
          });
          console.log("settingsMap", settingsMap);
          // Transcribe with faster-whisper using meeting language
          const transcription = await transcribeWithFasterWhisper(
            meeting.audio_file_path,
            settingsMap.whisper_base_path || 'http://localhost:9000',
            meeting.language || 'en',
            settingsMap.initial_prompt || ''
          );

          try {
            // Update meeting with both raw and enhanced transcriptions
            db.run(
              'UPDATE meetings SET transcription = ?, transcription_with_speaker = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [transcription, transcription, meetingId],
              (err) => {
                if (err) {
                  console.error('Database update error:', err);
                  return res.status(500).json({ error: 'Failed to save transcription', details: err });
                }

                res.json({
                  message: 'Transcription completed and enhanced successfully',
                  transcription: transcription
                });
              }
            );

          } catch (error) {
            console.error('Transcription error:', error);
            res.status(500).json({ error: 'Failed to transcribe audio with Ollama', details: error });
          }
        });
    });
  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio', details: error });
  }
});

// Get meeting transcription
app.get('/api/meeting/:meetingId/transcription', (req, res) => {
  const { meetingId } = req.params;

  db.get(
    'SELECT transcription FROM meetings WHERE id = ?',
    [meetingId],
    (err, meeting) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to get transcription', details: err });
      }

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      res.json({ transcription: meeting.transcription || '' });
    }
  );
});

// Get meeting transcription with speaker
app.get('/api/meeting/:meetingId/transcription-with-speaker', (req, res) => {
  const { meetingId } = req.params;

  db.get(
    'SELECT transcription_with_speaker FROM meetings WHERE id = ?',
    [meetingId],
    (err, meeting) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to get transcription with speaker', details: err });
      }

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      res.json({ transcription_with_speaker: meeting.transcription_with_speaker || '' });
    }
  );
});

// Update meeting language
app.patch('/api/meeting/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { language } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    // Validate language is one of our supported options
    const validLanguages = ['', 'yue', 'en', 'zh'];
    if (language && !validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    db.run(
      `UPDATE meetings 
             SET language = ?, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
      [language || '', meetingId],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: 'Failed to update meeting language',
            details: err.message
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json({
          message: 'Meeting language updated successfully',
          language: language || ''
        });
      }
    );
  } catch (error) {
    console.error('Language update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update meeting transcription
app.post('/api/meeting/:meetingId/transcription/update', (req, res) => {
  const { meetingId } = req.params;
  const { transcription } = req.body;
  db.run(
    'UPDATE meetings SET transcription = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [transcription, meetingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update transcription' });
      }
      res.json({ message: 'Transcription updated successfully' });
    }
  );
});

// Update meeting transcription
app.post('/api/meeting/:meetingId/transcription-with-speaker/update', (req, res) => {
  const { meetingId } = req.params;
  const { transcription_with_speaker } = req.body;
  db.run(
    'UPDATE meetings SET transcription_with_speaker = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [transcription_with_speaker, meetingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update transcription_with_speaker' });
      }
      res.json({ message: 'transcription_with_speaker updated successfully' });
    }
  );
});

// Update meeting transcription with speaker
app.post('/api/meeting/:meetingId/transcription-with-speaker', (req, res) => {
  const { meetingId } = req.params;
  const { transcription_with_speaker } = req.body;
  db.run(
    'UPDATE meetings SET transcription_with_speaker = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [transcription_with_speaker, meetingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update transcription with speaker' });
      }

      res.json({ message: 'Transcription with speaker updated successfully' });
    }
  );
});

// Review and enhance transcript
app.post('/api/meeting/:meetingId/transcription/review', async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Get meeting transcription
    db.get('SELECT transcription, transcription_with_speaker FROM meetings WHERE id = ?', [meetingId], async (err, meeting) => {
      if (err || !meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const transcriptToReview = meeting.transcription_with_speaker || meeting.transcription;
      if (!transcriptToReview) {
        return res.status(400).json({ error: 'No transcription available for review' });
      }

      // Get AI provider settings
      db.all('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        ['ai_provider', 'ollama_path', 'ollama_model', 'lmstudio_path', 'lmstudio_api_key', 'lmstudio_model', 'openai_base_url', 'openai_api_key', 'openai_model'], 
        async (err, settings) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to get settings' });
          }

          const settingsMap = {};
          settings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
          });

          const aiProvider = settingsMap.ai_provider || 'ollama';

          try {
            let reviewedTranscript;

            if (aiProvider === 'lmstudio') {
              const lmstudioUrl = settingsMap.lmstudio_path || 'http://localhost:1234';
              const apiKey = settingsMap.lmstudio_api_key;
              const model = settingsMap.lmstudio_model || 'local-model';
              
              if (!apiKey) {
                return res.status(400).json({ error: 'LM Studio API key is required' });
              }

              reviewedTranscript = await reviewWithLMStudio(
                transcriptToReview,
                apiKey,
                model,
                `${transcriptToReview}`,
                lmstudioUrl
              );
            } else if (aiProvider === 'openai') {
              const openaiBaseUrl = settingsMap.openai_base_url || 'https://api.openai.com/v1';
              const apiKey = settingsMap.openai_api_key;
              const model = settingsMap.openai_model || 'gpt-3.5-turbo';
              
              if (!apiKey) {
                return res.status(400).json({ error: 'OpenAI API key is required' });
              }

              reviewedTranscript = await reviewWithOpenAI(
                transcriptToReview,
                apiKey,
                model,
                `${transcriptToReview}`,
                openaiBaseUrl
              );
            } else {
              // Default to Ollama
              const ollamaUrl = settingsMap.ollama_path || 'http://localhost:11434';
              const ollamaModel = settingsMap.ollama_model || 'qwen3:8b';

              reviewedTranscript = await reviewTranscription(
                transcriptToReview,
                ollamaUrl,
                ollamaModel,
                `${transcriptToReview}`
              );
            }

            // Clean up any LLM thinking tags from the response
            const cleanedTranscript = reviewedTranscript
              .replace(/<think>.*?<\/think>/gs, '')
              .replace(/<note>.*?<\/note>/gs, '')
              .trim();

            // Update meeting with reviewed transcript
            db.run(
              'UPDATE meetings SET transcription_with_speaker = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [cleanedTranscript, meetingId],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to save reviewed transcript' });
                }

                res.json({ 
                  message: 'Transcript reviewed and enhanced successfully',
                  transcription: cleanedTranscript 
                });
              }
            );
          } catch (error) {
            console.error('Review error:', error);
            res.status(500).json({ error: 'Failed to review transcript' });
          }
        }
      );
    });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Failed to review transcript' });
  }
});

// Generate summary
app.post('/api/summary/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    // Get meeting transcription with speaker
    db.get('SELECT transcription_with_speaker FROM meetings WHERE id = ?', [meetingId], async (err, meeting) => {
      if (err || !meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      if (!meeting.transcription_with_speaker) {
        return res.status(400).json({ error: 'No transcription with speaker available for summary generation' });
      }

      // Get AI provider settings and summary prompt
      db.all('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        ['ai_provider', 'ollama_path', 'ollama_model', 'lmstudio_path', 'lmstudio_api_key', 'lmstudio_model', 'openai_base_url', 'openai_api_key', 'openai_model', 'summary_prompt'], 
        async (err, settings) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to get settings' });
          }

          console.log("settings", settings)

          const settingsMap = {};
          settings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
          });

          const aiProvider = settingsMap.ai_provider || 'ollama';
          const prompt = req.body.prompt || 
            (settingsMap.summary_prompt ? 
              settingsMap.summary_prompt : 
              defaultSummaryPrompt);

          try {
            let summary;

            if (aiProvider === 'lmstudio') {
              const lmstudioUrl = settingsMap.lmstudio_path || 'http://localhost:1234';
              const apiKey = settingsMap.lmstudio_api_key;
              const model = settingsMap.lmstudio_model || 'local-model';
              
              // if (!apiKey) {
              //   return res.status(400).json({ error: 'LM Studio API key is required' });
              // }

              summary = await generateSummaryWithLMStudio(
                meeting.transcription_with_speaker,
                apiKey,
                model,
                prompt,
                lmstudioUrl
              );
            } else if (aiProvider === 'openai') {
              const openaiBaseUrl = settingsMap.openai_base_url || 'https://api.openai.com/v1';
              const apiKey = settingsMap.openai_api_key;
              const model = settingsMap.openai_model || 'gpt-3.5-turbo';
              console.log("openai!!");
              if (!apiKey) {
                return res.status(400).json({ error: 'OpenAI API key is required' });
              }

              summary = await generateSummaryWithOpenAI(
                meeting.transcription_with_speaker,
                apiKey,
                model,
                prompt,
                openaiBaseUrl
              );
            } else {
              // Default to Ollama
              const ollamaUrl = settingsMap.ollama_path || 'http://localhost:11434';
              const ollamaModel = settingsMap.ollama_model || 'qwen3:8b';

              summary = await generateSummary(
                meeting.transcription_with_speaker,
                ollamaUrl,
                ollamaModel,
                prompt
              );
            }

            // Save summary to database
            const summaryId = uuidv4();
            db.run(
              'INSERT INTO summaries (id, meeting_id, content) VALUES (?, ?, ?)',
              [summaryId, meetingId, summary],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to save summary' });
                }

                res.json({ summary });
              }
            );
          } catch (error) {
            console.error('Summary error:', error);
            res.status(500).json({ error: 'Failed to generate summary' });
          }
        }
      );
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get all meetings
app.get('/api/meetings', (req, res) => {
  db.all('SELECT id, title, audio_file_path, language, created_at, updated_at FROM meetings ORDER BY created_at DESC', (err, meetings) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get meetings' });
    }

    res.json(meetings);
  });
});

// Get single meeting by ID
app.get('/api/meetings/:meetingId', (req, res) => {
  const { meetingId } = req.params;

  db.get('SELECT * FROM meetings WHERE id = ?', [meetingId], (err, meeting) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get meeting' });
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(meeting);
  });
});

// Get meeting data without sensitive fields
app.get('/api/meeting/:meetingId/all', (req, res) => {
  const { meetingId } = req.params;

  db.get('SELECT id, title, language, created_at, updated_at FROM meetings WHERE id = ?', [meetingId], (err, meeting) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get meeting' });
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get summary if available
    db.get(`
      SELECT content as summary_content
      FROM summaries
      WHERE meeting_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [meetingId], (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const response = {
        meeting: meeting,
        summary: summary?.summary_content || ''
      };
      res.json(response);
    });
  });
});

// Get meeting details
app.get('/api/meeting/:meetingId', (req, res) => {
  const { meetingId } = req.params;

  db.get('SELECT * FROM meetings WHERE id = ?', [meetingId], (err, meeting) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get meeting' });
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Return relative path for audio file and include all fields
    const response = {
      ...meeting,
      audio_url: meeting.audio_file_path
            ? `${NODE_ENV === 'prod' ? '' : 'http://localhost:' + PORT}/uploads/${path.basename(meeting.audio_file_path)}`
            : null
    };

    res.json(response);
  });
});

// Delete meeting and all associated data
app.delete('/api/meeting/:meetingId', (req, res) => {
  const { meetingId } = req.params;
  db.get('SELECT * FROM meetings WHERE id = ?', [meetingId], (err, meeting) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Delete audio file if exists
    if (meeting.audio_file_path && fs.existsSync(meeting.audio_file_path)) {
      try {
        fs.unlinkSync(meeting.audio_file_path);
      } catch (err) {
        console.error('Failed to delete audio file:', err);
      }
    }

    // Delete database records in transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Delete summaries first due to foreign key constraint
      db.run('DELETE FROM summaries WHERE meeting_id = ?', [meetingId], function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to delete summaries' });
        }

        // Delete meeting
        db.run('DELETE FROM meetings WHERE id = ?', [meetingId], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete meeting' });
          }

          db.run('COMMIT');
          res.json({ message: 'Meeting deleted successfully' });
        });
      });
    });
  });
});

// Get meeting summary
app.get('/api/meeting/:meetingId/summary', (req, res) => {
  const { meetingId } = req.params;

  db.get(
    'SELECT content FROM summaries WHERE meeting_id = ? ORDER BY created_at DESC LIMIT 1',
    [meetingId],
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get summary' });
      }

      res.json({ summary: summary ? summary.content : null });
    }
  );
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  // Explicitly set Content-Type
  res.setHeader('Content-Type', 'application/json');

  db.all('SELECT * FROM settings', (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get settings' });
    }

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    res.json(settingsObj);
  });
});

app.post('/api/settings', (req, res) => {
  const settings = req.body;
  console.log(settings);
  const promises = Object.entries(settings).map(([key, value]) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });

  Promise.all(promises)
    .then(() => {
      res.json({ message: 'Settings saved successfully' });
    })
    .catch(err => {
      console.error('Settings error:', err);
      res.status(500).json({ error: 'Failed to save settings' });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Meeting Minutes App API is running' });
});

  // Start the server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  return { app, server };
};

// If this file is run directly, start the server
if (require.main === module) {
  const path = require('path');
  const userDataPath = path.join(__dirname, 'userData');
  module.exports(userDataPath);
}
