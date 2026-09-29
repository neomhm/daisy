# Daisy round 10: what her next training needs

Updated 2026-09-29. It starts from round 9 (`daisy7-27M.pt` + `daisy7-27M-door.json`, /train run `e53e89fb2420fba1`).

## Where these figures come from

- The handover `02-MODELS.md` (snapshot 2026-09-29 ~05:30 CST), sections 1, 4, 7 and 8. Every figure in it is measured unless marked "estimate".
- Round 9's report `owner8-report.md` and card `CARD-daisy-owner9.md`, as summarised in that handover. I haven't seen the report itself.

The handover says round 10 is **"an idea, NOT prepared"**. This file is that preparation.

---

## 0. Three decisions for Laurent before round 10

1. **Approve the pass bars, or change them.** Claude proposed Daisy's bars on 09-27 and asked again on 09-29 at 03:25. They have not been approved. The proposed bars are:
   - ≥ 75% right on blind owner questions;
   - ≤ 3% wrong answers shown;
   - under 1 s per question.

   The round 10 targets below (section 2) are a realistic next step toward those bars, not the bars.
2. **Wait for Tulip's tables, or not.** Tulip 1.1 already has 6 new tables (section 3.6). Round 10 can include them now; no need to wait for Tulip 1.2.
3. **The GPU queue.** MEGA9 is free after the pretrained Orchid test. Daisy round 10 and a Tulip 1.2 run on the fallback (see `TULIP-1.2-PLAN.md`) compete for it.

---

## 1. Where Daisy stands after round 9

The owner questions are 118 blind questions: 93 to answer, 25 to refuse.

| Measure | Round 8 (owner8) | Round 9 | What it tells us |
|---|---|---|---|
| Right, as shipped (ask-back gate on) | 41.9% | **41.9%** | **No gain** on the test that matters most |
| Right, gate off | n/a | 51.6% | The model itself improved |
| Wrong rows shown | 36.4% | **21.2%** | The gain came from the gate, not from understanding |
| Asked back | n/a | 16.1% | The right reading among her choices in only **9 of 15** |
| Answerable questions she refused | n/a | **11.8%** | She refuses questions she could answer |
| Right refusals, for the right reason | 76.0% | 76.0% | No gain |
| **Held-out variant columns** | n/a | **18.7% right, 44.0% wrong shown** | **Her weakest spot, and the worst wrong-shown rate of any test** |
| Planner8 blind | 33.3% | 38.3% | Small gain |
| Quiz (templated) | 99.2% | 99.1% | Already solved; the floor is kept |
| WikiSQL / Spider dev / Spider test / BIRD dev (never used to choose) | 0.5 / 0.5 / 1.0 / 0% | 20.1 / 7.7 / 6.7 / 1.4% | Open data barely learned: it is only a small share of her lessons |
| Speed per question | | 252 ms p50, 493 ms p95 | Meets the bar |

**How the gate works today:** its threshold is **0.75**, stored in `daisy7-27M-door.json`. It was chosen on **1,300 checkpoint items**, not on the test, by maximising **"right − 2 × wrong shown"**.

Worked back from the percentages: 9 of the 15 questions she asked back were ones she would have got right on her own. This score favours asking back so strongly that it cancels round 9's real gain.

**Main problem:** she gets 99.1% on templates and 41.9% on real owners, with a wrong-shown rate of 44% when column names are new. She has learned the templates, not the task.

**The blind set was written by an agent, not by people.** The handover already wants a **people-written** blind set as the real headline for round 10.

---

## 2. Targets for round 10

Each target is on blind owner questions she never saw, unless the row says otherwise.

| # | Measure | Round 9 | Target for round 10 | Target that must not break |
|---|---|---|---|---|
| T1 | Right, as shipped | 41.9% | **≥ 55%** | |
| T2 | Right, gate off | 51.6% | **≥ 62%** | |
| T3 | Wrong rows shown | 21.2% | **≤ 12%** | Never above 21.2% |
| T4 | Right refusals, for the right reason | 76.0% | **≥ 88%** (22 of 25) | |
| T5 | Answerable questions she refused | 11.8% | **≤ 6%** | |
| T6 | Ask-backs on questions she would have got right | 9 of 15 | **≤ 1 in 3** | |
| T7 | Right reading among her ask-back choices | 9 of 15 | **≥ 85%** | |
| T8 | Held-out variant columns | 18.7% right / 44.0% wrong shown | **≥ 45% right / ≤ 15% wrong shown** | |
| T9 | People-written blind set (new, section 6) | not measured | **≥ 50%** | |
| T10 | Quiz | 99.1% | | ≥ 98% |
| T11 | Speed | 252 ms p50 / 493 ms p95 | | p95 ≤ 600 ms |
| T12 | External tests (WikiSQL, Spider, BIRD) | 20.1 / 7.7 / 6.7 / 1.4% | Report only, never used to choose a checkpoint | |

