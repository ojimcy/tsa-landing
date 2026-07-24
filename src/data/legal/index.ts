// SYNC NOTE
//
// These files are a byte-for-byte copy of tsa-dev/tsa-app/constants/legal/.
// The app renders the same documents natively; the stores check that the
// in-app policy and the policy at the listed URL agree, so the two copies must
// not drift. When you change one, copy the whole directory across and bump
// `version` + `effectiveDate` in both:
//
//   cp tsa-app/constants/legal/*.ts tsa-landing/src/data/legal/
//
// The two repos share no package, which is why this is a copy and not an
// import.

export { COMPANY, LEGAL_URLS } from './company';
export { PRIVACY_POLICY } from './privacy';
export { TERMS_OF_SERVICE } from './terms';
export type { LegalDocument, LegalSection } from './types';
