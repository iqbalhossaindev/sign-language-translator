/* ═══════════════════════════════════════════════════
   SignAI — Face Expression Detector v2
   • face-api.js emotion + age + gender
   • TEXT MIRROR FIX: ctx is counter-flipped before
     drawing any text so labels are always readable
   • Sci-Fi HUD overlay: corner brackets, scan line,
     data readout, landmark mesh
   ═══════════════════════════════════════════════════ */

const FACE_MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

/* ─── EXPRESSION META ────────────────────────────── */
const EXPRESSION_META = {
  happy:     { label: 'Happy',     emoji: '😊', color: '#f59e0b', desc: 'Smile detected'      },
  sad:       { label: 'Sad',       emoji: '😢', color: '#3b82f6', desc: 'Downward expression'  },
  angry:     { label: 'Angry',     emoji: '😠', color: '#ef4444', desc: 'Tension detected'     },
  fearful:   { label: 'Fearful',   emoji: '😨', color: '#8b5cf6', desc: 'Fear expression'      },
  disgusted: { label: 'Disgusted', emoji: '🤢', color: '#10b981', desc: 'Disgust detected'     },
  surprised: { label: 'Surprised', emoji: '😲', color: '#00e5ff', desc: 'Raised brows'         },
  neutral:   { label: 'Neutral',   emoji: '😐', color: '#8b99b8', desc: 'Calm expression'      },
};

/* ─── SMOOTH EXPRESSION BUFFER ───────────────────── */
class ExpressionSmoother {
  constructor(windowSize = 8) { this.buffer = []; this.size = windowSize; }

  push(expressions) {
    this.buffer.push(expressions);
    if (this.buffer.length > this.size) this.buffer.shift();
    const avg = {};
    for (const key of Object.keys(EXPRESSION_META)) avg[key] = 0;
    for (const frame of this.buffer)
      for (const key of Object.keys(EXPRESSION_META))
        avg[key] += (frame[key] || 0);
    const n = this.buffer.length;
    for (const key of Object.keys(avg)) avg[key] /= n;
    return avg;
  }

  reset() { this.buffer = []; }
}

/* ═══════════════════════════════════════════════════
   FACE DETECTOR CLASS
   ═══════════════════════════════════════════════════ */
class FaceExpressionDetector {
  constructor(onResult) {
    this.onResult     = onResult;
    this.isRunning    = false;
    this.modelsLoaded = false;
    this.smoother     = new ExpressionSmoother(8);
    this.loopTimer    = null;
    this.videoEl      = null;
    this.canvasEl     = null;
    this.ctx          = null;
    this._loading     = false;
    this._scanY       = 0; // animated scan line position
  }

  async loadModels() {
    if (this.modelsLoaded) return true;
    if (this._loading)     return false;
    this._loading = true;
    try {
      let attempts = 0;
      while (typeof faceapi === 'undefined' && attempts++ < 30)
        await new Promise(r => setTimeout(r, 300));
      if (typeof faceapi === 'undefined') throw new Error('face-api.js not loaded');

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
    if (this.ctx && this.canvasEl)
      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
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

      // Sync canvas dimensions to video
      const vw = video.videoWidth  || 640;
      const vh = video.videoHeight || 480;
      if (this.canvasEl.width !== vw || this.canvasEl.height !== vh) {
        this.canvasEl.width  = vw;
        this.canvasEl.height = vh;
      }

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceExpressions()
        .withAgeAndGender();

      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);

      if (!detections || detections.length === 0) {
        this._drawNoFaceHUD();
        this.onResult({ expression: null, confidence: 0, all: null, noFace: true });
        this.loopTimer = setTimeout(() => this._loop(), 200);
        return;
      }

      const det       = detections[0];
      const raw       = det.expressions;
      const smoothed  = this.smoother.push(raw);

      let best = 'neutral', bestConf = 0;
      for (const [key, val] of Object.entries(smoothed))
        if (val > bestConf) { bestConf = val; best = key; }

      const sx = this.canvasEl.width  / (video.videoWidth  || 640);
      const sy = this.canvasEl.height / (video.videoHeight || 480);

      this._drawLandmarks(det.landmarks, sx, sy);
      this._drawFaceHUD(det.detection.box, best, bestConf, det.age, det.gender, det.genderProbability, sx, sy);

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

    } catch (e) { /* silent frame error */ }

