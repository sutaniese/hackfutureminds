# PathWise — Student Module (Core Product)

> This is your part of the project. Your teammate handles Enterprise / Teachers / Parents.
> Everything below is focused exclusively on the student as the primary user.

---

## What You're Building

One seamless AI conversation that delivers three concrete artifacts to a student in under 5 minutes:

```
Onboarding (6–7 questions)
        ↓
  Claude API (single call)
        ↓
┌──────────────────────────────────────┐
│ 1. Career Map (3 paths)              │
│ 2. Financial Route (grants)          │
│ 3. Resume Block (packaged achievem.) │
└──────────────────────────────────────┘
```

---

## Target User

- Student aged 15–18
- Especially from non-elite schools (no career counselor available)
- Doesn't know how to "package" themselves for universities or employers
- Unaware of grants and scholarships
- Chooses a career based on family advice, not market data

---

## Module 1 — Career Choice

### What it does
- User answers 6–7 questions about interests, subjects, achievements
- AI compares the profile against real career trajectories
- Returns **3 career paths** with market salaries in Kazakhstan
- Optional: pulls live job listings from hh.kz via Claude web search tool

### Onboarding Questions
```
1. Which subjects do you enjoy most? (multi-select)
2. What do you do in your free time?
3. Your top achievements? (olympiads, projects, volunteering)
4. Do you prefer working with people, data, hands, or ideas?
5. Where do you want to study — Kazakhstan or abroad?
6. Which city are you considering?
7. Are there any family budget constraints?
```

### UI
- Step-by-step chat interface — each question appears after the previous answer
- Progress bar at the top (Step 1 of 7)
- Large touch zones (mobile-first, min 48×48px)
- Smooth transition animation between questions

---

## Module 2 — Financial Route

### What it does
- Takes data from Module 1 (city, university, profile)
- Calculates the real cost of student life
- Matches relevant grants from the JSON database by profile
- Shows a combination of funding that closes the financial gap

### Example Output
```
Needed:   180,000 KZT/month
Bolashak: 120,000 KZT/month  ✓ eligible
DAAD:      45,000 KZT/month  ✓ eligible
Gap left:  15,000 KZT/month  (8%)
```

### Grant Database (hardcoded JSON, 30+ entries)

```json
[
  {
    "id": "bolashak",
    "name": "Bolashak",
    "amount_kzt": 120000,
    "amount_usd": 800,
    "type": "monthly",
    "eligible": ["top applicants", "master's degree", "studying abroad"],
    "deadline": "November",
    "url": "https://bolashak.gov.kz"
  },
  {
    "id": "daad",
    "name": "DAAD (Germany)",
    "amount_kzt": 45000,
    "amount_usd": 300,
    "type": "monthly",
    "eligible": ["technical fields"],
    "deadline": "October",
    "url": "https://daad.de"
  },
  {
    "id": "erasmus",
    "name": "Erasmus+",
    "amount_eur": 1000,
    "type": "monthly",
    "eligible": ["any field", "partner universities"],
    "deadline": "February",
    "url": "https://erasmus-plus.ec.europa.eu"
  },
  {
    "id": "chevening",
    "name": "Chevening (UK)",
    "amount": "full coverage",
    "type": "full",
    "eligible": ["leadership potential", "master's degree"],
    "deadline": "November",
    "url": "https://chevening.org"
  },
  {
    "id": "nao",
    "name": "NAO Grant (KZ)",
    "amount_kzt": 60000,
    "type": "monthly",
    "eligible": ["olympiad winners", "state universities KZ"],
    "deadline": "July",
    "url": "https://nao.kz"
  },
  {
    "id": "fulbright",
    "name": "Fulbright (USA)",
    "amount": "full coverage",
    "type": "full",
    "eligible": ["humanities", "social sciences", "master's degree"],
    "deadline": "October",
    "url": "https://fulbright.state.gov"
  },
  {
    "id": "stipendium_hungaricum",
    "name": "Stipendium Hungaricum",
    "amount": "full coverage",
    "type": "full",
    "eligible": ["any field", "Hungary"],
    "deadline": "January",
    "url": "https://stipendiumhungaricum.hu"
  }
]
```

---

## Module 3 — Achievement Packaging

### What it does
- User inputs raw achievements in plain language
- AI reformulates them using university/employer language with measurable metrics
- Ready-to-use resume block and motivation letter paragraph — in 30 seconds

### Transformation Examples
```
Input:   "got 2nd place at physics olympiad"
Output:  "Runner-up, National Physics Olympiad (top 3%, 340 participants)"

Input:   "volunteered at an orphanage"
Output:  "Social volunteer (120+ hours, 40+ beneficiaries, Almaty)"

Input:   "built a website for my school"
Output:  "Developed a web platform for an educational institution (500+ users)"
```

---

## API Structure

### POST /api/generate

