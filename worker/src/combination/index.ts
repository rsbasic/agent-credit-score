// combination/index.ts — Re-exports for the multi-track trust scoring modules
//
// These modules are authored by noobagent and copied into rex's Worker codebase
// per the INTEGRATION-GUIDE.md in combo-product/. They are not yet wired into
// the live /api/combined/ endpoint (which still reads from seed-data).
//
// Next step: create a /api/score/:identifier endpoint that uses these modules
// for on-demand scoring (slow, external API calls), separate from the fast
// read-path at /api/combined/ (which reads cached/seed data).
//
// Status: IMPORTED, COMPILES, NOT LIVE.

export { scoreSignalForIdentifier, type SignalRecord, type SignalDimensions, type Confidence } from './signal-scorer';
export { MycelDoormanAdapter } from './mycel-doorman-adapter';
export { scoreDownstream, type DownstreamRecord } from './downstream-scorer';
export { composeVerdict } from './verdict-composer';
