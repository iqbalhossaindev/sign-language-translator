/* ═══════════════════════════════════════════════════
   SignAI — Face Expression Detector
   Uses face-api.js for real-time emotion recognition
   Models loaded from jsDelivr CDN (no local files needed)
   ═══════════════════════════════════════════════════ */

const FACE_MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

/* ─── EXPRESSION META ────────────────────────────── */
const EXPRESSION_META = {
  happy:     { label: 'Happy',     emoji: '😊', color: '#f59e0b', desc: 'Smile detected' },
  sad:       { label: 'Sad',       emoji: '😢', color: '#3b82f6', desc: 'Downward expression' },
  angry:     { label: 'Angry',     emoji: '😠', color: '#ef4444', desc: 'Tension detected' },
  fearful:   { label: 'Fearful',   emoji: '😨', color: '#8b5cf6', desc: 'Fear expression' },
  disgusted: { label: 'Disgusted', emoji: '🤢', color: '#10b981', desc: 'Disgust detected' },
  surprised: { label: 'Surprised', emoji: '😲', color: '#00e5ff', desc: 'Raised brows' },
  neutral:   { label: 'Neutral',   emoji: '😐', color: '#8b99b8', desc: 'Calm expression' },
};

/* ─── SMOOTH EXPRESSION BUFFER ───────────────────── */
class ExpressionSmoother {
  constructor(windowSize = 8) {
    this.buffer = [];
    this.size   = windowSize;
  }

  push(expressions) {
    this.buffer.push(expressions);
    if (this.buffer.length > this.size) this.buffer.shift();

    // Average all buffered frames
    const avg = {};
    for (const key of Object.keys(EXPRESSION_META)) avg[key] = 0;

    for (const frame of this.buffer) {
      for (const key of Object.keys(EXPRESSION_META)) {
        avg[key] += (frame[key] || 0);
      }
    }
    const n = this.buffer.length;
    for (const key of Object.keys(avg)) avg[key] /= n;

    return avg;
  }

  reset() { this.buffer = []; }
}

/* ─── FACE DETECTOR CLASS ────────────────────────── */
class FaceExpressionDetector {
  constructor(onResult) {
    this.onResult   = onResult;  // callback({ expression, confidence, all, age, gender, landmarks })
    this.isRunning  = false;
    this.modelsLoaded = false;
    this.smoother   = new ExpressionSmoother(8);
    this.loopTimer  = null;
    this.videoEl    = null;
    this.canvasEl   = null;
    this.ctx        = null;
    this._loading   = false;
  }

  async loadModels() {
    if (this.modelsLoaded) return true;
    if (this._loading)     return false;
    this._loading = true;

    try {
      // Wait for faceapi to be available
      let attempts = 0;
      while (typeof faceapi === 'undefined' && attempts++ < 30) {
        await new Promise(r => setTimeout(r, 300));
      }
      if (typeof faceapi === 'undefined') throw new Error('face-api.js not loaded');

      // Load required models in parallel
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(FACE_MODEL_URL),
      ]);

