/**
 * One-off client/agent load — spec §8. NOT yet implemented; this is Phase 2 scope
 * (§23 "Phase 2 — Clients & Agents"). Placeholder so the workspace resolves and the
 * root `npm run load:clients-agents` command fails clearly instead of silently.
 *
 * When built, this reads export_clients.csv / export_agents.csv (§8.1), applies the
 * field mapping (§8.2, §8.3) and transformations (§8.4), and upserts keyed on
 * `reference` so the load is re-runnable (§8.8).
 */
console.log('Client/agent load script not yet implemented — see docs/PeopleTrackers_V1_Build_Specification.md §8.');
process.exit(1);