If T1, T3 and T8 are not met, do not ship her as the model in use. Write the report anyway.

---

## 3. What to train her on

Aim for **about 8,000 lessons**. Every lesson has its **column names renamed at random, on every pass** (section 3.1).

| Share | Lessons | What they are |
|---|---|---|
| **60%** | **~4,800** | **Real questions**, of which about **1,500 use Tulip 1.1's new tables** (section 3.6). The rest come from Spider, BIRD, WikiSQL and cleaned owner questions that are in no test. Weights by SQL type: about 30% grouped totals and top-N, 20% date filters with relative periods, 20% joins across 2–3 tables, 10% comparisons between periods, 20% the rest. |
| **25%** | **~2,000** | **Reworded templates**: a subset of the 3,225 templated lessons, each written 3–5 ways the way owners type. That means typos, shorthand ("CA", "top 10 clients", "YTD"), and French word order. Code checks each rewording returns the same rows as the original. |
| **10%** | **~800** | **Refusals, each labelled with its reason**, plus near-misses that must be **answered** (section 3.4). |
| **5%** | **~400** | **Ask-back lessons**: questions that really have two readings, each with its options. |

Every lesson's target spec7 must pass the door, compile with `compile_spec` for all three dialects, and run read-only. It must return at least one row unless it is a refusal. Drop any lesson that fails, and count the dropped lessons in the report.

### 3.1 Column names she has never seen (T8)

1. **Rename columns at random, in every lesson, on every pass.** The shares:
   - 25% abbreviations (`cust_nm`, `custname`);
   - 20% different case and separators (`CustomerName`, `CUSTOMER_NAME`, `"Customer Name"`);
   - 20% synonyms (`client`, `buyer`, `turnover`, `ca`);
   - **25% French, German, Spanish, Italian, Dutch, Portuguese and Polish names** (`montant_ttc`, `Umsatz`, `importe`, `fatturato`). This matches the languages of Tulip's made-up sheets;
   - 5% meaningless legacy names (`fld_07`, `ZZ_CUSTNO`);
   - 5% unchanged.
2. **Keep a separate vocabulary for renaming in the tests.** No renamed name used in the held-out variant-columns test may appear in training.
3. **Give her 2–3 sample values per column** in what she reads, cut to 12 characters each. Check it still fits her **512-piece context** (item 14).
4. **Have her list the columns she will use first, then write spec7.** Train this step with its own loss. The door checks that list against the schema.

### 3.2 The ask-back gate (T6, T7)

5. **Keep choosing the gate on the checkpoint items, never on a test.** That part is already right.
6. **Change the score used to choose the gate.** "Right − 2 × wrong shown" rewards asking back too much. Use this rule instead:

   > The best gate is the one with the most questions right, provided wrong shown stays ≤ 12% and needless ask-backs stay ≤ 1 in 3.

   Also record in `daisy7-27M-door.json` how many needless ask-backs the chosen gate makes.
7. **Base the decision on whether her likely answers agree**, not on her score alone. Take her top 5 specs, compile them and run them. **If her top 3 return the same rows, answer, whatever her score.**
8. **Offer only choices whose rows differ.** One of them must use her second-best column list from item 4.
9. **Add ask-back lessons**: about 400 questions that really have two readings. Examples: "sales by region" (the customer's region or the office's?) and "last quarter" (calendar or fiscal?).

### 3.3 The lessons she already knows

10. **Put open data in the mix at the stated share**, not a small share. The external tests show she has barely learned it. Keep the licence and source ledger for everything used: Spider and BIRD are CC BY-SA 4.0, WikiSQL is BSD-3.
11. **Replay 5% of round 9's lessons throughout**, to keep her quiz at 99% (T10).

### 3.4 Refusals (T4, T5)

12. **Label each refusal lesson with its reason.** The reasons:
    - the column or table isn't there;
    - the question asks to change data;
    - it's about the outside world;
    - the period asked is outside the data held;
    - it's too vague to ask back about.
13. **About 800 refusal lessons, half of them near-miss pairs**:
    - one near-miss that must be refused, e.g. "profit by product" when there is no cost column;
    - and its twin that must be answered, e.g. "sales by product" on the same schema.

    The twins go straight at the 11.8% of answerable questions she refused.

### 3.5 Context and vocabulary

