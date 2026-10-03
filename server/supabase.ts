import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseInstance: SupabaseClient | null = null;
let connectionVerified = false;
let lastConnectionCheck: {
  ok: boolean;
  status: 'CONNECTED' | 'CONNECTION_FAILED' | 'SCHEMA_MISSING';
  displayStatus: 'Database: Connected' | 'Database: Not Connected' | 'Database: Schema Missing';
  message: string;
  reason?: string;
  projectId: string;
  url: string;
  tablesVerified?: string[];
  missingTables?: string[];
  timestamp: string;
} = {
  ok: false,
  status: 'CONNECTION_FAILED',
  displayStatus: 'Database: Not Connected',
  message: 'Supabase client not initialized yet',
  reason: 'Server is starting up',
  projectId: 'vwgsxbraktgmlibmgils',
  url: 'https://vwgsxbraktgmlibmgils.supabase.co',
  timestamp: new Date().toISOString()
};

export const SUPABASE_CONFIG = {
  get url(): string {
    return process.env.SUPABASE_URL || 'https://vwgsxbraktgmlibmgils.supabase.co';
  },
  get secretKey(): string {
    return process.env.SUPABASE_SECRET_KEY || '';
  },
  get projectId(): string {
    const match = this.url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
    return match ? match[1] : 'vwgsxbraktgmlibmgils';
  },
  get isConfigured(): boolean {
    return Boolean(this.url && this.secretKey && this.secretKey !== 'your_supabase_secret_key_here');
  }
};

/**
 * Returns the server-side Supabase client.
 * Uses service role key for full database persistence and RPC access.
 * NEVER exposed to frontend JavaScript.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  if (!SUPABASE_CONFIG.isConfigured) {
    lastConnectionCheck = {
      ok: false,
      status: 'CONNECTION_FAILED',
      displayStatus: 'Database: Not Connected',
      message: 'Supabase PostgreSQL: CONNECTION FAILED',
      reason: 'SUPABASE_SECRET_KEY is missing or unconfigured in server environment. Set SUPABASE_URL and SUPABASE_SECRET_KEY in server environment for permanent persistence.',
      projectId: SUPABASE_CONFIG.projectId,
      url: SUPABASE_CONFIG.url,
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
      status: 'CONNECTION_FAILED',
      displayStatus: 'Database: Not Connected',
      message: 'Supabase PostgreSQL: CONNECTION FAILED',
      reason: `Failed to initialize Supabase client: ${err.message}`,
      projectId: SUPABASE_CONFIG.projectId,
      url: SUPABASE_CONFIG.url,
      timestamp: new Date().toISOString()
    };
    return null;
  }
}

/**
 * Verifies live connection to Supabase PostgreSQL database
 * Performs a real server-side query and checks schema tables.
 * Returns safe diagnostic info WITHOUT exposing secret keys.
 */
