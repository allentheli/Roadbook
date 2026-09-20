# Verification study files (protocol v2.1, 19 September 2026)

Built by `scripts/build-study.js` from `input/regimens.v0.18.0-audit.js`, which is `regimens.js`
at tag `v0.18.0-audit` (commit af9f4deb25e34d208d8486cd4450d2beb38693c9). Nothing here is edited by hand.
`HASHES.txt` is the sha256 manifest and is part of the pre-registration. `counts.json` records the counts and seed.

## Files

| Path | What it is | Who uses it |
|---|---|---|
| `inventory.csv` | Every assertion (729), with the library's value. The locked denominator. | Analysis only. Not for the reviewer. |
| `order.csv` | The 60 pathways in review order, with batch numbers and per-pathway counts. | Everyone |
| `worksheets/all.csv` | All assertions with `library_value` blank. Import this into the shared Google Sheet. | Reviewer |
| `worksheets/batch-N.csv` | The same, one file per batch of 10 pathways. | Reviewer, if batches are preferred |
| `keys/batch-N.zip` | Password-protected: `library_value` for each assertion in batch N, with the phase name. | Physician editor sends the password when the reviewer reports that sources are done for the batch |
| `pathway-log.csv` | One row per pathway: the library's own citations (to find the primary publication), and columns for sources-done time, key-opened time, minutes, access problems. | Reviewer |
| `loop-partition.csv` | Which generation loop each pathway came from, by first commit. | Analysis |

## Inventory rule (protocol 5.1)

Per treatment phase: `agents` (always); if cycle-based: `cycle_length`, `n_cycles`, and `visit_days` where the library lists visit days;
if daily or radiation with a stated course: `duration`. Radiation with the course left blank by design has no duration assertion.
Open-ended phases (surveillance, and one open-ended targeted phase) have no duration assertion; their `frequency_text` is a separate,
non-schedule assertion. Per interval between steps: `interval_duration`. Per procedure: `procedure_identity`. Per decision node:
`decision_condition`, `branch_set`. Per pathway: `sequence`. Schedule-bearing (primary denominator) = agents, cycle_length, n_cycles,
visit_days, duration, interval_duration = 547. All = 729.

## What the reviewer sees

The worksheet identifies each slot without giving its value: `Phase 3 (Chemotherapy; Immunotherapy; cycles)`, `Interval: Healing after surgery`,
`Decision 1`. Branch labels are shown for phases inside a branch so the reviewer knows which arm he is filling; this means the decision-node
assertions are compared rather than derived blind, which the protocol records as a limitation of that secondary class.

## Column values

`source_used`: primary publication | ClinicalTrials.gov | HemOnc | eviQ | FDA label | NCCN | none
`source_depth`: full text | abstract | protocol record | structured reference | label | guideline | none
`classification`: Concordant | Minor | Moderate | Major | Practice variation | Sources disagree | Unverifiable | Inventory error
`date_consulted`, `sources_done_at`, `key_opened_at`: ISO date or date-time.

## Reveal procedure

1. Reviewer fills `source_value`, `source_used`, `source_depth`, `locator`, `date_consulted` for every row of a batch.
2. Reviewer writes `sources_done_at` for each pathway in `pathway-log.csv` (or the Sheet's equivalent) and tells the physician editor.
3. Physician editor sends the batch password. Reviewer opens `keys/batch-N.zip`, writes `key_opened_at`, pastes `library_value` into the Sheet by `assertion_id`, and fills `classification` and `note`.
4. Physician editor adjudicates the batch in separate columns (`editor_call`, `editor_reason`) without editing the reviewer's cells.