14. **Measure the owners' schemas in pieces**, with sample values added. If more than 5% go over 350 pieces, add a code step before Daisy that keeps only the tables and columns most likely to matter. Test that step for keeping all the needed columns ≥ 99% of the time.
15. **Count the pieces per column name** on the renamed test schemas, with the fixed 1,100-piece vocabulary `daisy-words-7`. If the average is above 6, a new vocabulary is needed. **A new vocabulary means training from zero**, not training further (item 17).

### 3.6 Tulip 1.1's new tables

16. Tulip 1.1 already imports **stock levels, suppliers, purchase orders, recipes with ingredients, allergens (EU 14) and product variants**. Owners will ask Daisy about them. Examples:
    - "what's below its minimum stock?"
    - "which recipes contain nuts?"
    - "what did I order from this supplier last month?"
    - "which variants sell best?"

    **Take the exact table and column names from Tulip's source** (`~/tulip-lab`, branch `tulip-1.1`), so both models mean the same thing. Recipes need joins through the ingredients list: give them at least 300 of the ~1,500 lessons.

### 3.7 The run

17. Choose one:
    - **Train further** from round 9's `-latest` (`e53e89fb2420fba1`'s optimiser file, not the 108 MB kept file) for **at least 6 hours**, if the vocabulary stays; or
    - **train from zero** if item 15 needs a new vocabulary. Budget about 15–20 h: `sql7` from zero was the last time.
18. **Save a checkpoint every 30 minutes.** Score each one on the checkpoint items, variant columns and the quiz. **Keep the best on T1, not the last one.**
19. **Optional, only if T8 stays below 30% right:** have her write column slot numbers (C1, C2, …) instead of column names, and let code put the real names back. This changes spec7, so it is a larger change than a round.

---

## 4. The /train rules this run must respect

These come from section 7 of the handover.

- **The program** is a zip with `build.py` at the top, ≤ 2,000 files and ≤ 1 GiB unpacked. Rebuild it with `python3 pack8.py` in a new `program10/` in `~/daisy-lab`.
- **Training data** is a separate zip holding only `.txt .md .csv .json .jsonl`. Round 9 ran with **no data zip**: its lessons were built by the program itself.
- **The Chrome tool uploads at most 10 MB per file.** Bigger files are Laurent's to upload.
- **Train further** puts the loaded model in `./previous`. Keep intermediate files in `.work/`.
- **Limits:**
  - no network;
  - MemoryMax 20 GB;
  - one run per box;
  - **`torch.cuda.synchronize()` in every GPU loop**, including generate. Daisy segfaulted without it on 09-24.
- **Rehearse on CPU first**, under `systemd-run --user … DevicePolicy=closed`. **Never import torch on node1 while a /train run is active.** Keep CPU work beside a run to a few GB in total.
- **Return:**
  - the kept model;
  - the door file with the new gate;
  - the report with every row of section 5;
  - the licence and attribution files.

  **Do not publish her model file before the share-alike question is checked.**

---

## 5. What her report must show

The same rows as round 9's report, so the versions compare, plus:

1. Right shipped and right gate off (T1, T2), wrong shown (T3).
2. Refusals by reason (T4); answerable questions refused (T5).
3. Ask-backs: how many, how many were needed, and how often the right reading was among the choices (T6, T7). The gate threshold, and the rule used to choose it.
4. Held-out variant columns by renaming style (T8).
5. The people-written blind set (T9), per dialect.
6. Quiz, planner8, external tests, speed p50/p95, size.
7. Lessons: how many of each kind, how many dropped, time trained, the step kept.
8. The blind questions she still gets wrong, grouped by cause: columns, dates, joins, grouping, refusals, other.

---

## 6. A fresh, people-written test

- Keep the 118 agent-written blind questions as the row that compares versions.
- **Have people write a new blind set of at least 120 questions** (about 95 to answer and 25 to refuse), on schemas she has never seen, including Tulip 1.1's new tables.
  - Laurent, or owners with their consent, write the questions.
  - Nobody looks at the set until training ends. It is **never trained on** (open-data rule, section 8 of the handover).
- Score the variant-columns test and the checkpoint items apart from it.

---

## 7. Still to check in `~/daisy-lab` before starting

- [ ] Round 9's per-question log: which of the 118 she got wrong, and why.
- [ ] How many of round 9's lessons came from open data, how many were templated, how many refusals.
- [ ] How long owner schemas are in pieces (item 14) and how many pieces unseen names split into (item 15).
- [ ] The exact names of Tulip 1.1's six new tables, on branch `tulip-1.1`.
