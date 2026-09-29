import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? path.resolve('/tmp', 'etebox_data') : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'etebox_database.json');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'etebox_database.json');

// Ensure data directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (isVercel && fs.existsSync(SEED_FILE) && !fs.existsSync(DB_FILE)) {
    fs.copyFileSync(SEED_FILE, DB_FILE);
  }
} catch (e) {
  console.warn('[DB] Could not ensure DATA_DIR:', e);
}

// Password hashing helper using crypto.scrypt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, actualSalt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: actualSalt
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch {
    return false;
  }
}

// Schemas
export interface User {
  id: string; // Permanent Telegram User ID
  username?: string;
  first_name?: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  registered_at: string;
  last_activity_at: string;
  last_auto_reward_at?: string;
  verification_status: 'verified' | 'pending';
  last_verification_at: string;
  failed_verification_attempts: number;
  is_banned: boolean;
  banned_reason?: string;
  referred_by?: string;
  referral_count: number;
  unlocked_channels?: string[];
}

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  permissions: string[];
  status: 'active' | 'disabled';
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_username: string;
  action: string;
  target?: string;
  details?: string;
  timestamp: string;
}

export interface BotSettings {
  main_bot_token: string;
  is_main_active: boolean;
  main_bot_username?: string;
  main_bot_first_name?: string;
  status: 'online' | 'offline' | 'token_invalid' | 'telegram_error';
  last_error?: string;
  backup_bot_token?: string;
  backup_bot_active?: boolean;
  backup_bot_username?: string;
  backup_bot_url?: string;
  store_url?: string;
  auto_notify_free_content: boolean;
}

export interface StarTransaction {
  id: string;
  user_id: string;
  amount: number; // positive or negative
  balance_before: number;
  balance_after: number;
  type: 'AUTO_REWARD' | 'REFERRAL' | 'ADMIN_ADD' | 'ADMIN_DEDUCT' | 'PURCHASE' | 'CODE_REDEEM' | 'GAME_REWARD' | 'CHANNEL_UNLOCK' | 'OTHER';
  description: string;
  timestamp: string;
  admin_id?: string;
}

export interface StarPackage {
  id: string;
  name: string;
  stars_amount: number;
  price_usd: number;
  payment_url: string;
  payment_info: string;
  is_active: boolean;
}

export interface StarCode {
  id: string;
  code: string;
  stars_amount: number;
  is_active: boolean;
  is_used: boolean;
  used_by_user_id?: string;
  used_by_username?: string;
  used_at?: string;
  created_at: string;
}