export async function verifySupabaseConnection(): Promise<{
  ok: boolean;
  status: 'CONNECTED' | 'CONNECTION_FAILED' | 'SCHEMA_MISSING';
  displayStatus: 'Database: Connected' | 'Database: Not Connected' | 'Database: Schema Missing';
  message: string;
  reason?: string;
  projectId: string;
  url: string;
  tablesVerified?: string[];
  missingTables?: string[];
}> {
  const client = getSupabase();
  const projectId = SUPABASE_CONFIG.projectId;
  const url = SUPABASE_CONFIG.url;

  if (!client) {
    lastConnectionCheck = {
      ok: false,
      status: 'CONNECTION_FAILED',
      displayStatus: 'Database: Not Connected',
      message: 'Supabase PostgreSQL: CONNECTION FAILED',
      reason: SUPABASE_CONFIG.secretKey
        ? 'Supabase client failed to initialize'
        : 'SUPABASE_SECRET_KEY is missing or unconfigured in server environment.',
      projectId,
      url,
      timestamp: new Date().toISOString()
    };
    connectionVerified = false;
    return lastConnectionCheck;
  }

  try {
    const requiredTables = ['bot_settings', 'users', 'video_packages', 'star_transactions'];
    const tablesVerified: string[] = [];
    const missingTables: string[] = [];

    // Probe bot_settings first
    const { error: settingsErr } = await client
      .from('bot_settings')
      .select('id')
      .limit(1);

    if (settingsErr) {
      if (settingsErr.code === '42P01') {
        // PostgreSQL error code 42P01 = undefined_table (relation does not exist)
        lastConnectionCheck = {
          ok: false,
          status: 'SCHEMA_MISSING',
          displayStatus: 'Database: Schema Missing',
          message: 'Supabase PostgreSQL: SCHEMA MISSING',
          reason: 'Connected to Supabase PostgreSQL, but required database tables are not yet created. Execute server/schema.sql in Supabase SQL Editor.',
          projectId,
          url,
          timestamp: new Date().toISOString()
        };
        connectionVerified = false;
        return lastConnectionCheck;
      }

      // Other error (auth, networking, invalid key)
      const safeReason = settingsErr.message.includes('JWT')
        ? 'Invalid or expired SUPABASE_SECRET_KEY'
        : `Database query error: ${settingsErr.message}`;

      lastConnectionCheck = {
        ok: false,
        status: 'CONNECTION_FAILED',
        displayStatus: 'Database: Not Connected',
        message: 'Supabase PostgreSQL: CONNECTION FAILED',
        reason: safeReason,
        projectId,
        url,
        timestamp: new Date().toISOString()
      };
      connectionVerified = false;
      return lastConnectionCheck;
    }

    tablesVerified.push('bot_settings');

    // Check remaining key tables
    for (const tbl of ['users', 'video_packages', 'star_transactions']) {
      const { error: tblErr } = await client.from(tbl).select('id').limit(1);
      if (tblErr && tblErr.code === '42P01') {
        missingTables.push(tbl);
      } else if (!tblErr) {
        tablesVerified.push(tbl);
      }
    }

    if (missingTables.length > 0) {
      lastConnectionCheck = {
        ok: false,
        status: 'SCHEMA_MISSING',
        displayStatus: 'Database: Schema Missing',
        message: 'Supabase PostgreSQL: SCHEMA MISSING',
        reason: `Some tables are missing: ${missingTables.join(', ')}. Please run server/schema.sql in Supabase SQL Editor.`,
        projectId,
        url,
        tablesVerified,
        missingTables,
        timestamp: new Date().toISOString()
      };
      connectionVerified = false;
      return lastConnectionCheck;
    }

    lastConnectionCheck = {
      ok: true,
      status: 'CONNECTED',
      displayStatus: 'Database: Connected',
      message: 'Supabase PostgreSQL: CONNECTED',
      projectId,
      url,
      tablesVerified,
      timestamp: new Date().toISOString()
    };
    connectionVerified = true;
    return lastConnectionCheck;
  } catch (err: any) {
    lastConnectionCheck = {
      ok: false,
      status: 'CONNECTION_FAILED',
      displayStatus: 'Database: Not Connected',
      message: 'Supabase PostgreSQL: CONNECTION FAILED',
      reason: `Connection check exception: ${err.message || 'Network error'}`,
      projectId,
      url,
      timestamp: new Date().toISOString()
    };
    connectionVerified = false;
    return lastConnectionCheck;
  }
}

export function getSupabaseStatus() {
  return {
    isConfigured: SUPABASE_CONFIG.isConfigured,
    url: SUPABASE_CONFIG.url,
    projectId: SUPABASE_CONFIG.projectId,
    verified: connectionVerified,
    status: lastConnectionCheck.status,
    displayStatus: lastConnectionCheck.displayStatus,
    message: lastConnectionCheck.message,
    reason: lastConnectionCheck.reason,
    lastCheck: lastConnectionCheck
  };
}
