// lib.js — the one place the math lives.
// Every tool imports from here, so they cannot compute true cost,
// transfer tax, collateral or a score differently from one another.

let _data = null;

/** Load data.json once and cache it. Works on any https host (e.g. GitHub Pages). */
export async function loadData() {
  if (_data) return _data;
  const res = await fetch('./data.json');
  if (!res.ok) throw new Error('Could not load data.json (' + res.status + ')');
  _data = await res.json();
  return _data;
}

export const eur = x => '€' + Math.round(x).toLocaleString('fi-FI');
export const fmtK = x => '€' + Math.round(x / 1000) + 'k';

// ---- derivations (pure: facts in, conclusions out) ----------------------

/** Capitalise an annual ground rent into a lump-sum land equivalent. */
export function capitalise(rentYr, A) {
  return rentYr > 0 ? rentYr / A.cap_rate : 0;
}

/**
 * True cost = headline + capitalised ground rent (direct-pay leases only)
 *           + unpriced renovation share + any other known works ahead.
 * Transfer tax is a transaction cost and is deliberately NOT folded in here —
 * it lives in transferTax() and the financing model.
 */
export function trueCost(p, A) {
  return p.headline
    + capitalise(p.ground_rent_yr || 0, A)
    + (p.reno_share || 0)
    + (p.extra_works || 0);
}

/** Transfer tax: 1.5% on As Oy shares, 3% on a building/plot held directly.
 *  tax_override handles special cases (e.g. new-build: 3% on the plot only). */
export function transferTax(p, A) {
  if (typeof p.tax_override === 'number') return p.tax_override;
  const rate = p.tax_basis === 'shares' ? A.tax_shares : A.tax_property;
  return p.headline * rate;
}

/**
 * Parental collateral gap = loan above the bank's collateral value.
 * Own land is valued at the price; LEASED land is haircut (banks lend less
 * against a building they don't own the ground under) — the fix the prose
 * footnote described but the old number ignored.
 */
export function collateralValue(p, A) {
  return p.tenure === 'leased' ? p.headline * A.leased_collateral_haircut : p.headline;
}
export function collateralGap(p, loan, A) {
  return Math.max(0, loan - A.collateral_ltv * collateralValue(p, A));
}

/** Bridge / double-carry cost for a property that's available before you can sell.
 *  A 2027-completion new-build dovetails with the sale, so it carries no bridge. */
export function bridgeCost(p, A) {
  return p.available === 'now' ? A.bridge_months * A.bridge_carry_mo : 0;
}

/** Standard annuity payment. */
export function annuity(P, ratePct, years) {
  const r = ratePct / 100 / 12, n = years * 12;
  if (P <= 0) return 0;
  if (r === 0) return P / n;
  return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

/**
 * Score a set of factor selections. The school factor is a HARD GATE:
 * an off-anchor property (school === 0) is capped at school_veto_cap,
 * because the additive model otherwise lets it read "top tier" while
 * failing a near-hard requirement.
 */
export function scoreTotal(factors, bonuses, penalties, rubric) {
  let base = 0;
  for (const k in factors) base += factors[k] || 0;
  let bon = (bonuses || []).reduce((s, p) => s + p, 0);
  let pen = (penalties || []).reduce((s, p) => s + p, 0);

  let total = base + bon + pen;
  let gated = false;
  if (factors.school === 0) {            // off-anchor → veto
    const cap = rubric.school_veto_cap;
    if (total > cap) { total = cap; gated = true; }
  }
  total = Math.max(0, Math.min(10, total));
  return { total, gated, base, bon, pen };
}