export interface FreeVideo {
  id: string;
  title: string;
  delivery_type: 'DIRECT_VIDEO' | 'EXTERNAL_CLOUD' | 'TELEGRAM_CHANNEL';
  direct_video_url?: string;
  file_size_mb?: number;
  telegram_message_url?: string;
  download_url?: string;
  download_code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface PaidFile {
  id: string;
  file_name: string;
  sample_url: string;
  download_url: string;
  file_code: string;
  zip_password?: string;
  price_stars: number;
  is_active: boolean;
  created_at: string;
}

export interface FilePurchase {
  id: string;
  user_id: string;
  file_id: string;
  file_name: string;
  price_paid: number;
  file_code: string;
  zip_password?: string;
  purchased_at: string;
  telegram_message_id?: number;
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  display_order: number;
  is_active: boolean;
  required_stars: number; // 0 = free, >0 = required stars to unlock
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  status: 'pending' | 'qualified';
  stars_rewarded: number;
  created_at: string;
  qualified_at?: string;
}

export interface HumanVerification {
  id: string;
  user_id: string;
  question: string;
  options: number[];
  correct_answer: number;
  status: 'pending' | 'passed' | 'failed';
  created_at: string;
}

export interface Broadcast {
  id: string;
  text: string;
  image_url?: string;
  button_text?: string;
  button_url?: string;
  total_users: number;
  sent_count: number;
  failed_count: number;
  blocked_count: number;
  status: 'pending' | 'running' | 'completed';
  created_at: string;
}

export interface GameRecord {
  id: string;
  user_id: string;
  game_type: 'LUCKY_DICE' | 'MYSTERY_BOX' | 'LUCKY_WHEEL';
  result_details: string;
  reward_stars: number;
  timestamp: string;
}

export interface ScheduledDeleteMessage {
  id: string;
  chat_id: string;
  message_id: number;
  delete_at: number; // Unix timestamp in ms
}

export interface DatabaseSchema {
  users: Record<string, User>;
  admins: Record<string, Admin>;
  admin_logs: AdminLog[];
  bot_settings: BotSettings;
  star_transactions: StarTransaction[];
  star_packages: StarPackage[];
  star_codes: Record<string, StarCode>;
  free_videos: FreeVideo[];
  files: PaidFile[];
  file_purchases: FilePurchase[];
  channels: Channel[];
  referrals: Referral[];
  human_verifications: Record<string, HumanVerification>;
  broadcasts: Broadcast[];
  game_records: GameRecord[];
  scheduled_deletions: ScheduledDeleteMessage[];
}

function getInitialDatabase(): DatabaseSchema {
  // Hash initial password for Abood: 321325
  const adminAuth = hashPassword('321325');

  return {
    users: {},
    admins: {
      admin_initial: {
        id: 'admin_initial',
        username: 'Abood',
        password_hash: adminAuth.hash,
        salt: adminAuth.salt,
        permissions: ['all'],
        status: 'active',
        created_at: new Date().toISOString()
      }
    },
    admin_logs: [
      {
        id: crypto.randomUUID(),
        admin_username: 'SYSTEM',
        action: 'DATABASE_INITIALIZED',
        details: 'Central persistent database initialized with initial admin account.',
        timestamp: new Date().toISOString()
      }
    ],
    bot_settings: {
      main_bot_token: '',
      is_main_active: false,
      status: 'offline',
      auto_notify_free_content: true,
      store_url: 'https://etebox.com/store',
      backup_bot_url: 'https://t.me/EteboxBackupBot'
    },
    star_transactions: [],
    star_packages: [
      {
        id: 'pkg_100',
        name: '⭐ 100 Stars',
        stars_amount: 100,
        price_usd: 1.99,
        payment_url: 'https://etebox.com/pay/100',
        payment_info: 'Instant activation after payment confirmation',
        is_active: true
      },
      {
        id: 'pkg_250',
        name: '⭐ 250 Stars',
        stars_amount: 250,
        price_usd: 4.49,
        payment_url: 'https://etebox.com/pay/250',
        payment_info: 'Popular pack with 10% bonus value',
        is_active: true
      },
      {
        id: 'pkg_500',
        name: '⭐ 500 Stars',
        stars_amount: 500,
        price_usd: 7.99,
        payment_url: 'https://etebox.com/pay/500',
        payment_info: 'Best value pack with 20% bonus value',
        is_active: true
      }
    ],
    star_codes: {
      igkgktk: {
        id: 'code_1',
        code: 'igkgktk',
        stars_amount: 100,
        is_active: true,
        is_used: false,
        created_at: new Date().toISOString()
      },
      Hkdorigi: {
        id: 'code_2',
        code: 'Hkdorigi',
        stars_amount: 300,
        is_active: true,
        is_used: false,
        created_at: new Date().toISOString()
      }
    },
    free_videos: [
      {
        id: 'free_vid_1',
        title: '🎬 Free Video 1',
        delivery_type: 'EXTERNAL_CLOUD',
        download_url: 'https://example.com/file/free-video-1',
        download_code: 'A7K92X',
        description: 'Exclusive introduction sample video',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'free_vid_2',
        title: '🎬 Telegram Channel Free Video',
        delivery_type: 'TELEGRAM_CHANNEL',
        telegram_message_url: 'https://t.me/etebox_channel/10',
        description: 'Direct channel delivery preview',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    files: [
      {
        id: 'file_1',
        file_name: 'File 1 Sample Pack',
        sample_url: 'https://example.com/sample/file1.mp4',
        download_url: 'https://example.com/download/file1_full.zip',
        file_code: 'A7K92X',
        zip_password: '12345',
        price_stars: 10,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'file_2',
        file_name: 'File 2 Premium Collection',
        sample_url: 'https://example.com/sample/file2.mp4',
        download_url: 'https://example.com/download/file2_full.zip',
        file_code: 'B9M41Z',
        zip_password: '98765',
        price_stars: 25,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    file_purchases: [],
    channels: [
      {
        id: 'chan_1',
        name: '📢 Official Announcements',
        url: 'https://t.me/etebox_official',
        display_order: 1,
        is_active: true,
        required_stars: 0
      },
      {
        id: 'chan_2',
        name: '🎁 VIP Drops Channel',
        url: 'https://t.me/etebox_drops',
        display_order: 2,
        is_active: true,
        required_stars: 50
      }
    ],
    referrals: [],
    human_verifications: {},
    broadcasts: [],
    game_records: [],
    scheduled_deletions: []
  };
}

class DatabaseManager {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private mutexLock: Promise<void> = Promise.resolve();

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge with defaults to ensure all tables exist even after schema changes
        const defaults = getInitialDatabase();
        const merged = {
          ...defaults,
          ...parsed,
          bot_settings: { ...defaults.bot_settings, ...parsed.bot_settings }
        };
        if (Array.isArray(merged.channels)) {
          merged.channels = merged.channels.map((c: any) => ({
            ...c,
            required_stars: typeof c.required_stars === 'number' ? c.required_stars : 0
          }));
        }
        return merged;
      }
      if (isVercel && fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const defaults = getInitialDatabase();
        const merged = {
          ...defaults,
          ...parsed,
          bot_settings: { ...defaults.bot_settings, ...parsed.bot_settings }
        };
        this.saveSync(merged);
        return merged;
      }
    } catch (err) {
      console.error('[DB] Error loading database file, initializing defaults:', err);
    }

    const init = getInitialDatabase();
    this.saveSync(init);
    return init;
  }

  private saveSync(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Error saving database:', err);
    }
  }

  public async atomic<T>(fn: (db: DatabaseSchema) => Promise<T> | T): Promise<T> {
    // Chain onto mutex to ensure 100% strict concurrency isolation
    let release: () => void = () => {};
    const waitPromise = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previousLock = this.mutexLock;
    this.mutexLock = waitPromise;

    try {
      await previousLock;
      const result = await fn(this.data);
      this.saveSync(this.data);
      return result;
    } finally {
      release();
    }
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }
}

export const db = new DatabaseManager();
