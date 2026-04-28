/**
 * @generated_by SovereignFactory
 * @domain kernel
 * @layer infrastructure
 */

const EventEmitter = require('events');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

let _redis = null;
let _supabase = null;
const _eventBus = new EventEmitter();

/**
 * Resets the lazy-loaded memory systems.
 * Used primarily for unit testing isolation.
 */
function resetMemorySystems() {
  if (_redis) {
    try { _redis.quit(); } catch (e) {}
    _redis = null;
  }
  _supabase = null;
}

/**
 * Returns the shared memory system clients (Redis and Supabase).
 * Initializes them on first call using environment variables.
 */
function getMemorySystems() {
  if (!_redis) {
    const rawUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redisUrl = rawUrl.trim();
    
    const useTls = redisUrl.toLowerCase().includes('rediss://') || redisUrl.toLowerCase().includes('cache.amazonaws.com');
    const connectionString = redisUrl.includes('://') ? redisUrl : `${useTls ? 'rediss' : 'redis'}://${redisUrl}`;
    const redisOptions = useTls ? { tls: {} } : {};

    _redis = new Redis(connectionString, redisOptions);
    _redis.on('error', (err) => console.error('[Redis] Connection Error:', err.message));
  }
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }
  return { redis: _redis, supabase: _supabase };
}

module.exports = { getMemorySystems, resetMemorySystems, eventBus: _eventBus };