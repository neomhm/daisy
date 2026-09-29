# Daisy 1.2: what her next training needs

Written 2026-09-29. It starts from Daisy 1.1 (training round 9).

## Where these figures come from

- Daisy 1.1's final report, as published on her card in `public/index.html` (commit `4c84dc7`).
- The summaries of the earlier sessions.

I could not open the full training logs, the handover file, or the Colab branch from session `01Fx5VAb12SoXFPADgKQkKdc`. That session ran on your own computer, and none of those files are in this repository. Section 7 lists what to check against them before round 10 starts.

---

## 1. Where Daisy 1.1 stands

| Measure | 1.0 | 1.1 | What it tells us |
|---|---|---|---|
| Owners' questions she never saw, right rows (118 in all: 93 to answer, 25 to refuse) | 41.9% | **41.9%** | **No gain at all** on the test that matters most |
| Right refusals, for the right reason (25 questions) | 76.0% | **76.0%** | No gain: about 19 of 25 right, 6 wrong |
| Blind test of new questions, all three databases | 33.3% | 38.3% | Small gain, mostly from the Spider, BIRD and WikiSQL lessons |
| Her quiz of templated questions | 99.2% | 99.1% | Already solved: this measure can no longer tell versions apart |
| Wrong rows shown | 36.4% | 21.2% | The whole gain came from **asking back**, not from getting better |
| Right rows without the ask-back check | n/a | 51.6% | The model itself did improve |

**Recomputed from those percentages (93 questions to answer):**
- Right as shipped: 39 (41.9%).
- Right with the ask-back check turned off: 48 (51.6%).
- Asked back: 15 (16.1%).

So **9 of the 15 questions she asked back were ones she would have got right on her own**. The ask-back check is too cautious. It cancels out the whole gain in understanding between 1.0 and 1.1.

When she does ask back, the right reading is among her choices in only 9 of 15 cases (60%). The other 6 times, the owner is offered only wrong answers.

**The gap between 99.1% on her quiz and 41.9% on real owners' questions is the main problem.** She has learned the templates. She has not learned the task.

**Her weakest spot, as stated in her report:** columns named in ways she has never seen.

---

## 2. Targets for Daisy 1.2

Each target is measured on the owners' questions she never saw, unless the row says otherwise.

| # | Measure | 1.1 | Target for 1.2 | Target that must not break |
|---|---|---|---|---|
| T1 | Right rows, as shipped (with the ask-back check) | 41.9% | **≥ 55%** | |
| T2 | Right rows, without the ask-back check | 51.6% | **≥ 62%** | |
| T3 | Wrong rows shown | 21.2% | **≤ 12%** | Must not rise above 21.2% |
| T4 | Right refusals, for the right reason | 76.0% | **≥ 88%** (22 of 25) | |
| T5 | Ask-backs on questions she would have got right | 9 of 15 | **≤ 1 in 3** | |
| T6 | Right reading among her ask-back choices | 9 of 15 (60%) | **≥ 85%** | |
| T7 | Share of questions she asks back | 16.1% | 8–15% | |
| T8 | Fresh blind test, all three databases (see section 6) | 38.3% (old test) | **≥ 50%** | |
| T9 | Columns named in new ways (a new test, see 3.1) | not measured | **≥ 60%** | |
| T10 | Her quiz of templated questions | 99.1% | | Must stay ≥ 98% |
| T11 | Time from question to rows, 1 CPU core | 0.25 s | | Must stay ≤ 0.35 s |
| T12 | Size | 27.1M parameters, 108 MB | | Same design unless 3.6 is chosen |

If T1 to T4 are not met, do not ship her as 1.2. Put the results in a report, as was done for Tulip 1.0.

---

## 3. What the training itself needs

The items are in order of expected gain.

### 3.1 Column names she has never seen (her weakest spot)

1. **Rename columns at random in every lesson, every pass.** For each training schema, draw new names for its tables and columns, then rewrite the question's query spec to match. The question stays the same. This way she cannot memorise the column names and has to read them from the schema. The renaming styles to use, in these proportions:
   - 25% abbreviations: `customer_name` → `cust_nm`, `cstmr_name`, `custname`.
   - 20% different case and separators: `CustomerName`, `CUSTOMER_NAME`, `customer-name`, `"Customer Name"`.
   - 20% synonyms and business terms: `customer` → `client`, `account`, `buyer`. `revenue` → `turnover`, `sales`, `amount`, `ca`.
   - 15% French, German, Spanish and Italian column names: `montant_ttc`, `date_facture`, `Kunde`, `Umsatz`, `importe`, `fatturato`. The owners are European SMBs.
   - 10% meaningless legacy names: `fld_07`, `col3`, `x_amt2`, `ZZ_CUSTNO`.
   - 10% unchanged.
