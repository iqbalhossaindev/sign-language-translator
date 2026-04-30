/* ═══════════════════════════════════════════════════
   SignAI — Sign Language Data
   ASL alphabet, numbers, and common words
   ═══════════════════════════════════════════════════ */

const SIGN_DATABASE = {

  /* ─── LETTERS ───────────────────────────────────── */
  'A': {
    category: 'letter',
    word: 'A',
    description: 'Closed fist, thumb rests on side',
    // fingers: [thumb, index, middle, ring, pinky] — 1=extended, 0=curled
    pattern: { fingers: [0,0,0,0,0], thumbSide: true },
    confidence_threshold: 0.70
  },
  'B': {
    category: 'letter',
    word: 'B',
    description: 'Four fingers extended upward, thumb folded across palm',
    pattern: { fingers: [0,1,1,1,1] },
    confidence_threshold: 0.75
  },
  'C': {
    category: 'letter',
    word: 'C',
    description: 'Hand curved into a "C" shape',
    pattern: { fingers: [0.5,0.5,0.5,0.5,0.5], curved: true },
    confidence_threshold: 0.65
  },
  'D': {
    category: 'letter',
    word: 'D',
    description: 'Index finger points up, others curl to touch thumb',
    pattern: { fingers: [0,1,0,0,0] },
    confidence_threshold: 0.72
  },
  'E': {
    category: 'letter',
    word: 'E',
    description: 'All fingers bent down at second knuckle',
    pattern: { fingers: [0,0,0,0,0], allCurled: true },
    confidence_threshold: 0.68
  },
  'F': {
    category: 'letter',
    word: 'F',
    description: 'Index and thumb touch to form circle, other fingers up',
    pattern: { fingers: [0,0,1,1,1], thumbIndexTouch: true },
    confidence_threshold: 0.70
  },
  'G': {
    category: 'letter',
    word: 'G',
    description: 'Index and thumb point sideways',
    pattern: { fingers: [1,1,0,0,0], horizontal: true },
    confidence_threshold: 0.68
  },
  'H': {
    category: 'letter',
    word: 'H',
    description: 'Index and middle finger extended, pointing sideways',
    pattern: { fingers: [0,1,1,0,0], horizontal: true },
    confidence_threshold: 0.70
  },
  'I': {
    category: 'letter',
    word: 'I',
    description: 'Pinky finger extended upward',
    pattern: { fingers: [0,0,0,0,1] },
    confidence_threshold: 0.75
  },
  'J': {
    category: 'letter',
    word: 'J',
    description: 'Pinky up (like I), draw a J in the air',
    pattern: { fingers: [0,0,0,0,1] },
    confidence_threshold: 0.65
  },
  'K': {
    category: 'letter',
    word: 'K',
    description: 'Index up, middle angled, thumb between them',
    pattern: { fingers: [1,1,1,0,0] },
    confidence_threshold: 0.70
  },
  'L': {
    category: 'letter',
    word: 'L',
    description: 'L-shape: thumb points out, index points up',
    pattern: { fingers: [1,1,0,0,0] },
    confidence_threshold: 0.75
  },
  'M': {
    category: 'letter',
    word: 'M',
    description: 'Three fingers fold down over thumb',
    pattern: { fingers: [0,0,0,0,0], thumbUnder: true },
    confidence_threshold: 0.65
  },
  'N': {
    category: 'letter',
    word: 'N',
    description: 'Two fingers fold down over thumb',
    pattern: { fingers: [0,0,0,0,0], thumbUnder: true },
    confidence_threshold: 0.65
  },
  'O': {
    category: 'letter',
    word: 'O',
    description: 'All fingers and thumb touch to form O shape',
    pattern: { fingers: [0.5,0.5,0.5,0.5,0.5], oShape: true },
    confidence_threshold: 0.68
  },
  'P': {
    category: 'letter',
    word: 'P',
    description: 'Like K, but pointing downward',
    pattern: { fingers: [1,1,1,0,0], pointDown: true },
    confidence_threshold: 0.65
  },
  'Q': {
    category: 'letter',
    word: 'Q',
    description: 'Like G, but pointing downward',
    pattern: { fingers: [1,1,0,0,0], pointDown: true },
    confidence_threshold: 0.65
  },
  'R': {
    category: 'letter',
    word: 'R',
    description: 'Index and middle fingers crossed',
    pattern: { fingers: [0,1,1,0,0], crossed: true },
    confidence_threshold: 0.70
  },
  'S': {
    category: 'letter',
    word: 'S',
    description: 'Closed fist, thumb over fingers',
    pattern: { fingers: [0,0,0,0,0], thumbOver: true },
    confidence_threshold: 0.68
  },
  'T': {
    category: 'letter',
    word: 'T',
    description: 'Index finger bent with thumb tucked inside',
    pattern: { fingers: [0,0,0,0,0], thumbThrough: true },
    confidence_threshold: 0.65
  },
  'U': {
    category: 'letter',
    word: 'U',
    description: 'Index and middle fingers extended together, pointing up',
    pattern: { fingers: [0,1,1,0,0] },
    confidence_threshold: 0.72
  },
  'V': {
    category: 'letter',
    word: 'V',
    description: 'Index and middle fingers spread in V/peace shape',
    pattern: { fingers: [0,1,1,0,0], spread: true },
    confidence_threshold: 0.72
  },
  'W': {
    category: 'letter',
    word: 'W',
    description: 'Index, middle, ring fingers extended',
    pattern: { fingers: [0,1,1,1,0] },
    confidence_threshold: 0.72
  },
  'X': {
    category: 'letter',
    word: 'X',
    description: 'Index finger hooked/bent',
    pattern: { fingers: [0,0.5,0,0,0], hooked: true },
    confidence_threshold: 0.68
  },
  'Y': {
    category: 'letter',
    word: 'Y',
    description: 'Thumb and pinky extended out, middle fingers down',
    pattern: { fingers: [1,0,0,0,1] },
    confidence_threshold: 0.78
  },
  'Z': {
    category: 'letter',
    word: 'Z',
    description: 'Index finger draws a Z in the air',
    pattern: { fingers: [0,1,0,0,0] },
    confidence_threshold: 0.65
  },

  /* ─── NUMBERS ───────────────────────────────────── */
  '0': {
    category: 'number',
    word: 'Zero',
    description: 'All fingers touch thumb to form O',
    pattern: { fingers: [0.5,0.5,0.5,0.5,0.5], oShape: true },
    confidence_threshold: 0.68
  },
  '1': {
    category: 'number',
    word: 'One',
    description: 'Index finger points up',
    pattern: { fingers: [0,1,0,0,0] },
    confidence_threshold: 0.75
  },
  '2': {
    category: 'number',
    word: 'Two',
    description: 'Index and middle up (peace)',
    pattern: { fingers: [0,1,1,0,0], spread: true },
    confidence_threshold: 0.72
  },
  '3': {
    category: 'number',
    word: 'Three',
    description: 'Thumb, index, middle extended',
    pattern: { fingers: [1,1,1,0,0] },
    confidence_threshold: 0.72
  },
  '4': {
    category: 'number',
    word: 'Four',
    description: 'Four fingers up, thumb tucked',
    pattern: { fingers: [0,1,1,1,1] },
    confidence_threshold: 0.73
  },
  '5': {
    category: 'number',
    word: 'Five',
    description: 'All five fingers spread open',
    pattern: { fingers: [1,1,1,1,1] },
    confidence_threshold: 0.78
  },
  '6': {
    category: 'number',
    word: 'Six',
    description: 'Thumb and pinky touch, others extended',
    pattern: { fingers: [1,1,1,1,1], pinkyThumbTouch: true },
    confidence_threshold: 0.65
  },
  '7': {
    category: 'number',
    word: 'Seven',
    description: 'Thumb and ring finger touch',
    pattern: { fingers: [1,1,1,0.5,1] },
    confidence_threshold: 0.65
  },
  '8': {
    category: 'number',
    word: 'Eight',
    description: 'Thumb and middle finger touch',
    pattern: { fingers: [1,1,0.5,1,1] },
    confidence_threshold: 0.65
  },
  '9': {
    category: 'number',
    word: 'Nine',
    description: 'Thumb and index touch (like F)',
    pattern: { fingers: [0,0,1,1,1], thumbIndexTouch: true },
    confidence_threshold: 0.68
  },

  /* ─── COMMON WORDS ──────────────────────────────── */
  'Hello': {
    category: 'word',
    word: 'Hello',
    description: 'Open hand, fingers together, touch forehead then move out',
    pattern: { fingers: [1,1,1,1,1] },
    confidence_threshold: 0.72
  },
  'Thank You': {
    category: 'word',
    word: 'Thank You',
    description: 'Flat hand from chin moving forward',
    pattern: { fingers: [1,1,1,1,1], flatHand: true },
    confidence_threshold: 0.70
  },
  'Yes': {
    category: 'word',
    word: 'Yes',
    description: 'Fist nodding up and down',
    pattern: { fingers: [0,0,0,0,0] },
    confidence_threshold: 0.65
  },
  'No': {
    category: 'word',
    word: 'No',
    description: 'Index and middle snap to thumb',
    pattern: { fingers: [0,1,1,0,0] },
    confidence_threshold: 0.68
  },
  'Help': {
    category: 'word',
    word: 'Help',
    description: 'Thumbs up hand resting on flat palm, moving up',
    pattern: { fingers: [1,0,0,0,0], thumbUp: true },
    confidence_threshold: 0.70
  },
  'Sorry': {
    category: 'word',
    word: 'Sorry',
    description: 'Closed fist rubbed in circle on chest',
    pattern: { fingers: [0,0,0,0,0] },
    confidence_threshold: 0.65
  },
  'Please': {
    category: 'word',
    word: 'Please',
    description: 'Flat hand rubbed in circle on chest',
    pattern: { fingers: [1,1,1,1,1], flatHand: true },
    confidence_threshold: 0.68
  },
  'I Love You': {
    category: 'word',
    word: 'I Love You',
    description: 'Thumb, index, and pinky extended (ILY handshape)',
    pattern: { fingers: [1,1,0,0,1] },
    confidence_threshold: 0.80
  },
  'Stop': {
    category: 'word',
    word: 'Stop',
    description: 'Open hand, chop down flat',
    pattern: { fingers: [0,1,1,1,1], horizontal: true },
    confidence_threshold: 0.70
  },
  'Water': {
    category: 'word',
    word: 'Water',
    description: 'W hand (3 fingers) tapping chin',
    pattern: { fingers: [0,1,1,1,0] },
    confidence_threshold: 0.68
  },
  'Food': {
    category: 'word',
    word: 'Food',
    description: 'Fingers bunched to thumb, tap mouth twice',
    pattern: { fingers: [0.5,0.5,0.5,0.5,0.5] },
    confidence_threshold: 0.65
  },
  'Good': {
    category: 'word',
    word: 'Good',
    description: 'Open B hand from chin forward and down',
    pattern: { fingers: [0,1,1,1,1] },
    confidence_threshold: 0.70
  },
  'Bad': {
    category: 'word',
    word: 'Bad',
    description: 'Open B hand flips down from chin',
    pattern: { fingers: [0,1,1,1,1] },
    confidence_threshold: 0.68
  },
  'Name': {
    category: 'word',
    word: 'Name',
    description: 'Both H hands, tap dominant on non-dominant',
    pattern: { fingers: [0,1,1,0,0] },
    confidence_threshold: 0.65
  }
};

// Category metadata for UI
const SIGN_CATEGORIES = {
  letter: { label: 'Letters',      icon: '🔤', color: '#3b82f6' },
  number: { label: 'Numbers',      icon: '🔢', color: '#8b5cf6' },
  word:   { label: 'Common Words', icon: '💬', color: '#10b981' }
};

// Quick lookup helpers
const getSignsByCategory = (cat) =>
  Object.entries(SIGN_DATABASE)
    .filter(([,v]) => v.category === cat)
    .map(([k, v]) => ({ id: k, ...v }));

const getAllSigns = () =>
  Object.entries(SIGN_DATABASE).map(([k, v]) => ({ id: k, ...v }));

// Practice word lists per category
const PRACTICE_SETS = {
  letters: Object.keys(SIGN_DATABASE).filter(k => SIGN_DATABASE[k].category === 'letter'),
  numbers: Object.keys(SIGN_DATABASE).filter(k => SIGN_DATABASE[k].category === 'number'),
  words:   Object.keys(SIGN_DATABASE).filter(k => SIGN_DATABASE[k].category === 'word'),
};
