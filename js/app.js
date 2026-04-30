/* ═══════════════════════════════════════════════════
   SignAI — Main React Application
   All UI components, camera, TTS, and state logic
   ═══════════════════════════════════════════════════ */

/* ─── REACT IMPORTS ─────────────────────────────── */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ─── TEXT-TO-SPEECH WRAPPER ────────────────────── */
class TTS {
  static speak(text, rate = 1.0, onEnd) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = rate;
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  }
  static stop() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  static get available() {
    return 'speechSynthesis' in window;
  }
}

/* ─── TOAST HOOK ─────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState({ msg: '', icon: '', visible: false });
  const timer = useRef(null);

  const showToast = useCallback((msg, icon = '✓') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, icon, visible: true });
    timer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400);
  }, []);

  return { toast, showToast };
}

/* ─── TIMESTAMP ──────────────────────────────────── */
function timeStamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ════════════════════════════════════════════════════
   SPLASH SCREEN COMPONENT
   ════════════════════════════════════════════════════ */
function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHiding(true);
      setTimeout(onDone, 850);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`splash ${hiding ? 'hiding' : ''}`} role="status" aria-label="Loading SignAI">
      <div className="splash-logo">
        <div className="splash-logo-ring">
          <span className="splash-logo-inner">🤟</span>
        </div>
      </div>
      <h1 className="splash-title">SIGNAI</h1>
      <p className="splash-tagline">AI Sign Language Translator</p>
      <div className="splash-loader">
        <div className="splash-loader-bar">
          <div className="splash-loader-fill"></div>
        </div>
        <p className="splash-loader-text">Initializing hand recognition engine…</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   NAVIGATION COMPONENT
   ════════════════════════════════════════════════════ */
function Nav({ currentTab, onTab, cameraActive }) {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="nav-brand">
        <div className="nav-brand-icon">🤟</div>
        <span className="nav-brand-name">SIGNAI</span>
      </div>

      <div className="nav-links" role="tablist">
        {[
          { id: 'translate', label: 'Translate' },
          { id: 'practice',  label: 'Practice'  },
          { id: 'guide',     label: 'Sign Guide' },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`nav-link ${currentTab === id ? 'active' : ''}`}
            onClick={() => onTab(id)}
            role="tab"
            aria-selected={currentTab === id}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="nav-status" aria-live="polite">
        <span className={`nav-status-dot ${cameraActive ? 'active' : ''}`}></span>
        <span>{cameraActive ? 'Camera Active' : 'Camera Off'}</span>
      </div>
    </nav>
  );
}

/* ════════════════════════════════════════════════════
   CAMERA PANEL COMPONENT
   ════════════════════════════════════════════════════ */
