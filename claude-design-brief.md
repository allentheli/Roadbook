# Using Claude Design on Roadbook (formerly ONCourse; written for v0.5)

## Workflow

1. The site is live on GitHub Pages. In Claude Design (claude.ai/design), start a project and either **link the GitHub repository** or use **web capture** on the live landing page so it inherits the real typography, colors, and components.
2. Paste the prompt below. Iterate on the logo first, then the landing page refinements, then About.
3. Export as HTML and SVG and hand the files to Claude Code (or back to me) to integrate. **Do not let Claude Design regenerate `app.html`** — the timeline engine, print fitting, and share links live there. If you want app-side changes, ask it for a design system (tokens, component styles) and have Claude Code apply them.
4. Two constraints to keep: the site serves its own fonts from `/fonts` and makes no third-party requests, so no Google Fonts links, external icon sets, or scripts may be introduced; and the treatment-type colors are semantic and fixed.

## Prompt to paste

> You are refining the visual design of ONCourse, a free tool that lets oncologists turn a cancer treatment plan into a one-page "map" for patients: the whole course of treatment, its decision points, and what comes next. Audience: people living with cancer and their families first; physicians second. The feeling to hit: quiet, premium, trustworthy, and personal, like a beautifully typeset letter from your doctor, not a SaaS dashboard.
>
> Keep the existing design system exactly: Source Serif 4 (weights 500 and 600) for headlines and the wordmark, Atkinson Hyperlegible (400, 700) for everything else, both self-hosted from `/fonts` (do not add Google Fonts or any external asset); deep navy ink (#172033) on white with one cobalt accent (#2F55D4); treatment-type colors are semantic and must not change (chemotherapy #3457D5, immunotherapy #0E9F8E, targeted #7A4FD6, hormone #C48A16, radiation #E0603C, surgery #172033, surveillance #4C9A5B). Generous whitespace, left-aligned, restrained. No gradients on text, no glassmorphism, no stock photos, no emoji, no third-party scripts.
>
> The landing page structure is settled and should stay in this order: hero with the real product screenshot, trust bar, one-line problem statement, calendar-versus-map comparison, "what is a treatment map" with the plan/calendar/map triad and the "not a patient portal" table, decision points, three-step how-it-works, patients and physicians side by side, pathway gallery, "why a map" evidence, founder note, privacy, closing proposition. Your job is visual refinement within that structure, not restructuring.
>
> Tasks, in order:
> 1. **Logo.** The wordmark is ONCourse in Source Serif 4, ONC in the same weight as the rest. The O is a globe: a circle with meridians and parallels as fine lines, reading as a globe and a map at 24 px and at 200 px. Explore the globe alone with no route line, then as an alternative a single quiet great-circle arc with a small destination marker. The ring must stay the heaviest line so the letterform reads as an O inside the word. Deliver: mark alone at 32 and 64 px, mark plus wordmark, and a 16 px favicon, all as SVG. `logo-options.html` option B is the current direction; keep its spirit and make it cleaner.
> 2. **Landing refinements.** Replace the four trust-bar icons and the three how-it-works icons with a consistent set of simple line icons in the ink color. Give the calendar-versus-map panel a stronger contrast between the two states. Design the pathway gallery cards so the category and the sequence read at a glance. Make the founder note feel like a signed note rather than a text block. Tighten vertical rhythm throughout.
> 3. **About page.** Editorial layout for the founder story and the mission beliefs, with one pull quote; a team section for two to three people with optional photos.
> 4. **Social preview.** A 1200×630 Open Graph image: the wordmark and a cropped treatment map on white.
> 5. **Style sheet.** A short set of tokens and component styles (buttons, cards, section headers, tables, form inputs) that a developer can apply to the app without changing its structure.
>
> Export everything as standalone HTML plus SVG and PNG assets.
