# Tulip 1.2: what her next training needs

Written 2026-09-29. It starts from Tulip 1.1 (`tulip-1.1.0.pt`, /train run `c430d16e7c8ca32c`).

## Where these figures come from

- The handover `02-MODELS.md`, sections 1, 3, 7 and 8.
- `~/tulip-lab/real/SOURCES.md` and `GATHERING-BRIEF.md`, as the handover summarises them. I haven't seen these two files themselves.

---

## 0. Three decisions for Laurent before anything starts

1. **Approve the pass bars, or change them.** Claude proposed them and you haven't answered. They are:
   - ≥ 90% of realistic sheets imported correctly;
   - ≤ 1% wrong tables accepted (her own build target was ≤ 2%);
   - ≥ 99% refusal of what is not a table;
   - about 1 s per sheet.

   The size of the real test in section 5 follows from these bars.
2. **Resume gathering, or not.** You paused it on 09-28 at 19:27: *"stop gathering material for tulip until then"*. Nothing in sections 3.1 or 3.2 can start without it.
3. **What MEGA9 does after the pretrained Orchid test.** Nothing else is ready. There are three options:
   - **(a)** Tulip 1.2 on the fallback now (section 4);
   - **(b)** Daisy round 10 (`DAISY-NEXT-TRAINING.md`);
   - **(c)** leave it idle until the real positives are gathered.

   My recommendation is **(a)**. Its data is already labelled, and it goes straight at her one missed target.

---

## 1. Where Tulip stands after 1.1

| Measure | 1.0 | 1.1 | Proposed bar |
|---|---|---|---|
| Hand-written real-shaped sheets (32) | 31.3% | **37.5%** | ≥ 90% |
| **Wrong table accepted** | 5.6% | **3.9%** | ≤ 1% (her build target: ≤ 2%, **her one missed target**) |
| Refusal precision / recall | 99.8 / 99.2% | 96.8 / 99.0% | recall ≥ 99% (met) |
| Unseen made-up sheets | 90.1% | 95.7% | |
| Unseen locales | 79.0% | 87.3% | **13.4% of imports there are wrong** |
| Several tables per sheet ("layouts", new) | n/a | **52.4%** | |
| Weakest language × table | 80.3% | 90.0% | |
| Traps, lowest | 86.2% | 98.7% | |
| "Needs a person" | 2.45% | 0.67% | |
| Invented values | 0 | 0 | 0 |
| Speed | | 0.55 s per sheet | ~1 s (met) |

**44% of her dev errors are refusing a sheet she could have read.** She errs on the side of caution. The fix for "wrong but sure" must not make that worse.

**Main problem:** she scores 95.7% on made-up sheets and 37.5% on real-shaped ones, and there are almost no real sheets she should import. **Only 8 real positives exist today.**

---

## 2. The material that already exists

| Material | Where | State |
|---|---|---|
| Round 1, open-data portals (IT, UK, LU, AT, FR, US, ES) | `~/tulip-lab/real-data/`, branch `real-sheets` f20aece | 429 files, **304 labelled** (5,837 labels, 100% on the last check). **8 positives, 5,825 real refusals**, of which **1,122 are careless imports**, e.g. a payments ledger offered as an invoice list. **All of Luxembourg held out.** |
| Round 2, businesses' own price lists | `~/tulip-lab/real/README.md` ("The business round") | **Paused** after 165 of 2,395 businesses: **98 candidate files (70 HTML tables, 28 PDFs), none labelled** |
| Outside gathering | `~/tulip-lab/real/GATHERING-BRIEF.md` (18c1773) | Written for Gemini or ChatGPT's agent mode; nothing received yet |

---

## 3. What to gather (once resumed)

### 3.1 Real positives: about 485 in total

The training counts are the brief's own. The held-out and checkpoint sets are added in the same proportions.

| Kind | Training (brief) | Held out (test) | Checkpoint set | Total |
|---|---|---|---|---|
| Product price lists | 120 | 56 | 18 | 194 |
| Service lists | 60 | 28 | 9 | 97 |
| Opening hours | 40 | 19 | 6 | 65 |
| Sizes / packs | 30 | 14 | 5 | 49 |
| Stock | 20 | 9 | 3 | 32 |
| Suppliers | 15 | 7 | 2 | 24 |
| Recipes / allergens | 15 | 7 | 2 | 24 |
| **Total** | **300** | **140** | **45** | **485** |

**Rules for gathering:**
- **Split by source, not by table.** All of a site's or a business's tables go into the same set. Choose the held-out sources first, before any labelling for training.
- **At most 5 tables from any one source**, so she doesn't learn one site's layout.
- **At least 20 training tables per language**, for each of the 7 languages.
- **If a kind can't reach its count, report it.** Never fill the gap with made-up sheets under the "real" label.
- **Label the 98 candidates from round 2 first.** They are the cheapest positives. Then resume the business crawl (2,230 businesses left), then the outside gathering.
- Keep the round 1 rules unchanged:
  - robots.txt honoured literally, following its redirects;
  - AI and TDM opt-outs honoured;
  - ≥ 1.5 s per site;
  - User-Agent `KINDERKINDOFAI (contact: tulip@akiki.ai)`;
  - only the accepted licences;
  - personal data checked;
  - each file's source and licence written in `manifest.csv`.
