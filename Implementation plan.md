# Student Module Implementation Plan

## Ground rules to follow before each work block

Read `rules.md` before writing or editing anything!

- Re-read `rules.md` before writing or editing anything, strictly!.
- Work only inside `hacksteppe/sutaniese`; commits outside that folder are forbidden by `rules.md`.
- Keep the UI strictly mobile-first: 48px+ touch targets, bottom navigation, thumb-friendly layout, APK-like feel.
- Prioritize demo-visible functionality over complex backend work.
- The required memory file from `rules.md` was not found at `/mnt/c/Users/Alpha/Documents/Obsidian Vault/issa/Agent-Memory.md`; check again before implementation and report if still unavailable.

## Open checklist (from plan todos)

- [ ] Create the required app structure and base React/Next/Tailwind setup inside `hacksteppe/sutaniese`.
- [ ] Build mobile-first shell, bottom navigation, shared UI styles, and accessibility baseline.
- [ ] Implement the 7-step student onboarding chat with progress and state handling.
- [ ] Add grant data and `/api/generate` logic for career map, financial route, and resume block.
- [ ] Build results screens, gamification, Aigerim demo mode, and verification steps.

## Implementation order

1. **Scaffold the student app in `hacksteppe/sutaniese`**
   - Create the required structure: `src/`, `public/`, `api/`, and `README.md`.
   - Use the documented stack from `hacksteppe/sutaniese/student_dev_EN.md`: React, Tailwind CSS, and Next.js API-style generation.
   - Add basic scripts for local development, build, lint, and type checking.

2. **Create the mobile shell and navigation**
   - Build a native-feeling mobile layout with a fixed bottom navigation bar.
   - Add primary sections for onboarding, results, grants, portfolio, and accessibility/voice toggles.
   - Establish shared styling tokens for high contrast, large tap areas, rounded cards, and smooth transitions.

3. **Implement the 6–7 step onboarding chat**
   - Use the exact student questions from `hacksteppe/sutaniese/student_dev_EN.md`: subjects, free time, achievements, work preference, study location, city, budget constraints.
   - Show one question at a time with a `Step X of 7` progress bar.
   - Store answers in local state first so the demo works even before real API integration.

4. **Add local data models and grant database**
   - Define structured types for onboarding answers, career paths, grants, financial route, and portfolio output.
   - Add a hardcoded grant JSON database in `api/` with at least the listed grants first, then expand toward 30+ entries if time allows.
   - Include Kazakhstan-relevant fields: amount, deadline, eligibility tags, URL, match reason, and coverage contribution.

5. **Build `/api/generate` behavior**
   - Implement a generation endpoint matching the spec request and response shape from `student_dev_EN.md`.
   - Start with deterministic demo-safe logic: map interests and achievements to 3 career paths, match grants by profile, calculate monthly gap and coverage percent, and package achievements.
   - Keep the Claude API integration behind an environment variable so the product still works without keys during demos.

6. **Build the results experience**
   - Show the three required artifacts in one results screen: Career Map (3 paths, Kazakhstan salary ranges), Financial Route (costs, matched grants, gap, coverage percent), Resume Block (polished statements).
   - Add gamification from the spec: profile completion badge, grant unlock animation, grant counter, and portfolio fill level.

7. **Add Camera to Resume (first wow feature)**
   - Add an image upload/camera capture UI for handwritten achievements.
   - If Claude Vision credentials are available, send the image for extraction and formatting.
   - If not, provide a demo fallback using the Aigerim scenario from the spec.

8. **Add accessibility and localization foundations**
   - Add ARIA labels and screen-reader-friendly structure to all interactive controls.
   - Add high-contrast states and visible focus styles.
   - Structure copy so Kazakh/Russian switching can be added quickly; prioritize Kazakh voice mode if time allows.

9. **Add optional voice onboarding (if time allows)**
   - Use Web Speech API for input and SpeechSynthesis for output.
   - Start with `kk-KZ` and allow fallback to `ru-RU` or English if browser support is limited.
   - Make voice mode accessible from the main screen, not hidden in settings.

10. **Prepare the jury demo path**
    - Seed a demo scenario for Aigerim: 17, Almaty, biology olympiad, medicine interest, limited budget.
    - Add a one-tap “Demo Mode” button that fills the flow and shows the expected career, finance, and resume outputs.
    - Verify the full path completes in under 5 minutes and looks good on a narrow mobile viewport.

11. **Document and verify**
    - Update `README.md` with setup, environment variables, demo script, and feature coverage.
    - Run lint/build checks after implementation.
    - After each major completed work block, remind the user to commit to GitHub with the required format, for example `feat: onboarding chat UI`.

## Suggested build sequence for commits

- `feat: scaffold student app`
- `feat: onboarding chat UI`
- `feat: generate student results`
- `feat: camera resume upload`
- `feat: accessibility and demo mode`
- `chore: document student module`
