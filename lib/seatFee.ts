/**
 * The tracker seat's price and the seats an AI plan includes, as the price page
 * states them (MOTIR-8382). PAGE COPY, not a catalog read: motir-ai's public
 * plan ladder carries no seat field by design (it prices the org's AI plan, and
 * seats are billed separately by motir-core), so the one money literal on the
 * site lives here and is passed into one per-locale string.
 */
export const TRACKER_SEAT_FEE_USD_PER_MONTH = 5

/**
 * The same seat billed annually: motir-core's `BILLING_CATALOG.seatPlan`
 * annual price (`tracker_annual`, lib/billing/catalog.ts), eight months of the
 * monthly fee, the same ~33% off the plans' annual prices take. Keep the two
 * in step with that catalog.
 */
export const TRACKER_SEAT_FEE_USD_PER_YEAR = 40

/** Motir seats every paid AI plan includes at no charge. */
export const INCLUDED_TRACKER_SEATS = 1
