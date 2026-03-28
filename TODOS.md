# TODOS — World Pulse

## Validation (Day 1, Hour 1)

### Validate Live API + Search Grounding Compatibility
- **What:** Test whether Google Search grounding is available within a Gemini Live API session
- **Why:** The voice scenario simulator relies on Search grounding for real-time geopolitical context. If grounding isn't available in Live API sessions, need a hybrid approach (Live API for audio I/O, separate batch call for grounding, feed results back into the conversation).
- **How to test:** Open a Live API session with `tools=[{"google_search": {}}]` and ask a question requiring current data. If it works, proceed. If not, implement the hybrid approach.
- **Priority:** P0 — blocks voice scenario feature
- **Effort:** S (CC: ~15 min to test)
- **Added:** 2026-03-27 (CEO review)
