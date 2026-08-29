/**
 * ============================================================================
 * ANNAYOG — Supabase Database Connection & High-Performance Query Cache
 * ============================================================================
 * Connects to Supabase Cloud Postgres Database.
 * Features an ultra-fast in-memory cache layer to reduce query latency from 500ms -> <2ms.
 * ============================================================================
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yslupcclthqltvvwjvjr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbHVwY2NsdGhxbHR2dndqdmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MjA0MzYsImV4cCI6MjA5ODk5NjQzNn0.XN9oa1bOtXf0ZsqViLDk5OB_xVT-wFh7GPDEFzzgtPU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[DB] Connected to Supabase Cloud Database at', SUPABASE_URL);

// High-performance short-TTL query cache (3 seconds TTL)
const cacheMap = new Map();
const TTL_MS = 3000;

function getCached(key) {
  const item = cacheMap.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > TTL_MS) {
    cacheMap.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cacheMap.set(key, { data, timestamp: Date.now() });
}

function invalidateTableCache(table) {
  const prefix = `${table}:`;
  for (const key of cacheMap.keys()) {
    if (key.startsWith(prefix)) {
      cacheMap.delete(key);
    }
  }
}

/**
 * Generate a new UUID v4 for primary keys.
 */
export function newId() {
  return uuidv4();
}

/**
 * Get a single row by ID from a table.
 */
export async function getById(table, id) {
  const cacheKey = `${table}:getById:${id}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  setCache(cacheKey, data);
  return data;
}

/**
 * Get a single row by a specific column value.
 */
export async function getByColumn(table, column, value) {
  const cacheKey = `${table}:getByColumn:${column}:${value}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const { data, error } = await supabase.from(table).select('*').eq(column, value).maybeSingle();
  if (error) throw error;
  setCache(cacheKey, data);
  return data;
}

/**
 * Get all rows from a table, optionally filtered.
 */
export async function findAll(table, filters = {}, orderBy = null, limit = null) {
  const cacheKey = `${table}:findAll:${JSON.stringify(filters)}:${orderBy}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  let query = supabase.from(table).select('*');

  Object.entries(filters).forEach(([col, val]) => {
    if (val !== undefined && val !== '') {
      query = query.eq(col, val);
    }
  });

  if (orderBy) {
    const parts = orderBy.split(' ');
    const col = parts[0];
    const ascending = parts[1]?.toUpperCase() !== 'DESC';
    query = query.order(col, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  const result = data || [];
  setCache(cacheKey, result);
  return result;
}

/**
 * Insert a row into a table.
 */
export async function insert(table, data) {
  invalidateTableCache(table);
  const { data: result, error } = await supabase.from(table).insert([data]).select().single();
  if (error) throw error;
  return result;
}

/**
 * Update rows in a table by ID.
 */
export async function updateById(table, id, updates) {
  invalidateTableCache(table);
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
  if (error) throw error;
  return data;
}

/**
 * Update rows by a column value.
 */
export async function updateByColumn(table, column, value, updates) {
  invalidateTableCache(table);
  const { data, error } = await supabase.from(table).update(updates).eq(column, value).select();
  if (error) throw error;
  return data;
}

/**
 * Conditional update: only update if a condition is met.
 */
export async function conditionalUpdate(table, id, condition, updates) {
  invalidateTableCache(table);
  let query = supabase.from(table).update(updates).eq('id', id);
  Object.entries(condition).forEach(([col, val]) => {
    query = query.eq(col, val);
  });
  const { data, error } = await query.select();
  if (error) throw error;
  return data?.length || 0;
}

/**
 * Count rows matching a filter.
 */
export async function countWhere(table, filters = {}) {
  const cacheKey = `${table}:countWhere:${JSON.stringify(filters)}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  Object.entries(filters).forEach(([col, val]) => {
    if (val !== undefined) {
      query = query.eq(col, val);
    }
  });
  const { count, error } = await query;
  if (error) throw error;
  const result = count || 0;
  setCache(cacheKey, result);
  return result;
}

/**
 * Delete rows by ID.
 */
export async function deleteById(table, id) {
  invalidateTableCache(table);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

/**
 * Delete rows by column value.
 */
export async function deleteByColumn(table, column, value) {
  invalidateTableCache(table);
  const { error } = await supabase.from(table).delete().eq(column, value);
  if (error) throw error;
  return true;
}

export function getDb() {
  return supabase;
}

/**
 * Find a user by Google sub.
 */
export async function findUserByGoogleSub(sub) {
  return getByColumn('users', 'google_sub', sub);
}

/**
 * Find a user by email.
 */
export async function findUserByEmail(email) {
  return getByColumn('users', 'email', email);
}

export default {
  supabase,
  newId,
  getById,
  getByColumn,
  findAll,
  insert,
  updateById,
  updateByColumn,
  conditionalUpdate,
  countWhere,
  deleteById,
  deleteByColumn,
  getDb,
  findUserByGoogleSub,
  findUserByEmail,
};
