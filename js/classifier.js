/* ═══════════════════════════════════════════════════
   SignAI — Gesture Classifier
   MediaPipe Hands landmark analysis + sign matching
   ═══════════════════════════════════════════════════ */

/* ─── LANDMARK INDICES ──────────────────────────── */
const LM = {
  WRIST:          0,
  THUMB_CMC:      1, THUMB_MCP:   2, THUMB_IP:    3,  THUMB_TIP:   4,
  INDEX_MCP:      5, INDEX_PIP:   6, INDEX_DIP:   7,  INDEX_TIP:   8,
  MIDDLE_MCP:     9, MIDDLE_PIP:  10, MIDDLE_DIP: 11, MIDDLE_TIP:  12,
  RING_MCP:       13, RING_PIP:  14, RING_DIP:    15, RING_TIP:    16,
  PINKY_MCP:      17, PINKY_PIP: 18, PINKY_DIP:   19, PINKY_TIP:   20
};

/* ─── UTILITY FUNCTIONS ─────────────────────────── */
function dist(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
}

function dist2D(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}

function palmSize(lm) {
  return dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]);
}

/* ─── INDIVIDUAL FINGER STATE DETECTION ─────────── */

// Returns 0 (curled) to 1 (extended) for each finger
// Based on tip-to-wrist distance vs mcp-to-wrist distance ratio
function fingerExtensionScore(lm, tipIdx, pipIdx, mcpIdx) {
  const tipToWrist = dist(lm[LM.WRIST], lm[tipIdx]);
  const mcpToWrist = dist(lm[LM.WRIST], lm[mcpIdx]);
  if (mcpToWrist < 0.0001) return 0;
  const ratio = tipToWrist / mcpToWrist;
  // Normalize: ratio > 1.6 = definitely extended, < 1.1 = curled
  return Math.min(1, Math.max(0, (ratio - 1.1) / 0.5));
}

// Also check if tip is above PIP (y-axis, flipped in screen coords)
function tipAbovePip(lm, tipIdx, pipIdx) {
  return lm[tipIdx].y < lm[pipIdx].y;
}

// Get extension states for all 5 fingers [thumb, index, middle, ring, pinky]
function getFingerExtensions(lm) {
  const palm = palmSize(lm);
  if (palm < 0.0001) return [0,0,0,0,0];

  // Thumb: special case — check distance from tip to index MCP
  const thumbTipToIndexMcp = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]);
  const thumbMcpToIndexMcp = dist(lm[LM.THUMB_MCP], lm[LM.INDEX_MCP]);
  const thumbScore = Math.min(1, Math.max(0, (thumbTipToIndexMcp / thumbMcpToIndexMcp - 0.7) / 0.5));

  const indexScore  = fingerExtensionScore(lm, LM.INDEX_TIP,  LM.INDEX_PIP,  LM.INDEX_MCP);
  const middleScore = fingerExtensionScore(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP, LM.MIDDLE_MCP);
  const ringScore   = fingerExtensionScore(lm, LM.RING_TIP,   LM.RING_PIP,   LM.RING_MCP);
  const pinkyScore  = fingerExtensionScore(lm, LM.PINKY_TIP,  LM.PINKY_PIP,  LM.PINKY_MCP);

  return [thumbScore, indexScore, middleScore, ringScore, pinkyScore];
}

// Boolean extension: is the finger extended?
function fingersBool(scores, threshold = 0.5) {
  return scores.map(s => s > threshold ? 1 : 0);
}

/* ─── ADDITIONAL GESTURE FEATURES ──────────────── */

// Checks if index and middle are spread apart (V vs U)
function fingersSpread(lm) {
  const d = dist2D(lm[LM.INDEX_TIP], lm[LM.MIDDLE_TIP]);
  const palm = palmSize(lm);
  return d / palm > 0.35;
}

// Checks if thumb tip is close to index tip (touch)
function thumbIndexTouch(lm) {
  return dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) < palmSize(lm) * 0.25;
}

// Checks if thumb tip is close to middle tip
function thumbMiddleTouch(lm) {
  return dist(lm[LM.THUMB_TIP], lm[LM.MIDDLE_TIP]) < palmSize(lm) * 0.25;
}

// Checks if thumb and pinky are close
function thumbPinkyTouch(lm) {
  return dist(lm[LM.THUMB_TIP], lm[LM.PINKY_TIP]) < palmSize(lm) * 0.3;
}

