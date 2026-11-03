// Re-exports so the Excel builder can reference the report types without
// importing the heavy builder modules at runtime (types are compile-time only).
export type { AgentReport } from "./agent";
export type { TeamReport } from "./team";
export type { CentreReport } from "./centre";
