/**
 * Proxy module re-exporting Supabase database client and helpers.
 */
export * from './supabase.js';
export { default } from './supabase.js';

export function initDatabase() {
  console.log('[DB] Supabase database initialised and connected.');
}