// Checks if all fingertips are close together (O or food shape)
function allFingertipsBunched(lm) {
  const center = {
    x: (lm[LM.INDEX_TIP].x + lm[LM.MIDDLE_TIP].x + lm[LM.RING_TIP].x) / 3,
    y: (lm[LM.INDEX_TIP].y + lm[LM.MIDDLE_TIP].y + lm[LM.RING_TIP].y) / 3,
    z: (lm[LM.INDEX_TIP].z + lm[LM.MIDDLE_TIP].z + lm[LM.RING_TIP].z) / 3,
  };
  const palm = palmSize(lm);
  const maxDist = Math.max(
    dist(lm[LM.INDEX_TIP], center),
    dist(lm[LM.MIDDLE_TIP], center),
    dist(lm[LM.RING_TIP], center)
  );
  return maxDist / palm < 0.35;
}

// Checks if hand is oriented horizontally (pointing sideways vs up)
function handHorizontal(lm) {
  const midDir = {
    x: lm[LM.MIDDLE_TIP].x - lm[LM.MIDDLE_MCP].x,
    y: lm[LM.MIDDLE_TIP].y - lm[LM.MIDDLE_MCP].y
  };
  return Math.abs(midDir.x) > Math.abs(midDir.y);
}

// Checks if thumb is pointing up (Help sign)
function thumbUp(lm, scores) {
  return scores[0] > 0.6 && scores[1] < 0.4 && scores[2] < 0.4 && scores[3] < 0.4 && scores[4] < 0.4;
}

/* ─── SIGN PATTERN MATCHING ─────────────────────── */

// Compare detected finger states to a sign pattern
// Returns confidence 0-1
function matchPattern(detected, pattern, features) {
  const { fingers: target } = pattern;
  let totalScore = 0;
  let maxScore = 0;

  // Match each finger
  for (let i = 0; i < 5; i++) {
    const t = target[i];
    const d = detected[i];
    // Weight the match: exact match = 1, proportional reduction for mismatch
    const w = 1.0; // could weight fingers differently
    const score = 1 - Math.abs(t - d);
    totalScore += score * w;
    maxScore += w;
  }

  let confidence = totalScore / maxScore;

  // Apply modifier checks
  if (pattern.spread !== undefined) {
    const actual = features.spread;
    if (pattern.spread && !actual) confidence *= 0.7;
    if (!pattern.spread && actual) confidence *= 0.85;
  }

  if (pattern.thumbIndexTouch) {
    confidence *= features.thumbIndexTouch ? 1.1 : 0.7;
    confidence = Math.min(confidence, 1);
  }

  if (pattern.oShape) {
    confidence *= features.bunched ? 1.15 : 0.6;
    confidence = Math.min(confidence, 1);
  }

  if (pattern.thumbUp && features.thumbUp) {
    confidence *= 1.2;
    confidence = Math.min(confidence, 1);
  }

  if (pattern.thumbSide) {
    // A sign: fist + thumb on side (not over, not extended fully)
    if (detected[0] > 0.2 && detected[0] < 0.7) confidence *= 1.1;
  }

  return Math.min(confidence, 1);
}

/* ─── SMART DISAMBIGUATION ──────────────────────── */

// Some signs look very similar in finger extension alone.
// This function uses extra features to break ties.
function disambiguate(topMatches, lm, scores) {
  if (topMatches.length < 2) return topMatches;

  const [first, second] = topMatches;
  const spread = fingersSpread(lm);
  const tiTouch = thumbIndexTouch(lm);

  // V vs U: both have index+middle. V is spread, U is together.
  if ((first.id === 'V' || first.id === 'U') && (second.id === 'V' || second.id === 'U')) {
    if (spread) {
      const vIdx = topMatches.findIndex(m => m.id === 'V');
      const uIdx = topMatches.findIndex(m => m.id === 'U');
      if (vIdx >= 0) topMatches[vIdx].confidence *= 1.25;
      if (uIdx >= 0) topMatches[uIdx].confidence *= 0.75;
    } else {
      const uIdx = topMatches.findIndex(m => m.id === 'U');
      const vIdx = topMatches.findIndex(m => m.id === 'V');
      if (uIdx >= 0) topMatches[uIdx].confidence *= 1.25;
      if (vIdx >= 0) topMatches[vIdx].confidence *= 0.75;
    }
  }

  // L vs G: both have thumb+index.
  // L: index points up, G: points sideways
  if ((first.id === 'L' || first.id === 'G') && (second.id === 'L' || second.id === 'G')) {
    const horiz = handHorizontal(lm);
    if (horiz) {
      const gIdx = topMatches.findIndex(m => m.id === 'G');
      if (gIdx >= 0) topMatches[gIdx].confidence *= 1.3;
    } else {
      const lIdx = topMatches.findIndex(m => m.id === 'L');
      if (lIdx >= 0) topMatches[lIdx].confidence *= 1.3;
    }
  }

  // B vs 4: both have 4 fingers up
  if ((first.id === 'B' || first.id === '4') && (second.id === 'B' || second.id === '4')) {
    // Check thumb: B has thumb tucked, 4 has thumb more visible
    if (scores[0] > 0.4) {
      const idx = topMatches.findIndex(m => m.id === '4');
      if (idx >= 0) topMatches[idx].confidence *= 1.2;
    } else {
      const idx = topMatches.findIndex(m => m.id === 'B');
      if (idx >= 0) topMatches[idx].confidence *= 1.2;
    }
  }

  // Sort again after disambiguation
  topMatches.sort((a, b) => b.confidence - a.confidence);
  return topMatches;
}

