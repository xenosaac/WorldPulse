# World Pulse

AI-powered global intelligence platform for supply chain risk assessment.

## What it does

World Pulse monitors global events in real-time and translates geopolitical developments into actionable supply chain risk assessments.

- **Real-time video analysis** — Gemini Live API watches news footage and extracts structured intelligence events as they happen
- **Interactive 3D globe** — Visualize events, supply chain routes, and risk zones on an interactive globe
- **Voice-powered scenario simulation** — Speak a scenario ("What if China blockades Taiwan?") and hear Gemini's analysis while watching cascading effects on the globe
- **AI-narrated risk briefs** — One-click structured risk assessments narrated by Gemini

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, react-globe.gl
- **Backend**: Python FastAPI
- **AI**: Google Gemini 2.0 (Live API for real-time streaming, Flash for analysis, Pro for synthesis)
- **Database**: SQLite

## Gemini Capabilities

| Capability | Feature |
|-----------|---------|
| Multimodal (video) | Real-time news video analysis |
| Search Grounding | Live geopolitical context for scenarios |
| Multi-source Synthesis | Risk brief generation from diverse data |
| Live API Streaming | Real-time event extraction + voice interaction |
| Audio I/O | Voice scenario input + narrated briefings |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API key

### Setup

```bash
# 1. Clone
git clone https://github.com/xenosaac/WorldPulse.git
cd WorldPulse

# 2. Backend
cp .env.example .env          # Add your GEMINI_API_KEY
cd backend
pip install -r requirements.txt
python seed.py                 # Seed database with demo data
uvicorn main:app --reload      # Starts on http://localhost:8000

# 3. Desktop App (new terminal)
cd frontend
npm install
npm run desktop                # Launches native macOS app
```

> `npm run desktop` starts Next.js and opens Electron automatically. No browser needed.

### Verify
```bash
curl http://localhost:8000/api/events          # Should return 5 events
curl http://localhost:8000/api/supply-chains   # Should return 1 chain with 5 nodes
python backend/check_demo.py                   # Pre-demo validation
```

## Project Structure

```
backend/
  main.py              # FastAPI app
  db.py                # SQLite schema + helpers
  seed.py              # Seed database from data/seed.json
  routes/              # API route handlers
  services/            # Gemini API integration (batch + live)
frontend/
  src/app/             # Next.js pages
  src/components/      # React components (Globe, panels, etc.)
  src/hooks/           # Custom hooks (events, video sync, voice)
  src/lib/             # API client + types
data/
  seed.json            # Pre-cached events + supply chain data
```

## Component Status

| Component | Status | Priority |
|-----------|--------|----------|
| Globe (react-globe.gl) | Stub | P0 |
| Video Analysis + Sync | Stub | P0 |
| Scenario Simulator (text) | Stub | P0 |
| Risk Brief Generator | Stub | P0 |
| Supply Chain Overlay | Stub | P0 |
| Gemini Batch Integration | Stub | P0 |
| Status Bar + Waveform | Stub | P1 |
| Sound Design | Stub | P1 |
| Voice Scenario (Live API) | Stub | P2 |
| Voice Briefing (Live API) | Stub | P2 |

## License

MIT
