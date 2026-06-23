# Property tools — eastern Helsinki

A small static site with **one dataset and three views** of it. No build step, no framework.

```
data.json      raw facts + assumptions + scoring rubric  ← the only file you routinely edit
lib.js         the shared math: true cost, transfer tax, collateral, bridge, score
styles.css     one palette, defined once
index.html     landing
shortlist.html sortable scored table
scorer.html    rubric scorer with school veto → emits a data.json snippet
financing.html mortgage model with bridge cost + leased-land collateral haircut
```

## Why it's shaped this way

The three original tools each kept their own copy of the data and the math, so they
drifted — the same house showed two different prices. Here:

- **Facts live once, in `data.json`.** Change the cap rate, a price, or a ground rent in
  one place and every tool updates.
- **Math lives once, in `lib.js`.** The shortlist and the financing model call the same
  `trueCost()` and `transferTax()`, so they cannot compute a house differently.
- **Scores are judgments, kept as data.** They are *not* recomputed from the rubric — doing
  that mechanically would reshuffle deliberate calls (Strömsintie derives to ~7.3, not 8.0).
  The scorer applies the rubric live for *new* listings going forward.

Two framework fixes are built in:
- **School is a hard gate.** Off-anchor (`school_status:"off"`) caps the scorer at 6.0 and
  flags the row, instead of letting the additive model read "top tier" while failing a
  near-hard requirement.
- **Leased land is haircut for collateral**, and **bridge / double-carry is a euro line**,
  not a coloured label — the new-build's timing advantage is now quantified.

## Run it

It uses `fetch('./data.json')` and ES modules, so it must be **served over http(s)**, not
opened as a `file://` path.

Locally:
```bash
cd property-tools
python3 -m http.server 8000
# open http://localhost:8000
```

On GitHub Pages:
1. Push this folder to a repo.
2. Settings → Pages → Build from branch → `main` / root.
3. Open the URL it gives you. A hosted URL opens fine on mobile.

## Adding a property

1. Open `scorer.html`, score the listing (fill the fact fields), tap **Copy data.json snippet**.
2. Paste the object into the `properties` array in `data.json`.
3. Add `school_label`, `gate`, `flags`, and the display `chips` (the scorer captures the
   logic-bearing fields; chips are cosmetic).
4. Commit and push.

## Fields that drive logic (everything else is display)

| field | effect |
|---|---|
| `url` | optional Oikotie link; shown in the shortlist row + drawer and on the financing card |
| `headline`, `ground_rent_yr`, `reno_share`, `extra_works` | → `trueCost` |
| `tenure`, `lease_end` | leased → ground-rent capitalised + collateral haircut |
| `tax_basis` (`shares` / `property`), `tax_override` | → `transferTax` |
| `school_status` (`in` / `off`) | off → score gate |
| `financing`, `running_mo`, `available`, `lead`, `badge`, `timing` | financing card |

Cap rate, tax rates, collateral LTV, leased haircut, bridge assumptions all live in
`data.json → assumptions`.

*Estimates, not financial advice — confirm figures with Nordea before acting.*
