# 🤟 SignAI v2 — AI Sign Language & Face Emotion Translator

Real-time ASL sign language translation **plus** facial expression detection — running entirely in your browser. No server. No data leaves your device. Ever.

---

## ✨ What's New in v2

- 😊 **Real-time face expression detection** — Happy, Sad, Angry, Fearful, Disgusted, Surprised, Neutral
- 🎂 **Age estimation** and 👤 **gender detection** live from the camera
- 🎭 **Dedicated Emotions tab** with full-page emotion display and live confidence bars
- 🦴 **Face landmark overlay** — jaw, eyes, brows, nose, mouth drawn on camera feed
- 📦 **PWA manifest** — installable as a mobile/desktop app
- 🗺 **Complete SEO** — sitemap.xml, robots.txt, JSON-LD, Open Graph, Twitter Card

---

## 🚀 Quick Start (No Build Required)

Serve over HTTP — required for camera access and AI model loading:

```bash
# Python
cd sign-language-translator
python3 -m http.server 8080
# → http://localhost:8080

# Node
npx serve .
# → http://localhost:3000
```

> ⚠️ Never open as `file://` — camera APIs require HTTP/HTTPS.

---

## 📁 Project Structure

```
sign-language-translator/
├── index.html          ← Full SEO, all CDN scripts
├── manifest.json       ← PWA installable app config
├── sitemap.xml         ← Search engine sitemap
├── robots.txt          ← Crawler instructions
├── README.md
├── styles/
│   ├── main.css        ← Design system, layout, animations
│   └── face.css        ← Face emotion UI components
└── js/
    ├── signs-data.js   ← ASL database (A-Z, 0-9, 15+ words)
    ├── classifier.js   ← MediaPipe hand gesture classifier
    ├── face-detector.js← face-api.js emotion + age/gender wrapper
    ├── background.js   ← Three.js 3D particle background
    └── app.js          ← React UI (all tabs and components)
```

---

## 🎮 How to Use

### Sign Language
1. **Translate** tab → **Start Camera** → allow permission
2. Hold your hand palm-facing ~40 cm from camera
3. Make an ASL sign — detected instantly with confidence %
4. Signs build into a sentence; click **🔊 Speak** or enable **Auto-speak**

### Face Emotions
1. Start camera → click **😊 Emotion** button
2. Face the camera — emotion detected in real time
3. Switch to **😊 Emotions** tab for the full emotion breakdown

### Practice Mode
1. **Practice** tab → start camera → pick Letters / Numbers / Words
2. Perform the shown sign — live feedback + accuracy score

---

## 🔤 Signs Supported

**Letters:** A–Z (26) · **Numbers:** 0–9 (10) · **Words:** Hello, Thank You, Yes, No, Help, Sorry, Please, I Love You, Stop, Water, Food, Good, Bad, Name (14)

## 😊 Emotions Detected

Happy 😊 · Sad 😢 · Angry 😠 · Fearful 😨 · Disgusted 🤢 · Surprised 😲 · Neutral 😐

---

## 🌐 Deploy to GitHub Pages

1. Push the folder contents (not the folder itself) to a GitHub repo root
2. Settings → Pages → Branch: main → / (root) → Save
3. Replace `yourusername` in `index.html`, `sitemap.xml`, `manifest.json`
4. Live at: `https://yourusername.github.io/repo-name/`

---

## 📦 CDN Dependencies

| Library | Purpose |
|---------|---------|
| Three.js r128 | 3D background |
| React 18 | UI |
| Babel Standalone | JSX in browser |
| MediaPipe Hands 0.4 | Hand tracking |
| face-api.js 0.22.2 | Face + emotions + age/gender |

---

## 🔒 Privacy

All camera processing runs locally in your browser. Zero data transmitted. No analytics. No cookies. No storage of any kind.

---

## ⚠️ Disclaimer

Basic sign recognition — accuracy depends on lighting and angle. Face emotion detection is for accessibility/entertainment, not medical use.

**MIT License** — free to use and modify.
