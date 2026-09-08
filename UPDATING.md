# Keeping Roadbook current

## Recommended setup: Claude Code on the repository

The lowest-friction way to maintain Roadbook is Claude Code connected to the GitHub repository. `CLAUDE.md` in the repository root tells it how the files fit together and the rules for clinical changes, and `tests/check.js` lets it verify the library before committing (it also checks that every page's `regimens.js?v=` stamp matches `APP_VERSION`, so releases bypass the old cached data; `tests/browser.js` is an optional headless test of the builder itself, and `tests/record-demo.js` re-records the silent builder demo on the landing page). A change then becomes one sentence from you ("add the new approval below as a pathway") and one click to merge the pull request it opens.

1. Install Claude Code (desktop app, or the command line) and sign in.
2. Ask it to clone your repository (`https://github.com/YOUR-USERNAME/Roadbook`) and open the folder; it reads `CLAUDE.md` automatically.
3. Give it the change in plain language, or paste one of the prompts below with the source. Ask it to open a pull request rather than commit to main for anything clinical.
4. On GitHub, read the pull request (the diff shows exactly what changed in `regimens.js` and the verification log), then merge. GitHub Pages publishes within about a minute.

A Claude Project (chat) remains useful for research and verification conversations, and Claude Design for visuals; hand their outputs to Claude Code to apply.

## Start here without Claude Code (chat-only)

1. Create a Claude Project called **Roadbook** and add two files to its project knowledge: `regimens.js` and this file. That gives every future conversation the library and the rules.
2. When you want a change — a new approval, a correction, a new regimen — open that Project and paste one of the prompts below (they are ready to copy), plus the source.
3. Claude returns a complete `regimens.js`. Read the verification note it gives you, spot-check the schedule against the source, then replace `regimens.js` in your GitHub repository (open the file, pencil icon, paste, commit). The site updates in about a minute; the Updates and References pages rewrite themselves.
4. Also replace the copy in the Project's knowledge so the next conversation starts from the current library.

That is the whole loop. `app.html` and the other pages only change when features change, and those come from a conversation like this one.

Roadbook is a static site: a handful of files in one GitHub repository, published by GitHub Pages. There is no server to maintain. Updating the site means replacing a file and committing it.

## How the files fit together

| File | What it is | How often it changes |
|---|---|---|
| `regimens.js` | **The library.** Every regimen, its steps, plain-language text, sources, `added` / `reviewed` dates, plus `CHANGELOG` and `APP_VERSION`. | Often. This is the file almost every update touches. |
| `app.html` | The builder and the patient page (timeline engine, editor, print fit, share links). | Only when features change. |
| `index.html`, `about.html`, `updates.html`, `references.html`, `site.css` | The public pages. Updates and References read `regimens.js`, so they refresh themselves. | Rarely. |
| `logo-mark.svg` | The mark. | Rarely. |

Because the pages read `regimens.js` at load time, adding a regimen or a changelog line automatically updates the landing page counts, the Updates log, and the References page. Nothing else needs editing.

## The update loop (5 minutes)

1. Open your Roadbook Claude Project (keep `regimens.js` and this file in its project knowledge).
2. Paste one of the prompts below with the new information.
3. Claude returns a complete replacement `regimens.js` (never a fragment) with the new or changed regimen, updated `reviewed` dates, and a new `CHANGELOG` entry at the top.
4. Review the plain-language text and the schedule against the source Claude cites. You are the editor of record.
5. On GitHub, open `regimens.js`, click the pencil, replace the contents, commit. The site updates within about a minute.

If you use Claude Code on the repository, step 5 becomes "commit and push" done for you; ask it to open a pull request so you still review the diff.

## Prompt: add or change a regimen after a new approval

> Here is a new FDA approval / practice change: [paste the approval notice, trial abstract, or link].
> Update `regimens.js` accordingly. Rules: verify the schedule against the primary publication and a structured protocol reference (HemOnc.org or eviQ) and cite both in `refs`; write patient-facing `plain` text at an eighth-grade reading level with no promises beyond the evidence; keep protocol-specified intervals and mark practice-variable ones as such in the text; use `weeks:''` for any radiation step whose course length varies; set `added` and `reviewed` to today; add a one-line `CHANGELOG` entry at the top; bump `APP_VERSION` if a regimen was added. Return the complete file, then a short verification note listing what you checked and anything you could not confirm.

## Prompt: monthly approvals sweep

> Search for FDA oncology approvals, label expansions, and major guideline changes in the last [30] days relevant to early-stage or locally advanced breast, GI, lung, and GU cancers treated with curative intent (neoadjuvant, adjuvant, perioperative, chemoradiation, and surveillance regimens). For each, give one line: what changed, the trial, and whether it affects an existing Roadbook regimen or would be a new one. Do not update any files yet.

Review the list, then run the add/change prompt for the ones you want.

## Prompt: annual re-verification

> Re-verify every regimen in `regimens.js` against its primary publication and a structured protocol reference. Report discrepancies as a table (regimen, field, current value, source value, source). Do not change anything until I confirm.

## Conventions worth keeping

- One regimen per object; `id` never changes once published (share links depend on it).
- `plan` is the short title patients see; `title` is the one-sentence sequence; `subtitle` is the cancer line.
- `group` drives the sub-headings in each tab; reuse existing group names exactly.
- Hormone-therapy type is offered only for breast and prostate regimens.
- Every clinical change gets a `CHANGELOG` line, and so does any builder change a user would notice.
  Design, copy-editing and internal engineering stay out of it; the Updates page is the public record, not a commit log.
- `how-it-works.html` is the builder walkthrough. If a control changes, update that page in the same commit.