/* ─── MAIN CLASSIFIER ───────────────────────────── */

function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { sign: null, confidence: 0, word: '', category: '' };
  }

  const lm = landmarks;

  // Get finger extension scores
  const scores = getFingerExtensions(lm);

  // Compute feature flags
  const features = {
    spread:         fingersSpread(lm),
    thumbIndexTouch:thumbIndexTouch(lm),
    thumbMiddleTouch:thumbMiddleTouch(lm),
    thumbPinkyTouch: thumbPinkyTouch(lm),
    bunched:        allFingertipsBunched(lm),
    horizontal:     handHorizontal(lm),
    thumbUp:        thumbUp(lm, scores)
  };

  // Match against all signs in database
  const results = [];

  for (const [id, sign] of Object.entries(SIGN_DATABASE)) {
    const conf = matchPattern(scores, sign.pattern, features);
    if (conf > 0.4) {
      results.push({ id, confidence: conf, word: sign.word, category: sign.category, ...sign });
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // Disambiguate top candidates
  const top5 = results.slice(0, 5);
  const disambiguated = disambiguate(top5, lm, scores);
  disambiguated.sort((a, b) => b.confidence - a.confidence);

  if (disambiguated.length === 0) {
    return { sign: null, confidence: 0, word: '?', category: '' };
  }

  const best = disambiguated[0];
  const threshold = SIGN_DATABASE[best.id]?.confidence_threshold ?? 0.70;

  // Require confidence above sign-specific threshold
  if (best.confidence < threshold) {
    return { sign: null, confidence: best.confidence, word: '?', category: '', uncertain: true };
  }

  return {
    sign:       best.id,
    confidence: best.confidence,
    word:       best.word,
    category:   best.category,
    uncertain:  false,
    rawScores:  scores,
    features
  };
}

/* ─── SMOOTHING / DEBOUNCE ──────────────────────── */

class GestureSmooth {
  constructor(windowSize = 10, requiredCount = 6) {
    this.window   = [];
    this.windowSz = windowSize;
    this.required = requiredCount;
    this.lastSign = null;
    this.lockFrames = 0;
    this.lockDuration = 15; // frames to hold before new sign
  }

  push(result) {
    if (this.lockFrames > 0) {
      this.lockFrames--;
      return { ...result, sign: this.lastSign, locked: true };
    }

    this.window.push(result);
    if (this.window.length > this.windowSz) this.window.shift();

    if (this.window.length < 3) return result;

    // Count votes for each sign in window
    const votes = {};
    let totalConf = 0;
    let count = 0;
    for (const r of this.window) {
      if (r.sign) {
        votes[r.sign] = (votes[r.sign] || 0) + 1;
        totalConf += r.confidence;
        count++;
      }
    }

    if (count === 0) return { sign: null, confidence: 0, word: '?', uncertain: true };

    // Find winner
    let bestSign = null, bestVotes = 0;
    for (const [sign, v] of Object.entries(votes)) {
      if (v > bestVotes) { bestVotes = v; bestSign = sign; }
    }

    if (bestVotes < this.required) {
      return { sign: null, confidence: totalConf / count, uncertain: true };
    }

    // Stable sign found
    const avgConf = totalConf / count;

    if (bestSign !== this.lastSign) {
      this.lastSign = bestSign;
      this.lockFrames = this.lockDuration;
    }

    return {
      sign:       bestSign,
      confidence: avgConf,
      word:       SIGN_DATABASE[bestSign]?.word ?? bestSign,
      category:   SIGN_DATABASE[bestSign]?.category ?? '',
      uncertain:  false
    };
  }

  reset() {
    this.window = [];
    this.lastSign = null;
    this.lockFrames = 0;
  }
}

/* ─── MEDIAPIPE INTEGRATION ─────────────────────── */

class HandTracker {
  constructor(onResult) {
    this.onResult  = onResult;   // callback(result, landmarks)
    this.hands     = null;
    this.camera    = null;
    this.smoother  = new GestureSmooth(12, 7);
    this.isRunning = false;
    this.overlayCtx = null;
    this.videoEl    = null;
    this.overlayCanvas = null;
  }

  async init(videoEl, overlayCanvas) {
    this.videoEl = videoEl;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');

    // Wait for MediaPipe to load
    let attempts = 0;
    while (typeof Hands === 'undefined' && attempts++ < 20) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (typeof Hands === 'undefined') {
      console.error('MediaPipe Hands failed to load');
      return false;
    }

    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
    });

    this.hands.setOptions({
      maxNumHands:       1,
      modelComplexity:   1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence:  0.6
    });

    this.hands.onResults((results) => this._processResults(results));
    return true;
  }

  _processResults(results) {
    if (!this.isRunning) return;

    // Sync canvas size to video
    const vw = this.videoEl.videoWidth  || 640;
    const vh = this.videoEl.videoHeight || 480;
    if (this.overlayCanvas.width !== vw || this.overlayCanvas.height !== vh) {
      this.overlayCanvas.width  = vw;
      this.overlayCanvas.height = vh;
    }

    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      const smoothed = this.smoother.push({ sign: null, confidence: 0, word: '', uncertain: true });
      this.onResult(smoothed, null);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];

    // Draw landmarks if DrawingUtils available
    if (typeof drawConnectors !== 'undefined' && typeof drawLandmarks !== 'undefined') {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: 'rgba(0,229,255,0.5)',
        lineWidth: 2
      });
      drawLandmarks(ctx, landmarks, {
        color: 'rgba(0,229,255,0.9)',
        lineWidth: 1,
        radius: 3
      });
    } else {
      // Fallback drawing
      this._drawLandmarksFallback(ctx, landmarks);
    }

    // Classify
    const raw    = classifyGesture(landmarks);
    const result = this.smoother.push(raw);
    this.onResult(result, landmarks);
  }

  _drawLandmarksFallback(ctx, landmarks) {
    const W = this.overlayCanvas.width;
    const H = this.overlayCanvas.height;

    // Draw connections manually
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [9,10],[10,11],[11,12],
      [13,14],[14,15],[15,16],
      [17,18],[18,19],[19,20],
      [0,17],[5,9],[9,13],[13,17]
    ];

    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.lineWidth = 2;
    for (const [a,b] of connections) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * W, landmarks[a].y * H);
      ctx.lineTo(landmarks[b].x * W, landmarks[b].y * H);
      ctx.stroke();
    }

    // Draw dots
    for (let i = 0; i < landmarks.length; i++) {
      ctx.beginPath();
      ctx.arc(landmarks[i].x * W, landmarks[i].y * H, 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#00e5ff' : 'rgba(0,229,255,0.8)';
      ctx.fill();
    }
  }

  async startCamera(videoEl, facingMode = 'user') {
    this.videoEl = videoEl;

    if (typeof Camera !== 'undefined') {
      // Use MediaPipe Camera utility
      if (this.camera) {
        this.camera.stop();
        this.camera = null;
      }
      this.camera = new Camera(videoEl, {
        onFrame: async () => {
          if (this.hands && this.isRunning) {
            await this.hands.send({ image: videoEl });
          }
        },
        width: 640,
        height: 480,
        facingMode
      });
      await this.camera.start();
    } else {
      // Fallback: getUserMedia directly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      this._startProcessingLoop();
    }

    this.isRunning = true;
    this.smoother.reset();
  }

  _startProcessingLoop() {
    const loop = async () => {
      if (!this.isRunning) return;
      if (this.hands && this.videoEl.readyState >= 2) {
        await this.hands.send({ image: this.videoEl });
      }
      setTimeout(loop, 66); // ~15fps for performance
    };
    loop();
  }

  stop() {
    this.isRunning = false;
    if (this.camera) {
      try { this.camera.stop(); } catch(e){}
      this.camera = null;
    }
    if (this.videoEl && this.videoEl.srcObject) {
      this.videoEl.srcObject.getTracks().forEach(t => t.stop());
      this.videoEl.srcObject = null;
    }
    this.smoother.reset();
    if (this.overlayCtx && this.overlayCanvas) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  // Classify a single image (for upload mode)
  async classifyImage(imageEl) {
    if (!this.hands) {
      const ok = await this.init(imageEl, document.createElement('canvas'));
      if (!ok) return null;
    }

    return new Promise((resolve) => {
      const tempHands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
      });
      tempHands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      tempHands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const raw = classifyGesture(results.multiHandLandmarks[0]);
          resolve(raw);
        } else {
          resolve({ sign: null, confidence: 0, word: 'No hand detected', uncertain: true });
        }
        tempHands.close();
      });
      tempHands.send({ image: imageEl }).catch(() => resolve(null));
    });
  }
}

// Singleton tracker instance
const handTracker = new HandTracker(() => {});