    this.loopTimer = setTimeout(() => this._loop(), 100);
  }

  /* ─────────────────────────────────────────────────
     TEXT MIRROR FIX
     The canvas CSS has scaleX(-1) to match the
     mirrored video feed. Any text drawn normally
     would appear backwards. We counter-flip the
     canvas context matrix just for text blocks so
     text renders left-to-right and is readable.

     Usage pattern:
       ctx.save();
       this._flipForText();        // counter-flip
       ctx.fillText(str, flippedX, y);
       ctx.restore();

     flippedX = canvasWidth - originalX - textWidth
  ─────────────────────────────────────────────────── */
  _flipForText() {
    const W = this.canvasEl.width;
    this.ctx.transform(-1, 0, 0, 1, W, 0);
  }

  /* Converts a canvas-space X to its text-space X after flip */
  _tx(x, textWidth = 0) {
    return this.canvasEl.width - x - textWidth;
  }

  /* ─── SCI-FI FACE HUD ────────────────────────── */
  _drawFaceHUD(box, expression, confidence, age, gender, genderConf, sx, sy) {
    const ctx   = this.ctx;
    const meta  = EXPRESSION_META[expression] || EXPRESSION_META.neutral;
    const color = meta.color;
    const W     = this.canvasEl.width;
    const H     = this.canvasEl.height;

    const x = box.x * sx;
    const y = box.y * sy;
    const w = box.width  * sx;
    const h = box.height * sy;

    /* -- outer glow rect -- */
    ctx.shadowColor = color;
    ctx.shadowBlur  = 20;
    ctx.strokeStyle = color + '55';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.shadowBlur  = 0;

    /* -- main face rect -- */
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    /* -- animated scan line inside box -- */
    this._scanY += 3;
    if (this._scanY > h) this._scanY = 0;
    const scanGrad = ctx.createLinearGradient(x, y + this._scanY - 6, x, y + this._scanY + 6);
    scanGrad.addColorStop(0,   'transparent');
    scanGrad.addColorStop(0.5, color + '88');
    scanGrad.addColorStop(1,   'transparent');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(x, y + this._scanY - 6, w, 12);

    /* -- corner L-brackets (sci-fi style) -- */
    const cs = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;
    const brackets = [
      // [startX, startY, dx1, dy1, dx2, dy2] — corner lines
      [x,   y,   cs,  0,  0,  cs],   // top-left
      [x+w, y,  -cs,  0,  0,  cs],   // top-right
      [x,   y+h, cs,  0,  0, -cs],   // bottom-left
      [x+w, y+h,-cs,  0,  0, -cs],   // bottom-right
    ];
    for (const [bx, by, ddx, , , ddy] of brackets) {
      ctx.beginPath();
      ctx.moveTo(bx + ddx, by);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + ddy);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    /* -- corner dot accents -- */
    ctx.fillStyle = color;
    for (const [bx, by] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]) {
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    /* -- TOP LABEL: Emoji + Expression + Confidence --
       The canvas is CSS scaleX(-1). We counter-flip
       the context so text renders left-to-right.       */
    const fontSize  = 13;
    const padding   = 10;
    const labelText = `${meta.emoji} ${meta.label.toUpperCase()}`;
    const confText  = `${Math.round(confidence * 100)}%`;

    ctx.font = `700 ${fontSize}px "DM Mono", monospace`;

    // Measure text in normal space
    const labelW = ctx.measureText(labelText).width;
    const confW  = ctx.measureText(confText).width;
    const boxW   = labelW + confW + padding * 3 + 8;
    const boxH   = fontSize + padding * 2;

    // Canvas-space origin of the label box (above face rect, left edge aligned)
    const labelBoxX = x;
    const labelBoxY = y - boxH - 6;

    // Draw the label background rectangle (no flip needed — it's a rect)
    ctx.fillStyle   = 'rgba(3,4,10,0.88)';
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(labelBoxX, labelBoxY, boxW, boxH, 4);
      ctx.fill();
    } else {
      ctx.fillRect(labelBoxX, labelBoxY, boxW, boxH);
    }
    ctx.shadowBlur = 0;

    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(labelBoxX, labelBoxY, boxW, boxH, 4);
      ctx.stroke();
    } else {
      ctx.strokeRect(labelBoxX, labelBoxY, boxW, boxH);
    }

    // LEFT separator line inside label box
    ctx.strokeStyle = color + '44';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(labelBoxX + labelW + padding * 2, labelBoxY + 4);
    ctx.lineTo(labelBoxX + labelW + padding * 2, labelBoxY + boxH - 4);
    ctx.stroke();

    /* ── DRAW TEXT (counter-flipped) ── */
    const textBaseY = labelBoxY + padding + fontSize - 2;

    ctx.save();
    this._flipForText(); // apply counter-flip: transform(-1,0,0,1,W,0)

    // Label text (left side of label box)
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${fontSize}px "DM Mono", monospace`;
    // In flipped space: original canvas X → W - X - textWidth
    ctx.fillText(labelText, this._tx(labelBoxX + padding, labelW), textBaseY);

    // Confidence text (right side, colored)
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px "DM Mono", monospace`;
    ctx.fillText(confText, this._tx(labelBoxX + labelW + padding * 2 + padding, confW), textBaseY);

    ctx.restore();

    /* -- BOTTOM DATA STRIP: age + gender -- */
    if (age || gender) {
      const dataLines = [];
      if (age)    dataLines.push(`AGE ~${Math.round(age)}`);
      if (gender) dataLines.push(`${gender.toUpperCase()} ${Math.round((genderConf||0)*100)}%`);
      const dataText  = dataLines.join('  ·  ');
      const dataFontS = 11;
      ctx.font = `500 ${dataFontS}px "DM Mono", monospace`;
      const dataW   = ctx.measureText(dataText).width;
      const dataH   = dataFontS + 12;
      const dataBX  = x;
      const dataBY  = y + h + 6;

      ctx.fillStyle = 'rgba(3,4,10,0.80)';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(dataBX, dataBY, dataW + 20, dataH, 4);
        ctx.fill();
      } else {
        ctx.fillRect(dataBX, dataBY, dataW + 20, dataH);
      }
      ctx.strokeStyle = color + '55';
      ctx.lineWidth   = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(dataBX, dataBY, dataW + 20, dataH, 4);
        ctx.stroke();
      } else {
        ctx.strokeRect(dataBX, dataBY, dataW + 20, dataH);
      }

      ctx.save();
      this._flipForText();
      ctx.fillStyle = color + 'cc';
      ctx.font = `500 ${dataFontS}px "DM Mono", monospace`;
      ctx.fillText(dataText, this._tx(dataBX + 10, dataW), dataBY + dataFontS + 5);
      ctx.restore();
    }

    /* -- CORNER HUD READOUT (top-right of canvas) --
       Shows global status: FACE LOCK · SCANNING      */
    const hudText  = '◈ FACE LOCK';
    const hudFont  = 10;
    ctx.font = `600 ${hudFont}px "DM Mono", monospace`;
    const hudW = ctx.measureText(hudText).width;

    ctx.fillStyle   = 'rgba(3,4,10,0.75)';
    ctx.strokeStyle = color + '66';
    ctx.lineWidth   = 1;
    const hudX = W - hudW - 28;
    const hudY = 10;
    ctx.fillRect(hudX, hudY, hudW + 18, hudFont + 10);
    ctx.strokeRect(hudX, hudY, hudW + 18, hudFont + 10);

    ctx.save();
    this._flipForText();
    ctx.fillStyle = color;
    ctx.font = `600 ${hudFont}px "DM Mono", monospace`;
    // Visual right edge = W - hudX - hudW - 18; flip it
    ctx.fillText(hudText, this._tx(hudX + 9, hudW), hudY + hudFont + 2);
    ctx.restore();
  }

  /* ─── NO FACE HUD ────────────────────────────── */
  _drawNoFaceHUD() {
    const ctx = this.ctx;
    const W   = this.canvasEl.width;
    const H   = this.canvasEl.height;
    if (!W || !H) return;

    const text  = '◌ SCANNING…';
    const fSize = 11;
    ctx.font = `500 ${fSize}px "DM Mono", monospace`;
    const tw  = ctx.measureText(text).width;
    const bW  = tw + 24;
    const bH  = fSize + 14;
    const bX  = (W - bW) / 2;
    const bY  = H / 2 - bH / 2;

    ctx.fillStyle   = 'rgba(3,4,10,0.7)';
    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeRect(bX, bY, bW, bH);

    ctx.save();
    this._flipForText();
    ctx.fillStyle = 'rgba(0,229,255,0.6)';
    ctx.font = `500 ${fSize}px "DM Mono", monospace`;
    ctx.fillText(text, this._tx(bX + 12, tw), bY + fSize + 4);
    ctx.restore();
  }

  /* ─── LANDMARK MESH ──────────────────────────── */
  _drawLandmarks(landmarks, sx, sy) {
    if (!landmarks) return;
    const ctx    = this.ctx;
    const points = landmarks.positions;

    // Neon dot per landmark
    for (let i = 0; i < points.length; i++) {
      const px = points[i].x * sx;
      const py = points[i].y * sy;
      ctx.beginPath();
      ctx.arc(px, py, i === 0 ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#00e5ff' : 'rgba(0,229,255,0.5)';
      ctx.fill();
    }

    // Connected feature groups with subtle neon lines
    const groups = [
      landmarks.getJawOutline(),
      landmarks.getLeftEyeBrow(),
      landmarks.getRightEyeBrow(),
      landmarks.getLeftEye(),
      landmarks.getRightEye(),
      landmarks.getNose(),
      landmarks.getMouth(),
    ];

    ctx.strokeStyle = 'rgba(0,229,255,0.22)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 2]);
    for (const grp of groups) {
      if (!grp || grp.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(grp[0].x * sx, grp[0].y * sy);
      for (let i = 1; i < grp.length; i++)
        ctx.lineTo(grp[i].x * sx, grp[i].y * sy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

// Singleton
const faceDetector = new FaceExpressionDetector(() => {});
