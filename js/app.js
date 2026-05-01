/* ═══════════════════════════════════════════════════
   SignAI — Main React Application
   Sign Language Translation + Face Expression Detection
   ═══════════════════════════════════════════════════ */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ─── TTS WRAPPER ───────────────────────────────── */
class TTS {
  static speak(text, rate = 1.0, onEnd) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate; utt.pitch = 1.0; utt.volume = 1.0;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  }
  static stop() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
  static get available() { return 'speechSynthesis' in window; }
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

function timeStamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ════════════════════════════════════════════════════
   SPLASH SCREEN
   ════════════════════════════════════════════════════ */
function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setHiding(true); setTimeout(onDone, 850); }, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`splash ${hiding ? 'hiding' : ''}`} role="status" aria-label="Loading SignAI">
      <div className="splash-logo">
        <div className="splash-logo-ring">
          <span className="splash-logo-inner">🤟</span>
        </div>
      </div>
      <h1 className="splash-title">SIGNAI</h1>
      <p className="splash-tagline">AI Sign Language & Emotion Translator</p>
      <div className="splash-loader">
        <div className="splash-loader-bar"><div className="splash-loader-fill"></div></div>
        <p className="splash-loader-text">Initializing AI vision engine…</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   NAVIGATION
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
          { id: 'translate', label: 'Translate'  },
          { id: 'face',      label: '😊 Emotions' },
          { id: 'practice',  label: 'Practice'   },
          { id: 'guide',     label: 'Sign Guide' },
        ].map(({ id, label }) => (
          <button key={id}
            className={`nav-link ${currentTab === id ? 'active' : ''}`}
            onClick={() => onTab(id)} role="tab" aria-selected={currentTab === id}>
            {label}
          </button>
        ))}
      </div>
      <div className="nav-actions">
        <a
          href="https://www.kestford.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-kestford-btn"
          aria-label="Explore our other projects at KestFord"
        >
          <span className="nav-kestford-icon">⬡</span>
          <span className="nav-kestford-label">Explore Projects</span>
          <span className="nav-kestford-arrow">↗</span>
        </a>
        <div className="nav-status" aria-live="polite">
          <span className={`nav-status-dot ${cameraActive ? 'active' : ''}`}></span>
          <span className="nav-status-text">{cameraActive ? 'Live' : 'Off'}</span>
        </div>
      </div>
    </nav>
  );
}

/* ════════════════════════════════════════════════════
   FACE EXPRESSION PANEL (sidebar card)
   ════════════════════════════════════════════════════ */