- **Report every evening:** counts by kind, by language and by source, and the files rejected, with why.

### 3.2 Real negatives

- **For training:** round 1's refusals from every country except Luxembourg.
- **For the test:** Luxembourg's refusals. **Count them.** To show ≤ 1% wrong tables accepted, the test needs:

  | Wrong accepts in the test | Negatives needed |
  |---|---|
  | 0 | ≥ 300 |
  | 1 | ≥ 475 |
  | 2 | ≥ 630 |

  If Luxembourg has fewer negatives than that, add a second country held out whole.

---

## 4. Option (a): train Tulip 1.2 now, on the fallback

This needs no new positives. It trains on:
- the ~5,800 real refusals from round 1, **Luxembourg left out**;
- messier generated positives: generated sheets made to look like the 8 real ones and the 32 hand-written ones, in shape but not in content;
- replay of 1.1's lessons.

| Can claim | Cannot claim |
|---|---|
| Wrong tables accepted, measured on Luxembourg's real negatives | Any real import rate: only 8 real positives exist, too few to measure (±20 points or worse) |
| Refusal precision and recall on real negatives | Progress toward the 90% bar |

**Watch the 44% of dev errors that are cautious refusals.** Training on many real refusals can push her further toward refusing. Balance each batch so refusals are at most 40% of it, and report "refused but readable" as its own row.

---

## 5. The program changes (`SOURCES.md` §8)

Each change is done only when its test passes. Report them one by one.

| # | Change | The test that proves it |
|---|---|---|
| P1 | Refusal shapes learned from real data (statistics tables, payment ledgers) | Generated lessons include both shapes; the Luxembourg ledgers are refused |
| P2 | A sharper table / not_a_table rule | Fewer "wrong table accepted" on the checkpoint set, with no rise in "refused but readable" |
| P3 | Fee books: two-level names, price ranges, "on request" | 10 real fee books import with ranges and "on request" kept as such, never as a number |
| P4 | A value filter in `unpivot()` | A test unpivot drops empty and total cells |
| P5 | More than 26 columns | A 40-column sheet imports; columns beyond Z are addressed correctly |
| P6 | Opening hours for several places | A sheet with 3 shops' hours gives 3 sets of hours, not one mixed set |
| P7 | German words (days, units, "auf Anfrage") | German hours and price lists import like the French ones |
| P8 | Currency from the folder's country | A Swiss folder with no currency sign gives CHF, and a French one EUR |
| P9 | Units in headers ("Preis (€/kg)", "Poids g") | The unit leaves the header and the value stays a number |
| P10 | The same row repeated across categories | Imported once, with its categories kept |

---

## 6. The training run

- **Train further from `tulip-1.1.0.pt`.** Her vocabulary and TulipScript are unchanged. The handover estimates about a day; 1.1 needed 19.7 h for 8.25 passes at 1.34 s per step.
- **Batches:**
  - the ~300 real positives are **repeated so they make up about 15% of each batch**;
  - real refusals make up at most 25%;
  - generated sheets fill the rest, **including the new layouts** (several tables per sheet, 52.4% today).
- **Save a checkpoint every 1–2 hours.** Score each one on the 45-table checkpoint set and the checkpoint negatives. **Keep the best on "real positives right" while "wrong table accepted" is not above 2%.**
- **The /train rules** (section 7 of the handover):
  - a program zip ≤ 2,000 files and ≤ 1 GiB;
  - a data zip holding only `.txt .md .csv .json .jsonl`, so **PDFs, `.xls` and `.ods` must be converted to text or JSON inside the zip, or read by the program**;
  - Chrome uploads at most 10 MB per file;
  - no network, MemoryMax 20 GB, one run per box;
  - `torch.cuda.synchronize()` in every GPU loop, including `check.py`, which segfaulted on 09-27;
  - a CPU rehearsal first, never torch on node1 during a run.

---

## 7. What her report must show

The same rows as 1.1's, so the versions compare, plus:

1. **Real held-out positives**, by kind and by language, **with the margin**, e.g. "88% of 140, ±5 points". With the fallback, say how few there are.
2. **Wrong tables accepted on the real held-out negatives**, with how many negatives there were and the upper bound.
3. Refusal precision and recall, and **"refused but readable"** as its own row.
4. The 32 hand-written sheets (37.5% on 1.1), unseen made-up sheets, unseen locales and their wrong rate, layouts, traps, invented values (must stay 0), speed.
5. P1–P10: each done or not, with its test.
6. Data: real positives by kind, language and source; negatives; the licence ledger.

---

## 8. Still to check before starting

- [ ] How many refusals are in Luxembourg's held-out set (section 3.2).
- [ ] How many of the 98 round 2 candidates are real positives once labelled.
- [ ] Whether `SOURCES.md` §8 has exactly the 10 changes above, or words them differently.
- [ ] That `real/logs/requests.jsonl` has been committed. It was uncommitted at pack time.