2. **Show a few sample values per column in the schema she reads**: 2 or 3 distinct values, cut to 12 characters each. A column named `fld_07` whose values are `2024-03-01, 2024-03-02` is clearly a date. Check that it fits in her 512-piece context (see 3.5).
3. **Train her to link the question to the schema.** Add a short first step where she lists the columns the question uses, before she writes the query spec. Train it with its own loss, from the same lessons. Code can check this list against the schema before the spec is compiled.
4. **Build a test of 150 questions on column names she has never seen.** Take 50 real owner schemas and rename them with a vocabulary of names kept out of training. This is the test for T9. No renamed name from this test may appear in training.

### 3.2 Real questions, not templates

5. **Change the mix of her lessons.** Round 9 added Spider, BIRD and WikiSQL on top of the templated lessons: 3,225 lessons, 448 wordings × 19 SQL types. The mix for round 10:
   - **≥ 60% real or reworded questions**: Spider, BIRD, WikiSQL, and owner questions that have been cleaned and kept out of every test.
   - **≤ 25% templated questions**, only to keep the quiz above 98% (T10).
   - **15% refusals and ask-backs** (sections 3.3 and 3.4).
6. **Reword the templated questions.** For each templated question, have Bouquet or another large model write 3 to 5 wordings the way owners actually write: typos, no punctuation, French word order translated into English, relative dates ("last quarter", "since Easter", "YTD"), and business shorthand ("CA", "top 10 clients", "margin by rep"). Code checks each rewording by compiling the target spec and running it on the lesson's database: the rows must be the same as the original's.
7. **Balance the SQL types by how often owners use them**, not evenly across the 19. The weights to give the most frequent types are:
   - Grouped totals and top-N: about 30%.
   - Date filters, especially relative periods: about 20%.
   - Joins across 2 or 3 tables: about 20%.
   - Comparisons between periods: about 10%.
   - The rest: about 20%.

   Count the types in the 93 answerable owner questions to fix the final weights.

### 3.3 The ask-back check (T5, T6, T7)

8. **Calibrate the threshold on a separate calibration set, never on the owners' test.** Use 200 held-out real questions. Choose the threshold that keeps wrong rows ≤ 12% while asking back on ≤ 15% of questions. Record the chosen threshold in her model file.
9. **Base the check on whether her likely answers give different rows, not only on the model's score.** Take her top 5 query specs (beam or sampling), compile them, and run them. If the top 3 all give the same rows, answer and do not ask back, whatever the score. This alone should remove most of the 9 needless ask-backs.
10. **Make her ask-back choices different from one another.** Today, the right reading is missing from 6 of her 15 ask-backs. Offer only choices whose rows differ (by the same run as item 9). Make one of them the reading with the next-best schema link from step 3. Target: right reading among the choices ≥ 85% (T6).
11. **Add ask-back lessons**: questions that really have two readings, each with its options. For example:
    - "sales by region": the region of the customer or of the office?
    - "last quarter": the calendar quarter or the fiscal quarter?

    Write 300 to 500 of them.

### 3.4 Refusals (T4)

12. **Label each refusal lesson with its reason**, and have her give that reason, so "for the right reason" can be learned and not only scored. The reasons to cover:
    - The data doesn't exist in the schema: the column or table is missing.
    - The question asks to change data (insert, update, delete, "add a customer"). She only reads.
    - The question is about the outside world or general knowledge ("what's the VAT rate in Italy?").
    - Personal data she must not list without a filter, if the owner's settings say so.
    - The period asked for is outside the data held ("sales in 2019" when the data starts in 2021).
    - The question is too vague to ask back about.
13. **Write about 800 refusal lessons**, of which ≥ 40% are *near-misses*: questions that look answerable but name a column that isn't there, e.g. "profit by product" when there is a price column but no cost column. The 6 refusals she got wrong in round 9 are most likely of this kind. Check this against the round 9 per-question log.

### 3.5 Context and vocabulary

