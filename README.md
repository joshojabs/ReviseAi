# ReviseAI — Full Product Concept Demo

This is a high-fidelity front-end concept for an EPQ artefact exploring:

> To what extent can AI improve personalised revision planning for Level 3 students?

## Included

- Public landing page
- General onboarding for any student
- Course and subject setup
- Confidence, difficulty and assessment-date inputs
- Daily availability
- Normal Period / Revision / Test / Exam modes
- Mode-sensitive priority scoring
- Generated weekly study plan
- Workload reduction / regeneration
- Custom study sessions
- Focus timer with Pomodoro-style study/break calculation
- Audible end-of-segment chime using Web Audio
- Optional browser notifications
- Light and dark focus-oriented themes
- Subject confidence tracking
- Progress dashboard
- Adaptive recommendations
- Settings
- Browser LocalStorage persistence
- Responsive desktop/mobile layout

## Timing logic

The timer uses configurable focus/break lengths (default 25/5). Breaks are counted inside the total planned session time.

Examples with 25/5:
- 30 min = 25 focus + 5 break
- 45 min = 25 focus + 5 break + 15 focus
- 60 min = 25 focus + 5 break + 25 focus + 5 break

## Important prototype limitation

The "AI" layer is currently implemented as a transparent recommendation / priority engine rather than a live language-model API. This is intentional for the concept demo. A final build could replace or augment it with a real model while keeping deterministic guardrails for scheduling.

## Run

Open `index.html` directly in a modern browser, or:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
