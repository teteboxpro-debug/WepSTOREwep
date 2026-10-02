import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseInstance: SupabaseClient | null = null;
let connectionVerified = false;
let lastConnectionCheck: { ok: boolean; message: string; timestamp: string } = {
  ok: false,
  message: 'Supabase client not initialized yet',
  timestamp: new Date().toISOString()
};

export const SUPABASE_CONFIG = {
  get url(): string {
    return process.env.SUPABASE_URL || 'https://vwgsxbraktgmlibmgils.supabase.co';
  },
  get secretKey(): string {
    return process.env.SUPABASE_SECRET_KEY || '';
  },
  get isConfigured(): boolean {
    return Boolean(this.url && this.secretKey && this.secretKey !== 'your_supabase_secret_key_here');
  }
};

/**
 * Returns the server-side Supabase client.
 * Uses service role key for full database persistence and RPC access.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  if (!SUPABASE_CONFIG.isConfigured) {
    lastConnectionCheck = {
      ok: false,
      message: 'SUPABASE_SECRET_KEY is missing or unconfigured. Please configure SUPABASE_SECRET_KEY in server environment.',
      timestamp: new Date().toISOString()
    };
    return null;
  }

  try {
    supabaseInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      }
    });

    return supabaseInstance;
  } catch (err: any) {
    lastConnectionCheck = {
      ok: false,
      message: `Failed to initialize Supabase client: ${err.message}`,
      timestamp: new Date().toISOString()
    };
    return null;
  }
}

/**
 * Verifies live connection to Supabase PostgreSQL database
 */
export async function verifySupabaseConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  const client = getSupabase();
  if (!client) {
    return {
      ok: false,
      message: SUPABASE_CONFIG.secretKey
        ? 'Supabase client failed to initialize'
        : 'SUPABASE_SECRET_KEY environment variable is missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY for permanent persistence.'
    };
  }

  try {
    // Perform a lightweight probe query
    const { error } = await client
      .from('bot_settings')
      .select('id, store_url')
      .limit(1);

    if (error) {
      // Table might not exist yet or permissions issue
      if (error.code === '42P01') {
        // relation does not exist
        lastConnectionCheck = {
          ok: true,
          message: 'Connected to Supabase, but schema tables need to be created. Run server/schema.sql in Supabase SQL editor.',
          timestamp: new Date().toISOString()
        };
        connectionVerified = true;
        return { ok: true, message: lastConnectionCheck.message, details: error };
      }

      lastConnectionCheck = {
        ok: false,
        message: `Supabase query error: ${error.message} (${error.code || 'UNKNOWN'})`,
        timestamp: new Date().toISOString()
      };
      return { ok: false, message: lastConnectionCheck.message };
    }

    lastConnectionCheck = {
      ok: true,
      message: 'Successfully connected to Supabase PostgreSQL permanent database.',
      timestamp: new Date().toISOString()
    };
    connectionVerified = true;
    return { ok: true, message: lastConnectionCheck.message };
  } catch (err: any) {
    lastConnectionCheck = {
      ok: false,
      message: `Supabase connection check failed: ${err.message}`,
      timestamp: new Date().toISOString()
    };
    return { ok: false, message: lastConnectionCheck.message };
  }
}

export function getSupabaseStatus() {
  return {
    isConfigured: SUPABASE_CONFIG.isConfigured,
    url: SUPABASE_CONFIG.url,
    projectId: 'vwgsxbraktgmlibmgils',
    verified: connectionVerified,
    lastCheck: lastConnectionCheck
  };
}