function FaceExpressionPanel({ faceResult, isActive }) {
  const { expression, confidence = 0, all, age, gender, genderConf, noFace, error } = faceResult || {};
  const meta = EXPRESSION_META[expression] || EXPRESSION_META.neutral;
  const [exprHistory, setExprHistory] = useState([]);
  const prevExpr = useRef(null);

  useEffect(() => {
    if (expression && expression !== 'neutral' && expression !== prevExpr.current && confidence > 0.55) {
      prevExpr.current = expression;
      setExprHistory(h => {
        const entry = { expr: expression, emoji: EXPRESSION_META[expression]?.emoji, time: timeStamp(), id: Date.now() };
        return [...h.slice(-9), entry];
      });
    }
  }, [expression, confidence]);

  if (!isActive) {
    return (
      <div className="glass-card face-panel">
        <div className="card-header">
          <div className="card-title"><span className="card-title-icon">😊</span>Face Emotions</div>
        </div>
        <div className="no-face-hint">
          <div className="no-face-icon">🎭</div>
          <div>Enable 😊 Emotion from camera controls</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card face-panel">
        <div className="card-header">
          <div className="card-title"><span className="card-title-icon">😊</span>Face Emotions</div>
        </div>
        <div className="no-face-hint">
          <div className="no-face-icon">⚠️</div>
          <div style={{ color: 'var(--accent-amber)' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (noFace || !expression) {
    return (
      <div className="glass-card face-panel">
        <div className="card-header">
          <div className="card-title"><span className="card-title-icon">😊</span>Face Emotions</div>
        </div>
        <div className="no-face-hint">
          <div className="no-face-icon">👤</div>
          <div>No face detected</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Look directly at the camera</div>
        </div>
      </div>
    );
  }

  const R = 50, circ = 2 * Math.PI * R;
  const pct = Math.min(confidence, 1);
  const dash = circ - pct * circ;

  return (
    <div className="glass-card face-panel">
      <div className="card-header">
        <div className="card-title"><span className="card-title-icon">😊</span>Face Emotions</div>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                       textTransform: 'uppercase', letterSpacing: '0.15em' }}>LIVE AI</span>
      </div>

      <div className="expression-hero">
        <div className="expression-ring" key={expression}>
          <svg className="expression-ring-svg" viewBox="0 0 120 120">
            <circle className="expression-ring-track" cx="60" cy="60" r={R} />
            <circle className="expression-ring-fill" cx="60" cy="60" r={R}
              strokeDasharray={circ} strokeDashoffset={dash} style={{ stroke: meta.color }} />
          </svg>
          <span className="expression-emoji" key={expression + '-emoji'}>{meta.emoji}</span>
        </div>
        <div className="expression-label" style={{ color: meta.color }} aria-live="assertive">
          {meta.label}
        </div>
        <div className="expression-desc">{meta.desc} · {Math.round(confidence * 100)}%</div>
      </div>

      {(age || gender) && (
        <div className="face-meta">
          {age    && <div className="face-meta-badge visible">🎂 Age ~{age}</div>}
          {gender && (
            <div className="face-meta-badge visible">
              {gender === 'male' ? '👨' : '👩'} {gender}
              {genderConf ? ` · ${Math.round(genderConf * 100)}%` : ''}
            </div>
          )}
        </div>
      )}

      {all && (
        <div className="expression-bars">
          <div className="section-label" style={{ padding: 0, marginBottom: 8 }}>All Emotions</div>
          {Object.entries(EXPRESSION_META).map(([key, m]) => {
            const val = Math.round((all[key] || 0) * 100);
            return (
              <div className="expr-row" key={key}>
                <span className="expr-emoji-sm">{m.emoji}</span>
                <span className="expr-name">{m.label}</span>
                <div className="expr-bar-track">
                  <div className="expr-bar-fill" style={{ width: `${val}%`, background: m.color }} />
                </div>
                <span className="expr-pct">{val}%</span>
              </div>
            );
          })}
        </div>
      )}

      {exprHistory.length > 0 && (
        <div style={{ paddingBottom: 16 }}>
          <div className="section-label" style={{ padding: '0 20px', marginBottom: 8 }}>Recent</div>
          <div className="expr-history">
            {[...exprHistory].reverse().map(h => (
              <div key={h.id} className="expr-chip">
                {h.emoji}
                <span style={{ color: 'var(--text-secondary)' }}>{h.expr}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CAMERA PANEL — dual overlays (hands + face)
   ════════════════════════════════════════════════════ */
function CameraPanel({ onSignResult, onFaceResult, cameraActive, setCameraActive, faceMode, setFaceMode }) {
  const videoRef       = useRef(null);
  const handOverlayRef = useRef(null);
  const faceOverlayRef = useRef(null);
  const trackerRef     = useRef(null);
  const faceDetRef     = useRef(null);
  const [loading, setLoading]         = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [error, setError]             = useState('');
  const [facingMode, setFacing]       = useState('user');
  const [signLang, setSignLang]       = useState('ASL');

  useEffect(() => {
    const tracker = new HandTracker((result) => onSignResult(result));
    trackerRef.current = tracker;
    return () => { tracker.stop(); };
  }, [onSignResult]);

  useEffect(() => {
    const det = new FaceExpressionDetector((res) => onFaceResult(res));
    faceDetRef.current = det;
    return () => { det.stop(); };
  }, [onFaceResult]);

  const startCamera = useCallback(async (facing = facingMode) => {
    setError(''); setLoading(true);
    try {
      const ok = await trackerRef.current.init(videoRef.current, handOverlayRef.current);
      if (!ok) throw new Error('Hand tracking model failed to load. Please refresh.');
      await trackerRef.current.startCamera(videoRef.current, facing);
      setCameraActive(true);
      if (faceMode) {
        setFaceLoading(true);
        await faceDetRef.current.start(videoRef.current, faceOverlayRef.current);
        setFaceLoading(false);
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('Camera permission denied. Please allow access and refresh.');
      else if (e.name === 'NotFoundError') setError('No camera found.');
      else setError(e.message || 'Failed to start camera.');
      setCameraActive(false);
    } finally { setLoading(false); }
  }, [facingMode, setCameraActive, faceMode]);

  const stopCamera = useCallback(() => {
    if (trackerRef.current) trackerRef.current.stop();
    if (faceDetRef.current) faceDetRef.current.stop();
    setCameraActive(false);
    onSignResult({ sign: null, confidence: 0, uncertain: true });
    onFaceResult({ expression: null, noFace: true });
  }, [setCameraActive, onSignResult, onFaceResult]);

  const switchCamera = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacing(next);
    if (cameraActive) { stopCamera(); setTimeout(() => startCamera(next), 400); }
  }, [facingMode, cameraActive, stopCamera, startCamera]);

  const toggleFaceMode = useCallback(async () => {
    const next = !faceMode;
    setFaceMode(next);
    if (!cameraActive) return;
    if (next) {
      setFaceLoading(true);
      await faceDetRef.current.start(videoRef.current, faceOverlayRef.current);
      setFaceLoading(false);
    } else {
      faceDetRef.current.stop();
      onFaceResult({ expression: null, noFace: true });
    }
  }, [faceMode, setFaceMode, cameraActive, onFaceResult]);

  return (
    <div className="camera-section">
      <div className={`camera-viewport glass-card ${cameraActive ? 'active' : ''}`}
           role="region" aria-label="Camera feed">

        {!cameraActive && !loading && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">📷</div>
            <div className="camera-placeholder-text">{error || 'Click "Start Camera" to begin'}</div>
            {error && <div style={{ fontSize:12, color:'var(--accent-red)', marginTop:8, maxWidth:280, textAlign:'center', padding:'0 16px' }}>{error}</div>}
          </div>
        )}

        {loading && (
          <div className="camera-placeholder">
            <div className="spinner" style={{ width:40, height:40 }}></div>
            <div className="camera-placeholder-text" style={{ marginTop:16 }}>
              {faceLoading ? 'Loading emotion model…' : 'Loading hand tracking model…'}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>First load may take a moment</div>
          </div>
        )}

        <video ref={videoRef} className="camera-feed" autoPlay playsInline muted
               style={{ display: cameraActive ? 'block' : 'none' }} aria-label="Live camera feed" />

        {/* Hand skeleton overlay */}
        <canvas ref={handOverlayRef} className="camera-overlay-canvas"
                style={{ display: cameraActive ? 'block' : 'none', zIndex:2 }} aria-hidden="true" />

        {/* Face bounding-box + landmark overlay */}
        <canvas ref={faceOverlayRef} className="face-canvas-layer"
                style={{ display: cameraActive && faceMode ? 'block' : 'none', zIndex:3 }} aria-hidden="true" />

        <div className="camera-corners" aria-hidden="true">
          <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div><div className="corner corner-br"></div>
        </div>

        <div className={`rec-indicator ${cameraActive ? 'visible' : ''}`} aria-live="polite">
          <span className="rec-dot"></span>
          LIVE · ASL{faceMode ? ' · EMOTION' : ''}
        </div>

        <div className={`gesture-hint ${cameraActive ? 'visible' : ''}`}>
          {faceMode ? 'Hand signs + face emotions active' : 'Show your hand to the camera'}
        </div>
      </div>

      <div className="camera-controls">
        <div className="select-wrapper" style={{ flex:'none', width:110 }}>
          <select className="select" value={signLang}
                  onChange={e => setSignLang(e.target.value)} aria-label="Sign language">
            <option value="ASL">ASL</option>
            <option value="BSL" disabled>BSL (Soon)</option>
          </select>
        </div>

        {!cameraActive ? (
          <button className="btn btn-primary" onClick={() => startCamera()} disabled={loading} aria-label="Start camera">
            {loading ? <><span className="spinner"></span> Loading…</> : <>📷 Start Camera</>}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopCamera} aria-label="Stop camera">⏹ Stop</button>
        )}

        <button
          className="btn btn-ghost"
          onClick={toggleFaceMode}
          disabled={faceLoading}
          style={{ border: faceMode ? '1px solid rgba(124,58,237,0.55)' : undefined,
                   color: faceMode ? '#a78bfa' : undefined,
                   background: faceMode ? 'rgba(124,58,237,0.12)' : undefined }}
          aria-label="Toggle face emotion detection"
          title={faceMode ? 'Disable emotion detection' : 'Enable emotion detection'}>
          {faceLoading ? <><span className="spinner"></span> Loading…</> : <>😊 {faceMode ? 'Emotion ON' : 'Emotion'}</>}
        </button>

        <button className="btn btn-ghost btn-icon" onClick={switchCamera}
                title="Switch camera" aria-label="Switch camera">🔄</button>
      </div>

      <div className="privacy-notice" role="note">
        <span className="privacy-icon">🔒</span>
        <p className="privacy-text">
          <strong>100% private.</strong> All AI (hand tracking + face emotions) runs on your device.
          No video, photos, or biometric data are recorded, stored, or transmitted.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TRANSLATION PANEL
   ════════════════════════════════════════════════════ */
function TranslationPanel({ result, showToast }) {
  const [autoSpeak,  setAutoSpeak]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [sentence,   setSentence]   = useState('');
  const prevSign = useRef(null);

  const { sign, confidence = 0, word = '', uncertain } = result || {};
  const confPct   = Math.round(confidence * 100);
  const confLevel = confPct >= 75 ? 'high' : confPct >= 50 ? 'medium' : 'low';

  useEffect(() => {
    if (sign && sign !== prevSign.current && !uncertain) {
      prevSign.current = sign;
      setSentence(prev => {
        const w = word || sign;
        if (prev.endsWith(w)) return prev;
        return (prev ? prev + ' ' : '') + w;
      });
      if (autoSpeak && TTS.available) TTS.speak(word || sign, speechRate);
    }
  }, [sign, word, uncertain, autoSpeak, speechRate]);

  const speakCurrent = () => {
    if (!TTS.available) { showToast('TTS not available', '⚠️'); return; }
    if (!sentence) return;
    setSpeaking(true);
    TTS.speak(sentence, speechRate, () => setSpeaking(false));
  };

  const copyText = () => {
    if (!sentence) return;
    navigator.clipboard.writeText(sentence).then(
      () => showToast('Copied!', '📋'), () => showToast('Copy failed', '✗')
    );
  };

  const clear = () => { setSentence(''); prevSign.current = null; TTS.stop(); };

  return (
    <div className="translation-stack">
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title"><span className="card-title-icon">👁</span>Live Detection</div>
          {sign && <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)',
                                  textTransform:'uppercase', letterSpacing:'0.15em' }}>{result.category}</span>}
        </div>
        <div className="detection-display">
          {uncertain && !sign ? (
            <div className="detection-sign uncertain">
              {confidence > 0.3 ? 'Hold gesture still…' : 'Waiting for hand…'}
            </div>
          ) : (
            <>
              <div className="detection-category">{result?.category ?? ''}</div>
              <div className="detection-sign" key={sign}
                   style={{ animation: sign ? 'popIn 0.3s var(--ease-spring) both' : 'none' }}
                   aria-live="assertive">{sign || '—'}</div>
              {word && word !== sign && <div className="detection-word">{word}</div>}
            </>
          )}
        </div>
        <div className="confidence-wrapper">
          <div className="confidence-label">
            <span>Confidence</span>
            <span className="confidence-value" style={{
              color: confLevel === 'high' ? 'var(--accent-cyan)' :
                     confLevel === 'medium' ? 'var(--accent-amber)' : 'var(--accent-red)'
            }}>{confPct}%</span>
          </div>
          <div className="confidence-bar" role="progressbar" aria-valuenow={confPct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`confidence-fill ${confLevel}`} style={{ width:`${confPct}%` }}></div>
          </div>
          {uncertain && confidence > 0.3 && (
            <div style={{ fontSize:11, color:'var(--accent-amber)', marginTop:6, fontFamily:'var(--font-mono)' }}>
              ⚠ Not sure — please repeat the sign
            </div>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <div className="card-title"><span className="card-title-icon">💬</span>Translation</div>
          <button className="btn btn-ghost btn-icon" onClick={clear} title="Clear" aria-label="Clear translation">🗑</button>
        </div>
        <div className="translation-output">
          <div className="translation-label">Detected text</div>
          <div className={`translation-text ${!sentence ? 'empty' : ''}`} aria-live="polite">
            {sentence || 'Start signing to see translation here…'}
          </div>
          <div className="translation-actions">
            <button className="btn btn-ghost" onClick={speakCurrent}
                    disabled={!TTS.available || !sentence || speaking}>
              {speaking ? '🔊 Speaking…' : '🔊 Speak'}
            </button>
            <button className="btn btn-ghost" onClick={copyText} disabled={!sentence}>📋 Copy</button>
          </div>
        </div>
        {TTS.available && (
          <div className="tts-panel" style={{ borderTop:'1px solid var(--border-card)' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>Speed</span>
            <input type="range" className="speed-slider" min="0.5" max="2" step="0.1"
                   value={speechRate} onChange={e => setSpeechRate(parseFloat(e.target.value))}
                   style={{ flex:1 }} aria-label="Speech rate" />
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-secondary)', minWidth:28 }}>
              {speechRate.toFixed(1)}×
            </span>
            <div className="toggle-wrap">
              <span className="toggle-label">Auto-speak</span>
              <label className="toggle" aria-label="Auto-speak toggle">
                <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} />
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
   HISTORY PANEL
   ════════════════════════════════════════════════════ */
function HistoryPanel({ history, onClear, showToast }) {
  const copyAll = () => {
    navigator.clipboard.writeText(history.map(h => h.word).join(' ')).then(
      () => showToast('History copied', '📋'), () => showToast('Failed', '✗')
    );
  };
  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-icon">📜</span>History</div>
        <div style={{ display:'flex', gap:6 }}>
          {history.length > 0 && <>
            <button className="btn btn-ghost btn-icon" onClick={copyAll} aria-label="Copy history">📋</button>
            <button className="btn btn-ghost btn-icon" onClick={onClear} aria-label="Clear history">🗑</button>
          </>}
        </div>
      </div>
      <div className="history-list" role="log">
        {history.length === 0
          ? <div className="history-empty">No signs detected yet</div>
          : [...history].reverse().map((item, i) => (
              <div key={item.id} className="history-item"
                   style={{ animation: i === 0 ? 'slideIn 0.3s var(--ease-out-expo) both' : 'none' }}>
                <div className="history-sign">{item.sign}</div>
                <div className="history-details">
                  <div className="history-word">{item.word}</div>
                  <div className="history-time">{item.time}</div>
                </div>
                <div className="history-conf">{Math.round(item.confidence * 100)}%</div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PRACTICE MODE
   ════════════════════════════════════════════════════ */
function PracticeMode({ result }) {
  const [category, setCategory] = useState('letters');
  const [targets, setTargets]   = useState([]);
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState('waiting');
  const [fbText, setFbText]     = useState('Show the sign above to the camera');
  const fbTimer = useRef(null);

  useEffect(() => {
    const list = PRACTICE_SETS[category] || [];
    setTargets(list); setIdx(0); setScore(0); setAttempts(0);
    setFeedback('waiting'); setFbText('Show the sign above to the camera');
  }, [category]);

  const target = targets[idx];
  const targetData = target ? SIGN_DATABASE[target] : null;

  useEffect(() => {
    if (!result?.sign || !target || fbTimer.current) return;
    const det = result.sign; const conf = result.confidence;
    if (det === target) {
      setFeedback('correct'); setFbText('✅ Perfect! Great job!');
      setScore(s => s + Math.round(conf * 100)); setAttempts(a => a + 1);
      fbTimer.current = setTimeout(() => {
        fbTimer.current = null;
        setIdx(i => (i + 1) % (targets.length || 1));
        setFeedback('waiting'); setFbText('Show the sign above to the camera');
      }, 1500);
    } else if (conf > 0.55) {
      setFeedback('almost'); setFbText(`Almost! Try again — detected: ${det}`);
      setAttempts(a => a + 1);
      fbTimer.current = setTimeout(() => { fbTimer.current = null; }, 2000);
    }
  }, [result?.sign, target, targets.length]);

  const goNext = () => {
    if (fbTimer.current) { clearTimeout(fbTimer.current); fbTimer.current = null; }
    setFeedback('waiting'); setFbText('Show the sign above to the camera');
    setIdx(i => (i + 1) % (targets.length || 1));
  };
  const goPrev = () => {
    if (fbTimer.current) { clearTimeout(fbTimer.current); fbTimer.current = null; }
    setFeedback('waiting'); setFbText('Show the sign above to the camera');
    setIdx(i => (i - 1 + targets.length) % (targets.length || 1));
  };

  const acc = attempts > 0 ? Math.min(100, Math.round(score / attempts)) : 0;
  if (!targetData) return null;

  return (
    <div className="glass-card" role="region" aria-label="Practice mode">
      <div className="card-header">
        <div className="card-title"><span className="card-title-icon">🎯</span>Practice Mode</div>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{idx+1}/{targets.length}</span>
      </div>
      <div className="practice-cats" role="tablist">
        {[['letters','Letters'],['numbers','Numbers'],['words','Words']].map(([id,label]) => (
          <button key={id} className={`practice-cat ${category===id?'active':''}`}
            onClick={() => setCategory(id)} role="tab" aria-selected={category===id}>{label}</button>
        ))}
      </div>
      <div className="practice-target">
        <div className="practice-sign-display">{target}</div>
        <div className="practice-sign-name">{targetData.word}</div>
        <div className="practice-sign-desc">{targetData.description}</div>
      </div>
      <div className={`practice-feedback ${feedback}`} aria-live="assertive">{fbText}</div>
      {attempts > 0 && (
        <div className="practice-score">
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em' }}>
            <span>Accuracy</span><span style={{ color:'var(--accent-green)' }}>{acc}%</span>
          </div>
          <div className="score-bar">
            <div className="score-fill" style={{ width:`${acc}%` }}></div>
          </div>
        </div>
      )}
      <div className="practice-nav">
        <button className="btn btn-ghost" onClick={goPrev}>← Prev</button>
        <button className="btn btn-ghost" onClick={goNext}>Next →</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   UPLOAD MODE
   ════════════════════════════════════════════════════ */
function UploadMode({ showToast }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [fileType, setFileType] = useState('');
  const [result, setResult]     = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imgRef = useRef(null);

  const handleFile = f => {
    if (!f) return;
    const type = f.type.startsWith('video') ? 'video' : 'image';
    setFile(f); setFileType(type); setResult(null);
    setPreview(URL.createObjectURL(f));
  };

  const analyzeImage = async () => {
    if (!imgRef.current || !file) return;
    setAnalyzing(true);
    try {
      if (typeof Hands === 'undefined') { showToast('Model loading…', '⏳'); setAnalyzing(false); return; }
      const t = new HandTracker(() => {});
      setResult(await t.classifyImage(imgRef.current));
    } catch (e) {
      setResult({ sign: null, uncertain: true, word: 'Analysis failed: ' + e.message });
    } finally { setAnalyzing(false); }
  };

  const removeFile = () => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); setResult(null); setFileType(''); };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-icon">📤</span>Upload &amp; Analyze</div>
      </div>
      {!preview ? (
        <div className={`upload-zone ${dragOver?'drag-over':''}`}
             onDragOver={e=>{e.preventDefault();setDragOver(true);}}
             onDragLeave={()=>setDragOver(false)}
             onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
             role="button" tabIndex={0}>
          <input type="file" className="upload-input" accept="image/*,video/mp4,video/webm"
                 onChange={e=>handleFile(e.target.files[0])} />
          <div className="upload-icon">📁</div>
          <div className="upload-text">Drop a photo or video here</div>
          <div className="upload-sub">JPG, PNG, MP4, WebM supported</div>
        </div>
      ) : (
        <div className="upload-preview">
          {fileType === 'image'
            ? <img ref={imgRef} src={preview} alt="Uploaded sign" crossOrigin="anonymous" />
            : <video src={preview} controls style={{ width:'100%', maxHeight:280 }} />}
          <button className="upload-remove" onClick={removeFile} aria-label="Remove">✕</button>
        </div>
      )}
      {preview && (
        <div style={{ padding:'0 20px 20px' }}>
          {fileType === 'image' && (
            <button className="btn btn-primary" onClick={analyzeImage} disabled={analyzing} style={{ width:'100%' }}>
              {analyzing ? <><span className="spinner"></span> Analyzing…</> : '🔍 Analyze Sign'}
            </button>
          )}
          {result && (
            <div style={{ marginTop:16, padding:16, background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-lg)', animation:'fadeUp 0.4s var(--ease-out-expo) both' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.15em', fontWeight:600, marginBottom:10 }}>Result</div>
              {result.sign ? (
                <>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:56, background:'linear-gradient(135deg,#fff,var(--accent-cyan))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1, marginBottom:6 }}>{result.sign}</div>
                  <div style={{ color:'var(--accent-cyan)', fontWeight:600 }}>{result.word}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6, fontFamily:'var(--font-mono)' }}>Confidence: {Math.round((result.confidence||0)*100)}%</div>
                </>
              ) : (
                <div style={{ color:'var(--text-muted)' }}>{result.word || 'No hand detected'}</div>
              )}
            </div>
          )}
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:12, lineHeight:1.5 }}>
            🔒 Files are analyzed locally and never stored or sent anywhere.
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SIGN GUIDE
   ════════════════════════════════════════════════════ */
function SignGuide() {
  const [filterCat, setFilterCat] = useState('all');
  const [selected, setSelected]   = useState(null);

  const signs = useMemo(() =>
    Object.entries(SIGN_DATABASE)
      .filter(([,v]) => filterCat === 'all' || v.category === filterCat)
      .map(([k,v]) => ({ id:k, ...v })),
  [filterCat]);

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-icon">📖</span>Sign Reference Guide</div>
      </div>
      <div style={{ display:'flex', gap:6, padding:'12px 16px', borderBottom:'1px solid var(--border-card)', overflowX:'auto' }}>
        {['all','letter','number','word'].map(cat => (
          <button key={cat} className={`practice-cat ${filterCat===cat?'active':''}`} onClick={() => setFilterCat(cat)}>
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}
          </button>
        ))}
      </div>
      <div className="sign-grid" role="list">
        {signs.map(sign => (
          <div key={sign.id} className="sign-cell" role="listitem" tabIndex={0}
               onClick={() => setSelected(selected?.id === sign.id ? null : sign)}
               onKeyDown={e => e.key === 'Enter' && setSelected(sign)}>
            <div className="sign-cell-char">{sign.id}</div>
            <div className="sign-cell-label">{sign.word?.slice(0,8)}</div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ margin:'0 16px 16px', padding:16, background:'rgba(0,229,255,0.04)', border:'1px solid var(--border-glow)', borderRadius:'var(--radius-lg)', animation:'fadeUp 0.3s var(--ease-out-expo) both' }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:48, lineHeight:1, color:'var(--accent-cyan)' }}>{selected.id}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>{selected.word}</div>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.15em', color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{selected.category}</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:8, lineHeight:1.6 }}>{selected.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   DEDICATED EMOTIONS TAB PAGE
   ════════════════════════════════════════════════════ */
function FaceTab({ faceResult, cameraActive }) {
  const meta = EXPRESSION_META[faceResult?.expression] || EXPRESSION_META.neutral;

  return (
    <div className="workspace" role="main">
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Big expression showcase card */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title"><span className="card-title-icon">🎭</span>Real-Time Face Expression</div>
            {cameraActive && faceResult?.expression && (
              <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.15em' }}>LIVE</span>
            )}
          </div>

          {!cameraActive ? (
            <div className="no-face-hint" style={{ padding:'56px 24px' }}>
              <div className="no-face-icon" style={{ fontSize:72 }}>🎭</div>
              <div style={{ fontSize:17, fontWeight:600, marginTop:8 }}>Start camera + enable 😊 Emotion</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>Go to Translate tab → Start Camera → click 😊 Emotion button</div>
            </div>
          ) : !faceResult?.expression || faceResult?.noFace ? (
            <div className="no-face-hint" style={{ padding:'56px 24px' }}>
              <div className="no-face-icon" style={{ fontSize:72 }}>👤</div>
              <div style={{ fontSize:17, fontWeight:600, marginTop:8 }}>No face detected</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>Position your face fully in the camera view</div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 32px 28px' }}>
              {/* Giant animated emoji */}
              <div style={{ fontSize:110, lineHeight:1, animation:'emojiPop 0.4s var(--ease-spring) both', filter:'drop-shadow(0 0 24px rgba(0,0,0,0.5))' }} key={faceResult.expression}>
                {meta.emoji}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:clamp(40,6,72) ?? 56, letterSpacing:'0.08em', color:meta.color, marginTop:16, lineHeight:1, fontSize:'clamp(40px,6vw,72px)' }}>
                {meta.label.toUpperCase()}
              </div>
              <div style={{ fontSize:15, color:'var(--text-secondary)', marginTop:10 }}>
                {meta.desc}
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:24, fontWeight:700, color:meta.color, marginTop:8 }}>
                {Math.round((faceResult.confidence||0)*100)}% confident
              </div>

              {/* Age / gender */}
              {(faceResult.age || faceResult.gender) && (
                <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:20 }}>
                  {faceResult.age    && <div className="face-meta-badge visible" style={{ fontSize:14, padding:'8px 18px' }}>🎂 Age ~{faceResult.age}</div>}
                  {faceResult.gender && (
                    <div className="face-meta-badge visible" style={{ fontSize:14, padding:'8px 18px' }}>
                      {faceResult.gender==='male'?'👨':'👩'} {faceResult.gender}
                      {faceResult.genderConf ? ` · ${Math.round(faceResult.genderConf*100)}%` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* All expressions breakdown (large card) */}
        {cameraActive && faceResult?.all && (
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title"><span className="card-title-icon">📊</span>All Detected Emotions</div>
            </div>
            <div className="expression-bars" style={{ padding:'20px 24px 24px' }}>
              {Object.entries(EXPRESSION_META).map(([key, m]) => {
                const val = Math.round((faceResult.all[key]||0)*100);
                return (
                  <div key={key} style={{ display:'grid', gridTemplateColumns:'36px 120px 1fr 44px', alignItems:'center', gap:12, marginBottom:12 }}>
                    <span style={{ fontSize:24, textAlign:'center' }}>{m.emoji}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: key===faceResult.expression ? m.color : 'var(--text-secondary)', letterSpacing:'0.04em' }}>{m.label}</span>
                    <div style={{ height:8, background:'rgba(255,255,255,0.05)', borderRadius:8, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:8, background:m.color, width:`${val}%`, transition:'width 0.5s var(--ease-out-expo)', boxShadow: key===faceResult.expression ? `0 0 10px ${m.color}` : 'none' }} />
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color: key===faceResult.expression ? m.color : 'var(--text-muted)', textAlign:'right' }}>{val}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <FaceExpressionPanel faceResult={faceResult} isActive={cameraActive} />
        {/* Expression reference card */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title"><span className="card-title-icon">📖</span>Emotion Reference</div>
          </div>
          <div style={{ padding:'12px 16px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            {Object.entries(EXPRESSION_META).map(([key, m]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 10px', borderRadius:'var(--radius-md)', background:'var(--bg-card)', border:'1px solid var(--border-card)' }}>
                <span style={{ fontSize:20 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:m.color }}>{m.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <p className="disclaimer">
        ⚠ This tool supports basic sign recognition and may not understand full sign language conversations.
        Face emotion detection is for accessibility and entertainment purposes only — not medical or clinical use.
      </p>
      <p style={{ marginTop: 8 }}>
        SignAI — Privacy-first, on-device AI · ASL Sign Translation + Face Emotion Detection
      </p>
      <p style={{ marginTop: 4, fontSize: 11 }}>
        © {new Date().getFullYear()} SignAI · All processing is local · No data collected
      </p>
    </footer>
  );
}

/* ════════════════════════════════════════════════════
   ROOT APP
   ════════════════════════════════════════════════════ */
function App() {
  const [splashDone,   setSplashDone]   = useState(false);
  const [currentTab,   setCurrentTab]   = useState('translate');
  const [cameraActive, setCameraActive] = useState(false);
  const [faceMode,     setFaceMode]     = useState(false);
  const [signResult,   setSignResult]   = useState({ sign:null, confidence:0, uncertain:true });
  const [faceResult,   setFaceResult]   = useState({ expression:null, noFace:true });
  const [history,      setHistory]      = useState([]);
  const { toast, showToast } = useToast();

  const handleSignResult = useCallback((res) => {
    setSignResult(res);
    if (res.sign && !res.uncertain && res.confidence >= 0.70) {
      setHistory(h => {
        if (h.length > 0 && h[h.length-1].sign === res.sign) return h;
        return [...h.slice(-49), { id:Date.now(), sign:res.sign, word:res.word, confidence:res.confidence, time:timeStamp() }];
      });
    }
  }, []);

  const handleFaceResult = useCallback((res) => setFaceResult(res), []);
  const clearHistory     = useCallback(() => { setHistory([]); showToast('History cleared', '🗑'); }, [showToast]);

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  const sharedCameraProps = {
    onSignResult: handleSignResult,
    onFaceResult: handleFaceResult,
    cameraActive, setCameraActive,
    faceMode, setFaceMode,
  };

  return (
    <>
      <div className={`toast ${toast.visible ? 'visible' : ''}`} role="status" aria-live="polite">
        <span>{toast.icon}</span><span>{toast.msg}</span>
      </div>

      <div className="main-app">
        <Nav currentTab={currentTab} onTab={setCurrentTab} cameraActive={cameraActive} />

        <div className="container">
          <section className="hero" aria-label="Header">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              Sign Language + Face Emotions · Real-time · On-device
            </div>
            <h1 className="hero-title">
              <span className="hero-title-line1">Sign Language</span>
              <span className="hero-title-line2">+ Emotion AI</span>
            </h1>
            <p className="hero-subtitle">
              Translate ASL signs and detect facial expressions simultaneously.
              All AI runs privately on your device — no data ever leaves.
            </p>
          </section>

          {/* TRANSLATE */}
          {currentTab === 'translate' && (
            <div className="workspace" role="main">
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <CameraPanel {...sharedCameraProps} />
                <TranslationPanel result={signResult} showToast={showToast} />
                <UploadMode showToast={showToast} />
              </div>
              <div className="sidebar">
                <FaceExpressionPanel faceResult={faceResult} isActive={cameraActive && faceMode} />
                <HistoryPanel history={history} onClear={clearHistory} showToast={showToast} />
                <div className="glass-card">
                  <div className="card-header">
                    <div className="card-title"><span className="card-title-icon">📊</span>Session Stats</div>
                  </div>
                  <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                    {[
                      { label:'Signs Detected', value: history.length,                                                                                   icon:'🤟' },
                      { label:'Avg Confidence', value: history.length>0 ? Math.round(history.reduce((a,h)=>a+h.confidence,0)/history.length*100)+'%':'—', icon:'🎯' },
                      { label:'Unique Signs',   value: new Set(history.map(h=>h.sign)).size,                                                              icon:'✨' },
                      { label:'Emotion Now',    value: (cameraActive && faceMode && faceResult?.expression) ? (EXPRESSION_META[faceResult.expression]?.emoji + ' ' + faceResult.expression) : 'Off', icon:'😊' },
                    ].map(s => (
                      <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.icon} {s.label}</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, color:'var(--text-primary)', textTransform:'capitalize' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FACE EMOTIONS */}
          {currentTab === 'face' && (
            <FaceTab faceResult={faceResult} cameraActive={cameraActive && faceMode} />
          )}

          {/* PRACTICE */}
          {currentTab === 'practice' && (
            <div className="workspace" role="main">
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <CameraPanel {...sharedCameraProps} />
              </div>
              <div className="sidebar">
                <PracticeMode result={signResult} />
                <HistoryPanel history={history} onClear={clearHistory} showToast={showToast} />
              </div>
            </div>
          )}

          {/* GUIDE */}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
