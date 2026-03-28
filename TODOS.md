# TODOS — World Pulse

## Validation (Day 1, Hour 1)

### Validate Live API + Search Grounding Compatibility
- **What:** Test whether Google Search grounding is available within a Gemini Live API session
- **Why:** The voice scenario simulator relies on Search grounding for real-time geopolitical context. If grounding isn't available in Live API sessions, need a hybrid approach (Live API for audio I/O, separate batch call for grounding, feed results back into the conversation).
- **How to test:** Open a Live API session with `tools=[{"google_search": {}}]` and ask a question requiring current data. If it works, proceed. If not, implement the hybrid approach.
- **Priority:** P0 — blocks voice scenario feature
- **Effort:** S (CC: ~15 min to test)
- **Added:** 2026-03-27 (CEO review)

---

## Feature Gaps (audited 2026-03-28)

### P0 — Demo-blocking

#### 3D Globe Visualization
- **What:** Replace emoji placeholder in `Globe.tsx` with react-globe.gl implementation
- **Includes:** Auto-rotation, click interaction, dark theme styling
- **Effort:** M

#### Event Markers on Globe
- **What:** Render events as colored dots (green/yellow/orange/red by severity) with click handler
- **Depends on:** Globe visualization
- **Effort:** S

#### Supply Chain Arcs on Globe
- **What:** Golden arcs connecting supply chain nodes; color updates based on node risk level
- **Depends on:** Globe visualization
- **Effort:** S

#### Risk Brief Full Display
- **What:** `RiskBrief.tsx` only renders `executive_summary` — need full report sections: risk matrix table, scenario analysis, recommendations
- **Effort:** M

### P1 — Polish

#### Video Analysis UI
- **What:** `VideoAnalysis.tsx` is a stub — implement split-screen video player + synced event extraction timeline
- **Includes:** `useVideoSync()` hook (currently empty) to track `video.currentTime` and reveal events incrementally
- **Effort:** L

#### Sound Design
- **What:** `SoundManager.tsx` is empty, `/public/sounds/` has no files — add ping on new events, ambient hum during Live API, chime on brief completion
- **Effort:** M

#### Status Bar Waveform
- **What:** `StatusBar.tsx` shows static dots — animate waveform when Live API is active
- **Effort:** S

#### Macro Indicators Panel
- **What:** Spark-line cards for oil price (WTI), shipping cost (BDI), semiconductor price, VIX, USD index using cached data
- **Effort:** M

#### Loading Animations
- **What:** Replace basic "Loading..." text with visual feedback (skeleton loaders, spinners) during Gemini API calls
- **Effort:** S

#### Error Handling UI
- **What:** API failures currently console.log silently — add user-facing error toasts/banners
- **Effort:** S

### P2 — Voice (deferrable)

#### Voice Scenario Input
- **What:** `useGeminiLive()` hook is skeleton — implement WebSocket connection to `/ws/voice`, audio recording via MediaRecorder, base64 encoding
- **Effort:** L

#### Voice-Narrated Briefing
- **What:** One-click audio narration of risk brief using Live API `response_modalities=["AUDIO"]` — backend configured, no frontend UI
- **Effort:** M

#### Event Timeline Sidebar
- **What:** Chronological event view with source evidence viewer — not started
- **Effort:** M