**Request:**
```json
{
  "interests": ["biology", "chemistry"],
  "achievements": ["2nd place, biology olympiad"],
  "target_university": "NU, Astana",
  "city": "Astana",
  "budget_monthly": 80000,
  "language": "en"
}
```

**Response:**
```json
{
  "career_map": [
    {
      "title": "Biomedical Engineer",
      "salary_kzt": "450,000–700,000",
      "description": "...",
      "vacancies": [{"title": "...", "company": "...", "url": "..."}]
    }
  ],
  "financial_route": {
    "monthly_cost": 180000,
    "grants": [
      {"name": "Bolashak", "amount": 120000, "deadline": "November", "match": "high"}
    ],
    "gap": 60000,
    "coverage_percent": 67
  },
  "portfolio_block": "Runner-up, National Biology Olympiad (top 3%, 340 participants)"
}
```

---

## Wow Features (Student-Only)

### 1. Camera → Resume (Wow Moment #1)
User holds up a handwritten sheet of achievements to the camera.
Claude Vision API reads it and instantly reformats everything.

```javascript
// ~20 lines of code
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Image }},
        { type: "text", text: "Read the achievements from this sheet and reformat each one using professional university/employer language with metrics. Return a JSON array." }
      ]
    }]
  })
});
```

**Estimated build time:** 2–3 hours

---

### 2. Full Voice Onboarding in Kazakh (Wow Moment #2)
The entire flow is completed by voice — zero clicks required.

```javascript
// Input
const recognition = new webkitSpeechRecognition();
recognition.lang = 'kk-KZ'; // or 'ru-RU'
recognition.onresult = (e) => handleAnswer(e.results[0][0].transcript);

// Output
const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'kk-KZ';
  speechSynthesis.speak(utterance);
};
```

**Estimated build time:** 3–4 hours

---

### 3. Live Job Listings from hh.kz
When generating the career map — pulls real vacancies right now.
Use the built-in `web_search` tool in Claude API — no separate scraper needed.

**Estimated build time:** 1–2 hours

---

## Accessibility

### Gesture Control (deaf / hard of hearing users)
Stack: `MediaPipe Hands` — runs in the browser, no server required

| Gesture | Action |
|---------|--------|
| Open palm | Open profile |
| Index finger up | Next step |
| Thumbs down | Go back |
| Closed fist | Confirm |
| V-sign | Help |

### Voice Mode (blind / no hands)
- Web Speech API (input) + SpeechSynthesis (output)
- Toggle from the main screen — not buried in settings
- ARIA attributes on all interactive elements

---

## Gamification (answers jury question: "why would students use this every day?")

| Element | Implementation |
|---------|---------------|
| Onboarding progress bar | Step X of 7, animated |
| "Profile complete" badge | Animation on finishing onboarding |
| Grant match animation | Unlock effect when a grant is found |
| Grant counter | "+3 grants found for you" |
| Portfolio fill level | 0% → 100% as achievements are added |

---

## Hardware

### Raspberry Pi Kiosk
- Pi 4 + monitor + keyboard / touchscreen
- PathWise running in Chromium kiosk mode (`--kiosk --noerrdialogs`)
- Designed for locations without personal computers (rural schools, libraries)

### NFC Portfolio Card
- Student completes onboarding → receives an NFC tag with their profile ID
- Tap card to Pi → Pi loads profile → sends to server
- Pi prints a one-page resume via USB printer
- **Pitch metaphor:** "Your achievements are now physical"

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS |
| AI Engine | Claude API (claude-sonnet-4-20250514) |
| Vision | Claude Vision API |
| Gestures | MediaPipe Hands |
| Voice input | Web Speech API |
| Voice output | SpeechSynthesis API |
| Web search | Claude web_search tool |
| Backend | Next.js API Routes |
| Data | Hardcoded JSON (30+ grants) |


---

## Demo Script (Aigеrim)

Use this exact scenario for the jury demo — do not improvise:

```
Aigerim, 17 years old, Almaty
2nd place, biology olympiad
Wants to study medicine, limited family budget

STEP 1: Holds handwritten achievements sheet to camera → AI reads it instantly
STEP 2: Answers 6 questions in ~3 minutes
STEP 3: Results in 10 seconds:

Career:   Biomedical Engineer · Medical Researcher · Biotechnologist
Finance:  Bolashak ($800) + DAAD ($300) = covers 95% of tuition in Germany
Resume:   "Runner-up, National Biology Olympiad (top 3%, 340 participants)"

STEP 4: Taps NFC card to Pi → Pi prints resume on the spot
```

---

## GitHub

- Commits go **exclusively** to `sutaniese/`
- Commit after every completed block — not at the end
- Volunteer check-ups: **13:00** and **15:00**
- Format: `feat: onboarding chat UI` / `fix: voice mode kk-KZ`