      this.modelsLoaded = true;
      this._loading     = false;
      return true;
    } catch (e) {
      this._loading = false;
      console.warn('Face model load error:', e.message);
      return false;
    }
  }

  async start(videoEl, canvasEl) {
    this.videoEl  = videoEl;
    this.canvasEl = canvasEl;
    this.ctx      = canvasEl.getContext('2d');
    this.isRunning = true;
    this.smoother.reset();

    const ok = await this.loadModels();
    if (!ok) {
      this.onResult({ error: 'Models failed to load', expression: 'neutral', confidence: 0 });
      return false;
    }

    this._loop();
    return true;
  }

  stop() {
    this.isRunning = false;
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
    if (this.ctx && this.canvasEl) {
      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }
    this.smoother.reset();
  }

  async _loop() {
    if (!this.isRunning) return;

    try {
      const video = this.videoEl;
      if (!video || video.readyState < 2 || video.paused) {
        this.loopTimer = setTimeout(() => this._loop(), 200);
        return;
      }

      // Sync canvas size
      const vw = video.videoWidth  || 640;
      const vh = video.videoHeight || 480;
      if (this.canvasEl.width !== vw || this.canvasEl.height !== vh) {
        this.canvasEl.width  = vw;
        this.canvasEl.height = vh;
      }

      // Detect faces with expressions, landmarks, age & gender
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceExpressions()
        .withAgeAndGender();

      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);

      if (!detections || detections.length === 0) {
        this.onResult({ expression: null, confidence: 0, all: null, noFace: true });
        this.loopTimer = setTimeout(() => this._loop(), 200);
        return;
      }

      // Use first detected face
      const det = detections[0];
      const raw = det.expressions;

      // Smooth expression values
      const smoothed = this.smoother.push(raw);

      // Find dominant expression
      let best = 'neutral', bestConf = 0;
      for (const [key, val] of Object.entries(smoothed)) {
        if (val > bestConf) { bestConf = val; best = key; }
      }

      // Draw face box
      const box = det.detection.box;
      const scaleX = this.canvasEl.width  / (video.videoWidth  || 640);
      const scaleY = this.canvasEl.height / (video.videoHeight || 480);

      this._drawFaceBox(box, best, bestConf, scaleX, scaleY);
      this._drawLandmarks(det.landmarks, scaleX, scaleY);

      // Emit result
      this.onResult({
        expression: best,
        confidence: bestConf,
        all:        smoothed,
        age:        Math.round(det.age),
        gender:     det.gender,
        genderConf: det.genderProbability,
        noFace:     false,
        error:      null,
      });

    } catch (e) {
      // Silently continue on frame errors
    }

    // ~10fps for performance balance
    this.loopTimer = setTimeout(() => this._loop(), 100);
  }

  _drawFaceBox(box, expression, confidence, sx, sy) {
    const meta  = EXPRESSION_META[expression] || EXPRESSION_META.neutral;
    const color = meta.color;
    const ctx   = this.ctx;

    const x = box.x * sx;
    const y = box.y * sy;
    const w = box.width  * sx;
    const h = box.height * sy;

    // Glow shadow
    ctx.shadowColor = color;
    ctx.shadowBlur  = 16;

    // Box border
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.shadowBlur = 0;

    // Corner accents
    const cs = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    const corners = [
      [x, y, cs, 0, 0, cs],
      [x+w, y, -cs, 0, 0, cs],
      [x, y+h, cs, 0, 0, -cs],
      [x+w, y+h, -cs, 0, 0, -cs],
    ];
    for (const [cx, cy, dx1, dy1, dx2, dy2] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx1, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy2);
      ctx.stroke();
    }

    // Label background
    const label    = `${meta.emoji} ${meta.label}  ${Math.round(confidence * 100)}%`;
    const fontSize = 13;
    ctx.font       = `600 ${fontSize}px Syne, sans-serif`;
    const tw       = ctx.measureText(label).width;
    const padding  = 8;

    ctx.fillStyle = 'rgba(3,4,10,0.85)';
    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(x - 1, y - fontSize - padding * 2 - 4, tw + padding * 2 + 2, fontSize + padding * 2, 6)
      : ctx.rect(x - 1, y - fontSize - padding * 2 - 4, tw + padding * 2 + 2, fontSize + padding * 2);
    ctx.fill();

    // Label border
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + padding, y - padding - 4);
  }

  _drawLandmarks(landmarks, sx, sy) {
    if (!landmarks) return;
    const ctx    = this.ctx;
    const points = landmarks.positions;

    // Draw subtle landmark dots
    ctx.fillStyle = 'rgba(0,229,255,0.45)';
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x * sx, pt.y * sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw jaw line, eyes, brows as connected paths
    const groups = [
      { indices: landmarks.getJawOutline().map((_, i) => i),                  pts: landmarks.getJawOutline() },
      { indices: landmarks.getLeftEyeBrow().map((_, i) => i),                 pts: landmarks.getLeftEyeBrow() },
      { indices: landmarks.getRightEyeBrow().map((_, i) => i),                pts: landmarks.getRightEyeBrow() },
      { indices: landmarks.getLeftEye().map((_, i) => i),                     pts: landmarks.getLeftEye() },
      { indices: landmarks.getRightEye().map((_, i) => i),                    pts: landmarks.getRightEye() },
      { indices: landmarks.getNose().map((_, i) => i),                        pts: landmarks.getNose() },
      { indices: landmarks.getMouth().map((_, i) => i),                       pts: landmarks.getMouth() },
    ];

    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth   = 1;
    for (const grp of groups) {
      if (!grp.pts || grp.pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(grp.pts[0].x * sx, grp.pts[0].y * sy);
      for (let i = 1; i < grp.pts.length; i++) {
        ctx.lineTo(grp.pts[i].x * sx, grp.pts[i].y * sy);
      }
      ctx.stroke();
    }
  }
}

// Singleton
const faceDetector = new FaceExpressionDetector(() => {});