14. **Measure how long the schemas are in pieces.** With the 512-piece context, the 1,100-piece vocabulary, and sample values added (step 2), large owner schemas may not fit. If more than 5% of the owners' schemas go over 350 pieces, add a code step before Daisy that keeps only the tables and columns most likely to matter, ranked by name overlap and by value matches with the question. Test that step alone for keeping all the needed columns 99% of the time.
15. **Check how unseen column names split into pieces.** With 1,100 pieces, a name like `montant_ttc` may be split into many small pieces. Count the average pieces per column name in the T9 test. If it is above 6, retrain her vocabulary on the renamed schemas from step 1. `daisy-vocabulary.txt` was already retrained once. A vocabulary change means continued training from 1.1 is not enough, and she needs the full run of 3.6.

### 3.6 The length and kind of the run

16. **1 h 33 min of further training is not enough** for the changes above. Plan either:
    - (a) Further training from 1.1 for **at least 6 hours**, with the new mix, if the vocabulary stays the same; or
    - (b) Training from scratch on the new mix if the vocabulary changes (step 15). Budget it the way Tulip 1.1 was: several full passes, about 8 passes over 15 to 20 hours.
17. **Keep 5% of the lessons from 1.1's mix** throughout, so the quiz (T10) and the refusals she already gets right do not fall back.
18. **Save a checkpoint every 30 minutes, and score each checkpoint** on the calibration set, the T9 test, and the quiz. Ship the best checkpoint on T1, not the last one.
19. **Optional design change, only if T9 stays below 50%:** give each schema column a slot number (C1, C2, …) and have her write slot numbers instead of names; code then puts the real names back in. This removes the unseen-name problem at the root. It changes her output format, so it is a 2.0 change, not a 1.2 one.

---

## 4. Checks built into her training

- Every lesson's target query spec must compile and run on its own database, read-only, and return at least one row, unless it is a refusal. Drop any lesson that fails. Count the dropped lessons in the report.
- No question, schema or renamed column from the owners' test, the fresh blind test, the calibration set or the T9 test may appear in training. Check for exact duplicates and for near-duplicates, with a word-overlap score above 0.8.
- Keep the licences and credits of Spider, BIRD and WikiSQL in her model file, as in 1.1. Do the same for any new dataset.

---

## 5. What her final report must show

These are the same rows as the 1.1 card, so the tabs compare like for like, plus the new ones:

1. Right rows as shipped, and without the ask-back check (T1, T2).
2. Wrong rows shown (T3).
3. Right refusals for the right reason, broken down by reason (T4).
4. Ask-backs: how many, how many were needed, and how often the right reading was among the choices (T5 to T7).
5. Fresh blind test, per database: SQLite, PostgreSQL, MySQL (T8).
6. Column names she has never seen (T9), broken down by renaming style.
7. Her quiz (T10), time from question to rows (T11), parameters, tensors, weights (T12).
8. Training time, number of passes, and the mix of lessons.
9. The owners' questions she still gets wrong, grouped by cause: schema linking, dates, joins, grouping, refusals, other.

---

## 6. Make the test fresh

The same 118 owners' questions have now scored two versions. Round 10 is chosen against them too, which risks tuning her to that test. So:

- Keep the 118 questions as the headline test, so the three versions compare.
- **Write a new blind test of at least 120 questions** (the session "Planner questions analysis and fresh blind test" began one): about 95 to answer and 25 to refuse, on schemas she has never seen, across all three databases. **Nobody looks at these questions until 1.2's training is finished.**
- Use a separate calibration set of 200 questions (item 8) to choose the checkpoint and the ask-back threshold. Never use either test for that.

---

## 7. Check these against the handover file before starting

- [ ] The per-question log of round 9. It shows which of the 118 owners' questions she got wrong, and why. It will confirm or correct the order of section 3.
- [ ] The exact mix of 1.1's lessons: how many templated, how many from Spider, BIRD and WikiSQL, and how many refusals.
- [ ] The threshold 1.1 uses for asking back, and how it was chosen.
- [ ] Whether the vocabulary retraining with `daisy-package-v4` and `daisy-vocabulary.txt` came before round 9 or after it.
- [ ] Where the 6 review fixes on the Colab side branch stand (65 of 65 tests pass). Merge them before round 10 if they touch Daisy's training code.
- [ ] How long the owners' schemas are in pieces (item 14).