function CameraPanel({ onResult, cameraActive, setCameraActive }) {
  const videoRef      = useRef(null);
  const overlayRef    = useRef(null);
  const trackerRef    = useRef(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [facingMode, setFacing] = useState('user');
  const [signLang, setSignLang] = useState('ASL');

  // Initialize tracker
  useEffect(() => {
    const tracker = new HandTracker((result, landmarks) => {
      onResult(result, landmarks);
    });
    trackerRef.current = tracker;
    return () => { tracker.stop(); };
  }, [onResult]);

  const startCamera = useCallback(async (facing = facingMode) => {
    setError('');
    setLoading(true);
    try {
      if (!trackerRef.current) return;

      const ok = await trackerRef.current.init(videoRef.current, overlayRef.current);
      if (!ok) throw new Error('Hand tracking model failed to load. Please refresh.');

      await trackerRef.current.startCamera(videoRef.current, facing);
      setCameraActive(true);
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings and refresh.');
      } else if (e.name === 'NotFoundError') {
        setError('No camera detected. Please connect a camera and try again.');
      } else {
        setError(e.message || 'Failed to start camera. Please try again.');
      }
      setCameraActive(false);
    } finally {
      setLoading(false);
    }
  }, [facingMode, setCameraActive]);

  const stopCamera = useCallback(() => {
    if (trackerRef.current) trackerRef.current.stop();
    setCameraActive(false);
    onResult({ sign: null, confidence: 0, word: '', uncertain: true }, null);
  }, [setCameraActive, onResult]);

  const switchCamera = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacing(next);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(next), 400);
    }
  }, [facingMode, cameraActive, stopCamera, startCamera]);

  return (
    <div className="camera-section">
      {/* Viewport */}
      <div className={`camera-viewport glass-card ${cameraActive ? 'active' : ''}`}
           role="region" aria-label="Camera feed">

        {/* Placeholder when off */}
        {!cameraActive && !loading && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">📷</div>
            <div className="camera-placeholder-text">
              {error ? error : 'Click "Start Camera" to begin'}
            </div>
            {error && (
              <div style={{ fontSize:12, color:'var(--accent-red)', marginTop:8, maxWidth:280, textAlign:'center', padding:'0 16px' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="camera-placeholder">
            <div className="spinner" style={{ width:40, height:40 }}></div>
            <div className="camera-placeholder-text" style={{ marginTop:16 }}>
              Loading hand tracking model…
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>
              First load may take a few seconds
            </div>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          className="camera-feed"
          autoPlay
          playsInline
          muted
          style={{ display: cameraActive ? 'block' : 'none' }}
          aria-label="Live camera feed"
        />

        {/* Overlay canvas for landmarks */}
        <canvas
          ref={overlayRef}
          className="camera-overlay-canvas"
          style={{ display: cameraActive ? 'block' : 'none' }}
          aria-hidden="true"
        />

        {/* Corner decorations */}
        <div className="camera-corners" aria-hidden="true">
          <div className="corner corner-tl"></div>
          <div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div>
          <div className="corner corner-br"></div>
        </div>

        {/* Recording indicator */}
        <div className={`rec-indicator ${cameraActive ? 'visible' : ''}`} aria-live="polite">
          <span className="rec-dot"></span>
          LIVE · ASL
        </div>

        {/* Gesture hint */}
        <div className={`gesture-hint ${cameraActive ? 'visible' : ''}`}>
          Show your hand to the camera
        </div>
      </div>

      {/* Camera Controls */}
      <div className="camera-controls">
        <div className="select-wrapper" style={{ flex:'none', width:120 }}>
          <select
            className="select"
            value={signLang}
            onChange={e => setSignLang(e.target.value)}
            aria-label="Sign language selection"
          >
            <option value="ASL">ASL</option>
            <option value="BSL" disabled title="Coming soon">BSL (Soon)</option>
            <option value="ISL" disabled title="Coming soon">ISL (Soon)</option>
          </select>
        </div>

        {!cameraActive ? (
          <button
            className="btn btn-primary"
            onClick={() => startCamera()}
            disabled={loading}
            aria-label="Start camera"
          >
            {loading ? <><span className="spinner"></span> Loading…</> : <>📷 Start Camera</>}
          </button>
        ) : (
          <button
            className="btn btn-danger"
            onClick={stopCamera}
            aria-label="Stop camera"
          >
            ⏹ Stop Camera
          </button>
        )}

        <button
          className="btn btn-ghost btn-icon"
          onClick={switchCamera}
          title="Switch camera (front/back)"
          aria-label="Switch camera"
        >
          🔄
        </button>
      </div>

      {/* Privacy notice */}
      <div className="privacy-notice" role="note">
        <span className="privacy-icon">🔒</span>
        <p className="privacy-text">
          <strong>Your privacy is protected.</strong> Camera is processed entirely on your device.
          No video is recorded, stored, or transmitted. Camera access is used only for real-time sign detection.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TRANSLATION PANEL COMPONENT
   ════════════════════════════════════════════════════ */
function TranslationPanel({ result, history, onClearHistory, showToast }) {
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking,  setSpeaking]  = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [sentence, setSentence] = useState('');
  const prevSign = useRef(null);

  const { sign, confidence = 0, word = '', uncertain } = result || {};

  // Build sentence from detected signs
  useEffect(() => {
    if (sign && sign !== prevSign.current && !uncertain) {
      prevSign.current = sign;
      setSentence(prev => {
        const words = word || sign;
        if (prev.endsWith(words)) return prev;
        return (prev ? prev + ' ' : '') + words;
      });

      if (autoSpeak && TTS.available) {
        TTS.speak(word || sign, speechRate);
      }
    }
  }, [sign, word, uncertain, autoSpeak, speechRate]);

  const confidencePct = Math.round(confidence * 100);
  const confLevel = confidencePct >= 75 ? 'high' : confidencePct >= 50 ? 'medium' : 'low';

  const speakCurrent = () => {
    if (!TTS.available) { showToast('Text-to-speech not available', '⚠️'); return; }
    const text = sentence || word || '';
    if (!text) return;
    setSpeaking(true);
    TTS.speak(text, speechRate, () => setSpeaking(false));
  };

  const copyText = () => {
    const text = sentence || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => showToast('Copied to clipboard', '📋'),
      () => showToast('Copy failed', '✗')
    );
  };

  const clearSentence = () => {
    setSentence('');
    prevSign.current = null;
    TTS.stop();
  };

  return (
    <div className="translation-stack">

      {/* Current Detection */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span className="card-title-icon">👁</span>
            Live Detection
          </div>
          {sign && (
            <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)',
                           textTransform:'uppercase', letterSpacing:'0.15em' }}>
              {result.category}
            </span>
          )}
        </div>

        <div className="detection-display">
          {uncertain && !sign ? (
            <div className="detection-sign uncertain">
              {confidence > 0.3 ? 'Hold gesture still…' : 'Waiting for hand…'}
            </div>
          ) : (
            <>
              <div className="detection-category">{result?.category ?? ''}</div>
              <div
                className="detection-sign"
                key={sign}
                style={{ animation: sign ? 'popIn 0.3s var(--ease-spring) both' : 'none' }}
                aria-live="assertive"
              >
                {sign || '—'}
              </div>
              {word && word !== sign && (
                <div className="detection-word">{word}</div>
              )}
            </>
          )}
        </div>

        {/* Confidence Bar */}
        <div className="confidence-wrapper">
          <div className="confidence-label">
            <span>Confidence</span>
            <span className="confidence-value" style={{
              color: confLevel === 'high' ? 'var(--accent-cyan)' :
                     confLevel === 'medium' ? 'var(--accent-amber)' : 'var(--accent-red)'
            }}>
              {confidencePct}%
            </span>
          </div>
          <div className="confidence-bar" role="progressbar"
               aria-valuenow={confidencePct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`confidence-fill ${confLevel}`}
              style={{ width: `${confidencePct}%` }}
            ></div>
          </div>
          {uncertain && confidence > 0.3 && (
            <div style={{ fontSize:11, color:'var(--accent-amber)', marginTop:6,
                          fontFamily:'var(--font-mono)' }}>
              ⚠ Not sure — please repeat the sign
            </div>
          )}
        </div>
      </div>

      {/* Translation Output */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span className="card-title-icon">💬</span>
            Translation
          </div>
          <button className="btn btn-ghost btn-icon" onClick={clearSentence} title="Clear sentence" aria-label="Clear translation">
            🗑
          </button>
        </div>

        <div className="translation-output">
          <div className="translation-label">Detected text</div>
          <div
            className={`translation-text ${!sentence ? 'empty' : ''}`}
            aria-live="polite"
          >
            {sentence || 'Start signing to see translation here…'}
          </div>

          <div className="translation-actions">
            <button
              className="btn btn-ghost"
              onClick={speakCurrent}
              disabled={!TTS.available || !sentence || speaking}
              aria-label="Speak translation"
            >
              {speaking ? '🔊 Speaking…' : '🔊 Speak'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={copyText}
              disabled={!sentence}
              aria-label="Copy translation"
            >
              📋 Copy
            </button>
          </div>
        </div>

        {/* TTS Controls */}
        {TTS.available && (
          <div className="tts-panel" style={{ borderTop:'1px solid var(--border-card)' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>Speed</span>
            <input
              type="range"
              className="speed-slider"
              min="0.5" max="2" step="0.1"
              value={speechRate}
              onChange={e => setSpeechRate(parseFloat(e.target.value))}
              aria-label="Speech rate"
              style={{ flex:1 }}
            />
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-secondary)',
                           minWidth:28 }}>
              {speechRate.toFixed(1)}×
            </span>

            <div className="toggle-wrap">
              <span className="toggle-label">Auto-speak</span>
              <label className="toggle" aria-label="Auto-speak toggle">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={e => setAutoSpeak(e.target.checked)}
                />
                <div className="toggle-track"></div>
                <div className="toggle-thumb"></div>
              </label>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════
   HISTORY PANEL COMPONENT
   ════════════════════════════════════════════════════ */
function HistoryPanel({ history, onClear, showToast }) {
  const copyAll = () => {
    const text = history.map(h => h.word).join(' ');
    navigator.clipboard.writeText(text).then(
      () => showToast('History copied', '📋'),
      () => showToast('Failed to copy', '✗')
    );
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">📜</span>
          History
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {history.length > 0 && (
            <>
              <button className="btn btn-ghost btn-icon" onClick={copyAll} title="Copy all" aria-label="Copy history">📋</button>
              <button className="btn btn-ghost btn-icon" onClick={onClear} title="Clear history" aria-label="Clear history">🗑</button>
            </>
          )}
        </div>
      </div>

      <div className="history-list" role="log" aria-label="Detection history">
        {history.length === 0 ? (
          <div className="history-empty">No signs detected yet</div>
        ) : (
          [...history].reverse().map((item, i) => (
            <div
              key={item.id}
              className="history-item"
              style={{ animation: i === 0 ? 'slideIn 0.3s var(--ease-out-expo) both' : 'none' }}
            >
              <div className="history-sign">{item.sign}</div>
              <div className="history-details">
                <div className="history-word">{item.word}</div>
                <div className="history-time">{item.time}</div>
              </div>
              <div className="history-conf">{Math.round(item.confidence * 100)}%</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PRACTICE MODE COMPONENT
   ════════════════════════════════════════════════════ */
function PracticeMode({ result }) {
  const [category, setCategory] = useState('letters');
  const [targets, setTargets]   = useState([]);
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState('waiting');
  const [feedbackText, setFeedbackText] = useState('Show the sign above to the camera');
  const feedbackTimer = useRef(null);

  // Set target list based on category
  useEffect(() => {
    const list = PRACTICE_SETS[category] || [];
    setTargets(list);
    setIdx(0);
    setScore(0);
    setAttempts(0);
    setFeedback('waiting');
    setFeedbackText('Show the sign above to the camera');
  }, [category]);

  const target = targets[idx];
  const targetData = target ? SIGN_DATABASE[target] : null;

  // Check if current result matches target
  useEffect(() => {
    if (!result?.sign || !target || feedbackTimer.current) return;

    const detected = result.sign;
    const conf = result.confidence;

    if (detected === target) {
      // Correct!
      setFeedback('correct');
      setFeedbackText('✅ Perfect! Great job!');
      setScore(s => s + Math.round(conf * 100));
      setAttempts(a => a + 1);
      feedbackTimer.current = setTimeout(() => {
        feedbackTimer.current = null;
        nextSign();
        setFeedback('waiting');
        setFeedbackText('Show the sign above to the camera');
      }, 1500);
    } else if (conf > 0.55) {
      // Close-ish
      setFeedback('almost');
      setFeedbackText(`Almost! Try again — detected: ${detected}`);
      setAttempts(a => a + 1);
      feedbackTimer.current = setTimeout(() => { feedbackTimer.current = null; }, 2000);
    }
  }, [result?.sign, target]);

  const nextSign = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    setFeedback('waiting');
    setFeedbackText('Show the sign above to the camera');
    setIdx(i => (i + 1) % (targets.length || 1));
  }, [targets.length]);

  const prevSign = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    setFeedback('waiting');
    setFeedbackText('Show the sign above to the camera');
    setIdx(i => (i - 1 + targets.length) % (targets.length || 1));
  }, [targets.length]);

  const accuracyPct = attempts > 0 ? Math.min(100, Math.round(score / attempts)) : 0;

  if (!targetData) return null;

  return (
    <div className="glass-card" role="region" aria-label="Practice mode">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">🎯</span>
          Practice Mode
        </div>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {idx + 1} / {targets.length}
        </span>
      </div>

      {/* Category picker */}
      <div className="practice-cats" role="tablist" aria-label="Practice categories">
        {[['letters','Letters'],['numbers','Numbers'],['words','Words']].map(([id, label]) => (
          <button
            key={id}
            className={`practice-cat ${category === id ? 'active' : ''}`}
            onClick={() => setCategory(id)}
            role="tab"
            aria-selected={category === id}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Target sign */}
      <div className="practice-target">
        <div className="practice-sign-display" aria-label={`Target sign: ${target}`}>{target}</div>
        <div className="practice-sign-name">{targetData.word}</div>
        <div className="practice-sign-desc">{targetData.description}</div>
      </div>

      {/* Feedback */}
      <div className={`practice-feedback ${feedback}`} aria-live="assertive">
        {feedbackText}
      </div>

      {/* Accuracy score */}
      {attempts > 0 && (
        <div className="practice-score">
          <div style={{ display:'flex', justifyContent:'space-between',
                        fontSize:11, color:'var(--text-muted)', fontWeight:600,
                        textTransform:'uppercase', letterSpacing:'0.12em' }}>
            <span>Session Accuracy</span>
            <span style={{ color:'var(--accent-green)' }}>{accuracyPct}%</span>
          </div>
          <div className="score-bar" role="progressbar" aria-valuenow={accuracyPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="score-fill" style={{ width:`${accuracyPct}%` }}></div>
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6, fontFamily:'var(--font-mono)' }}>
            {attempts} attempts · {Math.round(score / (attempts || 1))} avg pts
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="practice-nav">
        <button className="btn btn-ghost" onClick={prevSign} aria-label="Previous sign">← Prev</button>
        <button className="btn btn-ghost" onClick={nextSign} aria-label="Next sign">Next →</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   UPLOAD MODE COMPONENT
   ════════════════════════════════════════════════════ */
function UploadMode({ showToast }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [fileType, setFileType] = useState('');
  const [result, setResult]     = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imgRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const type = f.type.startsWith('video') ? 'video' : 'image';
    setFile(f);
    setFileType(type);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const analyzeImage = useCallback(async () => {
    if (!imgRef.current || !file) return;
    setAnalyzing(true);
    try {
      // Wait for MediaPipe to initialize
      if (typeof Hands === 'undefined') {
        showToast('Hand tracking model loading, please wait…', '⏳');
        setAnalyzing(false);
        return;
      }

      const tempTracker = new HandTracker(() => {});
      const canvas = document.createElement('canvas');
      const result = await tempTracker.classifyImage(imgRef.current);
      setResult(result);
    } catch (e) {
      setResult({ sign: null, uncertain: true, word: 'Analysis failed: ' + e.message });
    } finally {
      setAnalyzing(false);
    }
  }, [file, showToast]);

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setFileType('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div className="glass-card" role="region" aria-label="Upload mode">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">📤</span>
          Upload &amp; Analyze
        </div>
      </div>

      {!preview ? (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload photo or video"
        >
          <input
            type="file"
            className="upload-input"
            accept="image/*,video/mp4,video/webm"
            onChange={e => handleFile(e.target.files[0])}
            aria-label="Choose file"
          />
          <div className="upload-icon">📁</div>
          <div className="upload-text">Drop a photo or video here</div>
          <div className="upload-sub">Supports JPG, PNG, MP4, WebM · Max 50MB</div>
        </div>
      ) : (
        <div className="upload-preview">
          {fileType === 'image' ? (
            <img
              ref={imgRef}
              src={preview}
              alt="Uploaded sign language image"
              crossOrigin="anonymous"
            />
          ) : (
            <video src={preview} controls style={{ width:'100%', maxHeight:280 }} />
          )}
          <button className="upload-remove" onClick={removeFile} aria-label="Remove file">✕</button>
        </div>
      )}

      {preview && (
        <div style={{ padding: '0 20px 20px' }}>
          {fileType === 'image' && (
            <button
              className="btn btn-primary"
              onClick={analyzeImage}
              disabled={analyzing}
              style={{ width:'100%' }}
            >
              {analyzing ? <><span className="spinner"></span> Analyzing…</> : '🔍 Analyze Sign'}
            </button>
          )}
          {fileType === 'video' && (
            <div style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>
              Video analysis: pause at the sign frame, then use camera mode for best results.
            </div>
          )}

          {result && (
            <div style={{
              marginTop:16, padding:16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              animation: 'fadeUp 0.4s var(--ease-out-expo) both'
            }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase',
                            letterSpacing:'0.15em', fontWeight:600, marginBottom:10 }}>
                Analysis Result
              </div>
              {result.sign ? (
                <>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:56,
                                background:'linear-gradient(135deg,#fff,var(--accent-cyan))',
                                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                                backgroundClip:'text', lineHeight:1, marginBottom:6 }}>
                    {result.sign}
                  </div>
                  <div style={{ color:'var(--accent-cyan)', fontWeight:600 }}>{result.word}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6,
                                fontFamily:'var(--font-mono)' }}>
                    Confidence: {Math.round((result.confidence||0)*100)}%
                  </div>
                </>
              ) : (
                <div style={{ color:'var(--text-muted)', fontSize:14 }}>
                  {result.word || 'No hand detected in image'}
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:12, lineHeight:1.5 }}>
            🔒 Uploaded files are not stored or transmitted.
            Files are analyzed locally and discarded after analysis.
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SIGN GUIDE COMPONENT
   ════════════════════════════════════════════════════ */
function SignGuide() {
  const [filterCat, setFilterCat] = useState('all');
  const [selected, setSelected]   = useState(null);

  const signs = useMemo(() => {
    return Object.entries(SIGN_DATABASE)
      .filter(([, v]) => filterCat === 'all' || v.category === filterCat)
      .map(([k, v]) => ({ id: k, ...v }));
  }, [filterCat]);

  const cats = ['all', 'letter', 'number', 'word'];

  return (
    <div className="glass-card" role="region" aria-label="Sign guide">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">📖</span>
          Sign Reference Guide
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, padding:'12px 16px', borderBottom:'1px solid var(--border-card)',
                    overflowX:'auto' }}>
        {cats.map(cat => (
          <button
            key={cat}
            className={`practice-cat ${filterCat === cat ? 'active' : ''}`}
            onClick={() => setFilterCat(cat)}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}
          </button>
        ))}
      </div>

      <div className="sign-grid" role="list">
        {signs.map(sign => (
          <div
            key={sign.id}
            className="sign-cell"
            onClick={() => setSelected(selected?.id === sign.id ? null : sign)}
            role="listitem"
            tabIndex={0}
            aria-label={`${sign.word} — ${sign.description}`}
            onKeyDown={e => e.key === 'Enter' && setSelected(sign)}
          >
            <div className="sign-cell-char">{sign.id}</div>
            <div className="sign-cell-label">{sign.word?.slice(0,8)}</div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{
          margin:'0 16px 16px',
          padding:16,
          background:'rgba(0,229,255,0.04)',
          border:'1px solid var(--border-glow)',
          borderRadius:'var(--radius-lg)',
          animation:'fadeUp 0.3s var(--ease-out-expo) both'
        }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:48, lineHeight:1,
                          color:'var(--accent-cyan)' }}>{selected.id}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>{selected.word}</div>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.15em',
                            color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>
                {selected.category}
              </div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:8, lineHeight:1.6 }}>
                {selected.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   DISCLAIMER FOOTER
   ════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <p className="disclaimer">
        ⚠ This tool currently supports basic sign recognition and may not understand full
        sign language conversations. For professional or medical use, please consult a
        certified ASL interpreter.
      </p>
      <p>SignAI — Open-source, privacy-first, on-device AI sign language translation</p>
    </footer>
  );
}

/* ════════════════════════════════════════════════════
   MAIN APP COMPONENT
   ════════════════════════════════════════════════════ */
function App() {
  const [splashDone,    setSplashDone]    = useState(false);
  const [currentTab,    setCurrentTab]    = useState('translate');
  const [cameraActive,  setCameraActive]  = useState(false);
  const [result,        setResult]        = useState({ sign: null, confidence: 0, uncertain: true });
  const [history,       setHistory]       = useState([]);
  const { toast, showToast } = useToast();

  // Handle classifier results
  const handleResult = useCallback((res, landmarks) => {
    setResult(res);

    // Add to history if confident new sign
    if (res.sign && !res.uncertain && res.confidence >= 0.70) {
      setHistory(h => {
        // Avoid duplicate of last entry
        if (h.length > 0 && h[h.length - 1].sign === res.sign) return h;
        const entry = {
          id:         Date.now(),
          sign:       res.sign,
          word:       res.word,
          confidence: res.confidence,
          time:       timeStamp()
        };
        return [...h.slice(-49), entry]; // keep last 50
      });
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    showToast('History cleared', '🗑');
  }, [showToast]);

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  return (
    <>
      {/* Toast notification */}
      <div className={`toast ${toast.visible ? 'visible' : ''}`} role="status" aria-live="polite">
        <span>{toast.icon}</span>
        <span>{toast.msg}</span>
      </div>

      <div className="main-app">
        <Nav
          currentTab={currentTab}
          onTab={setCurrentTab}
          cameraActive={cameraActive}
        />

        <div className="container">
          {/* Hero */}
          <section className="hero" aria-label="Header">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              Real-time · On-device · Private
            </div>
            <h1 className="hero-title">
              <span className="hero-title-line1">Sign Language</span>
              <span className="hero-title-line2">Translator AI</span>
            </h1>
            <p className="hero-subtitle">
              Translate ASL signs into text in real time using your camera.
              No data leaves your device.
            </p>
          </section>

          {/* TRANSLATE TAB */}
          {currentTab === 'translate' && (
            <div className="workspace" role="main">
              {/* Left column: camera + translation */}
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <CameraPanel
                  onResult={handleResult}
                  cameraActive={cameraActive}
                  setCameraActive={setCameraActive}
                />
                <TranslationPanel
                  result={result}
                  history={history}
                  onClearHistory={clearHistory}
                  showToast={showToast}
                />
                <UploadMode showToast={showToast} />
              </div>

              {/* Right column: history + quick guide */}
              <div className="sidebar">
                <HistoryPanel
                  history={history}
                  onClear={clearHistory}
                  showToast={showToast}
                />

                {/* Quick stats */}
                <div className="glass-card">
                  <div className="card-header">
                    <div className="card-title">
                      <span className="card-title-icon">📊</span>
                      Session Stats
                    </div>
                  </div>
                  <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                    {[
                      { label:'Signs Detected',   value: history.length, icon:'🤟' },
                      { label:'Avg Confidence',
                        value: history.length > 0
                          ? Math.round(history.reduce((a,h)=>a+h.confidence,0)/history.length*100)+'%'
                          : '—',
                        icon:'🎯' },
                      { label:'Unique Signs',
                        value: new Set(history.map(h=>h.sign)).size,
                        icon:'✨' },
                    ].map(stat => (
                      <div key={stat.label} style={{ display:'flex', justifyContent:'space-between',
                                                     alignItems:'center' }}>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                          {stat.icon} {stat.label}
                        </div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:14,
                                      fontWeight:600, color:'var(--text-primary)' }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supported signs list */}
                <div className="glass-card">
                  <div className="card-header">
                    <div className="card-title">
                      <span className="card-title-icon">ℹ</span>
                      Supported Signs
                    </div>
                  </div>
                  <div style={{ padding:'12px 16px' }}>
                    {Object.entries(SIGN_CATEGORIES).map(([cat, meta]) => (
                      <div key={cat} style={{ display:'flex', alignItems:'center', gap:10,
                                              padding:'8px 0', borderBottom:'1px solid var(--border-card)' }}>
                        <span>{meta.icon}</span>
                        <span style={{ fontSize:13, color:'var(--text-secondary)', flex:1 }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize:12, fontFamily:'var(--font-mono)',
                                       color: meta.color, fontWeight:600 }}>
                          {getSignsByCategory(cat).length} signs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRACTICE TAB */}
          {currentTab === 'practice' && (
            <div className="workspace" role="main">
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <CameraPanel
                  onResult={handleResult}
                  cameraActive={cameraActive}
                  setCameraActive={setCameraActive}
                />
              </div>
              <div className="sidebar">
                <PracticeMode result={result} />
                <HistoryPanel
                  history={history}
                  onClear={clearHistory}
                  showToast={showToast}
                />
              </div>
            </div>
          )}

          {/* GUIDE TAB */}
          {currentTab === 'guide' && (
            <div style={{ paddingBottom:40 }} role="main">
              <SignGuide />
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}

/* ─── MOUNT ──────────────────────────────────────── */
const rootEl = document.getElementById('root');
const root   = ReactDOM.createRoot(rootEl);
root.render(<App />);
