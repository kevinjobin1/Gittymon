# Splash Screen Refactor Spec — "Instant Card Generation"

## Summary
Refactor the `SplashView` to be a single-purpose card generator: enter a GitHub username → generate an exportable Gittymon card instantly. The splash screen becomes a tight, developer-focused onboarding flow that emphasizes the CTA "generate a card" above all else.

---

## 1. Layout & Visual Hierarchy

### 1.1 Three-section vertical layout (top to bottom)

```
┌────────────────────────────┐
│     Demo Card Preview      │  ← pre-rendered animated card (hardcoded example)
│     (existing canvas or    │
│      static GIF for        │
│      'octocat')            │
├────────────────────────────┤
│     Input Field             │  ← single text input + parse logic
│     [github_username____]  │
│     [  GET YOUR BADGE  ]   │  ← prominent CTA button
├────────────────────────────┤
│     Tagline / Footer        │  ← minimal, no history link
└────────────────────────────┘
```

### 1.2 Demo Card Preview
- Hardcoded example: show a pre-generated animated GIF or canvas-rendered card for a well-known username like `octocat` or `torvalds`.
- Renders above the input form, centered, at a reduced scale (fitting within the Gameboy console screen).
- The demo updates live? **No** — it's a static example. It only changes once the user generates their own card.

### 1.3 Input + CTA
- Single text input with placeholder text like `"github-username"` or `"Enter GitHub username..."`.
- Parsing: accepts plain usernames (`kjobin`), GitHub profile URLs (`https://github.com/kjobin`), and @mentions (`@kjobin`).
- CTA button text: **`GET YOUR BADGE`** — large, prominent, Gameboy-styled button.
- Button spans the full width of the input area.

### 1.4 Footer / Tagline
- Replace the current heading (`GITTYMON`, tagline, "SUMMON YOUR GITTYMON") with something minimal.
- Remove the **History** link entirely — history is accessible from the Hub after generating.
- Keep a subtle copyright or version line at the very bottom.

---

## 2. User Flow After Generation

### 2.1 Mini-animation (1–2 seconds)
- After the user hits **GET YOUR BADGE**, show a brief "summoning" or "building" animation (1–2 seconds max).
- Could reuse the existing SummoningView spinner or a simpler in-place transition.
- The animation should feel snappy, not a loading screen.

### 2.2 Land on Export/Embed View
- After the mini-animation, navigate directly to the **ExportEmbedView** showing the generated card.
- Skip the Hub entirely for this flow.

### 2.3 Auto-copy to clipboard
- Immediately after landing on the Export/Embed view, **auto-copy the Markdown badge (GitHub README format)** to the clipboard.
- Show a toast confirming: `"Markdown badge copied! Paste it into your README."`
- This reduces friction — the user's most likely first action is done for them.

---

## 3. Gameboy Aesthetic Preservation
- Keep the full `ConsoleShell` wrapper (Gameboy frame, D-pad, A/B buttons, screen bezel).
- The D-pad and buttons should still work for navigation (e.g., pressing A on the input triggers generation).
- All styling remains within the existing retro Gameboy / monospace / dark theme.
- The input and button should look like they belong in a Gameboy cartridge UI.

---

## 4. Code Changes Required

### 4.1 `SplashView.tsx` — Major refactor
- **Remove:** `GITTYMON` heading, tagline, "SUMMON YOUR" / "GITTYMON" sub-headings, History link, `onViewHistory` prop, `hasHistory` prop.
- **Remove:** the press-start / click-to-summon prompt area.
- **Add:** demo card preview component (hardcoded for `octocat`).
- **Add:** single text input with parsing logic for GitHub URLs, @mentions, plain usernames.
- **Add:** `GET YOUR BADGE` CTA button.
- **Keep:** total width constraint, monospace font, border styling.
- **New prop:** `onGenerate: (username: string) => void` — called when the user submits a valid username.
- **New internal state:** `error` string for invalid input feedback.

### 4.2 Input Parsing Logic
A helper function `parseGitHubUsername(input: string): string | null`:
- Strip leading/trailing whitespace.
- If starts with `@`, strip it: `"@kjobin"` → `"kjobin"`.
- If contains `github.com/`, extract the username segment from the URL: `"https://github.com/kjobin"` → `"kjobin"`.
- Otherwise, treat the raw input as the username.
- Return `null` (or throw) for empty/invalid strings.
- Disallow special characters beyond `[a-zA-Z0-9-]`.

### 4.3 `App.tsx` — Flow changes
- `onGenerate(username)` handler: triggers mini-animation, then navigates to ExportEmbedView.
- Remove or reconfigure the History link in SplashView props — no longer passed.
- The SummoningView may be reused for the 1–2 second mini-animation, or a simpler in-place state transition within SplashView.

### 4.4 `ExportEmbedView.tsx` — Auto-copy on mount
- Add a `useEffect` on mount that auto-copies the Markdown badge code to the clipboard.
- Show a toast: `"Markdown badge copied! Paste it into your README."`
- Ensure this only fires when coming from the splash generation flow (not from the Hub).
- This can be signaled via a new prop like `autoCopy?: boolean` or a navigation state flag.

### 4.5 `ConsoleShell.tsx` — Minimal changes (if any)
- Ensure the input field can receive focus and typing works within the console shell.
- A-button press on the input/CTA area triggers generation.

---

## 5. Design Decisions (from interview)

| Question | Decision |
|----------|----------|
| Primary action | Enter GitHub username → generate card immediately |
| Show preview on splash? | Yes — hardcoded demo card for `octocat` |
| Keep Gameboy aesthetic? | Yes — full ConsoleShell, retro styling |
| Post-generation flow | 1–2 sec mini-animation → Export/Embed view |
| Demo card: live vs hardcoded? | Hardcoded example (`octocat`) |
| Input parsing | GitHub URLs, @mentions, plain usernames |
| Preview position | Above the input (card at top, input below) |
| Auto-copy after generation? | Yes — Markdown badge (GitHub README format) |
| Keep History link on splash? | Remove — accessible from Hub after generating |
| CTA button text | `GET YOUR BADGE` |
| Compact card-URL entries? | (deferred — not scoped to splash refactor) |

---

## 6. What NOT to change
- The Gameboy ConsoleShell wrapper, D-pad, and button hardware visuals.
- The existing ExportEmbedView layout and export options.
- The HubView and its navigation.
- The SummoningView (may be reused but its core logic stays).
- BackgroundMap and audio utilities.
- Server-side routes (`/card/:username`, `/api/badge/:username`, etc.).

---

## 7. Open Questions for Future Iterations
- Should the demo card cycle through multiple example usernames (slideshow)?
- Should we add keyboard shortcut (Enter key) to trigger generation?
- Should the input show a live preview as the user types (debounced)?
- Error handling: what if the GitHub username doesn't exist? Server-side validation?
