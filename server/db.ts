import fs from 'node:fs';
import path from 'node:path';
import { getSupabase, verifySupabaseConnection, SUPABASE_CONFIG, getSupabaseStatus } from './supabase';

// Types matching database schema
export interface User {
  id: string; // string representation of telegram_user_id
  telegram_user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  registered_at: string;
  last_activity_at: string;
  last_reward_at?: string;
  verification_status: 'verified' | 'pending';
  failed_verification_attempts: number;
  referral_count: number;
  referred_by?: string;
  is_banned: boolean;
  banned_reason?: string;
  unlocked_channels?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
  permissions: string[];
  status: 'active' | 'disabled';
  created_at: string;
}

export interface BotSettings {
  bot_token?: string;
  store_url: string;
  backup_bot_url: string;
  auto_notify_free_content: boolean;
  reward_stars: number;
  reward_hours: number;
  webhook_url?: string;
  webhook_secret?: string;
  updated_at?: string;
}

export interface StarTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  type: string;
  description: string;
  reference_id?: string;
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
  created_at?: string;
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

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  reward_amount: number;
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
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  display_order: number;
  is_active: boolean;
  required_stars: number;
  created_at?: string;
}

export interface ChannelUnlock {
  id: string;
  user_id: string;
  channel_id: string;
  unlocked_at: string;
}

export interface VideoPackage {
  id: string;
  package_name: string;
  number_of_videos: number;
  stars_price: number;
  video_urls: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoPackagePurchase {
  id: string;
  user_id: string;
  package_id: string;
  package_name: string;
  price_paid: number;
  video_count: number;
  video_urls: string[];
  purchased_at: string;
}

export interface HumanVerification {
  id: string;
  telegram_user_id: number;
  expected_answer: string;
  attempts: number;
  status: 'pending' | 'verified' | 'failed';
  expires_at: string;
  created_at: string;
}

export interface GameRecord {
  id: string;
  user_id: string;
  game_type: string;
  stars_bet: number;
  stars_won: number;
  result: string;
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

export interface ScheduledDeletion {
  id: string;
  chat_id: number;
  message_id: number;
  delete_at: string;
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

export interface EteboxDatabase {
  users: User[];
  admins: Admin[];
  bot_settings: BotSettings;
  star_transactions: StarTransaction[];
  star_packages: StarPackage[];
  star_codes: StarCode[];
  referrals: Referral[];
  free_videos: FreeVideo[];
  files: PaidFile[];
  file_purchases: FilePurchase[];
  channels: Channel[];
  channel_unlocks: ChannelUnlock[];
  video_packages: VideoPackage[];
  video_package_purchases: VideoPackagePurchase[];
  human_verifications: HumanVerification[];
  game_records: GameRecord[];
  broadcasts: Broadcast[];
  scheduled_deletions: ScheduledDeletion[];
  admin_logs: AdminLog[];
}

function createInitialState(): EteboxDatabase {
  return {
    users: [],
    admins: [
      {
        id: 'admin_1',
        username: 'Abood',
        password_hash: '321325',
        permissions: ['all'],
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    bot_settings: {
      bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
      store_url: 'https://etebox.com/store',
      backup_bot_url: 'https://t.me/EteboxBackupBot',
      auto_notify_free_content: true,
      reward_stars: 3,
      reward_hours: 8,
      updated_at: new Date().toISOString()
    },
    star_transactions: [],
    star_packages: [
      {
        id: 'pkg_1',
        name: 'Starter Star Pack',
        stars_amount: 50,
        price_usd: 1.99,
        payment_url: 'https://pay.example.com/starter',
        payment_info: 'Instant activation via Crypto/Card',
        is_active: true
      },
      {
        id: 'pkg_2',
        name: 'Standard Star Pack',
        stars_amount: 150,
        price_usd: 4.99,
        payment_url: 'https://pay.example.com/standard',
        payment_info: 'Instant activation via Crypto/Card',
        is_active: true
      },
      {
        id: 'pkg_3',
        name: 'VIP Mega Pack',
        stars_amount: 500,
        price_usd: 14.99,
        payment_url: 'https://pay.example.com/vip',
        payment_info: 'Instant VIP perks included',
        is_active: true
      }
    ],
    star_codes: [
      {
        id: 'code_welcome',
        code: 'WELCOME50',
        stars_amount: 50,
        is_active: true,
        is_used: false,
        created_at: new Date().toISOString()
      },
      {
        id: 'code_promo',
        code: 'ETEBOX2026',
        stars_amount: 100,
        is_active: true,
        is_used: false,
        created_at: new Date().toISOString()
      }
    ],
    referrals: [],
    free_videos: [
      {
        id: 'fv_1',
        title: 'Exclusive Action Trailer 4K',
        delivery_type: 'DIRECT_VIDEO',
        direct_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        file_size_mb: 28.5,
        description: 'Instant preview of premium catalog files.',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    files: [
      {
        id: 'file_1',
        file_name: 'Premium Archive Vol.1',
        sample_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        download_url: 'https://mega.nz/file/etebox_vault_vol1',
        file_code: 'ETB-9021',
        zip_password: 'Pass2026@etebox',
        price_stars: 20,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    file_purchases: [],
    channels: [
      {
        id: 'ch_1',
        name: 'ETEBOX Official Updates',
        url: 'https://t.me/etebox_official',
        display_order: 1,
        is_active: true,
        required_stars: 0
      },
      {
        id: 'ch_2',
        name: 'VIP Private Vault Channel',
        url: 'https://t.me/+etebox_vip_vault',
        display_order: 2,
        is_active: true,
        required_stars: 35
      }
    ],
    channel_unlocks: [],
    video_packages: [
      {
        id: 'vp_1',
        package_name: '5 Videos Package',
        number_of_videos: 5,
        stars_price: 40,
        video_urls: [
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
        ],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'vp_2',
        package_name: '2 Videos Package',
        number_of_videos: 2,
        stars_price: 20,
        video_urls: [
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4'
        ],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    video_package_purchases: [],
    human_verifications: [],
    game_records: [],
    broadcasts: [],
    scheduled_deletions: [],
    admin_logs: [
      {
        id: 'log_init',
        admin_username: 'system',
        action: 'DB_INITIALIZED',
        details: 'PostgreSQL database layer initialized',
        timestamp: new Date().toISOString()
      }
    ]
  };
}

class DatabaseService {
  private data: EteboxDatabase = createInitialState();
  private isLoaded = false;
  private isSyncing = false;
  private syncQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.init().catch(err => {
      console.error('[DB] Initial Supabase sync attempt error:', err.message);
    });
  }

  /**
   * Initializes database connection, checks for legacy JSON database, and syncs with Supabase
   */
  public async init(): Promise<void> {
    if (this.isLoaded) return;

    // 1. Safely migrate existing JSON database if found on disk
    await this.migrateFromJsonIfAvailable();

    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[DB] Supabase client not configured in environment yet. Operating in-memory with preserved data.');
      this.isLoaded = true;
      return;
    }

    try {
      await verifySupabaseConnection();
      await this.pullFromSupabase();
      // Ensure all migrated data is persisted to Supabase
      await this.syncToSupabase();
      this.isLoaded = true;
      console.log('[DB] Successfully synchronized state with Supabase PostgreSQL database.');
    } catch (err: any) {
      console.error('[DB] Failed to synchronize data with Supabase:', err.message);
      this.isLoaded = true;
    }
  }

  /**
   * Reads existing data from data/etebox_database.json (if present)
   * and migrates it idempotently into memory and Supabase.
   */
  private async migrateFromJsonIfAvailable(): Promise<void> {
    const jsonPaths = [
      path.resolve(process.cwd(), 'data', 'etebox_database.json'),
      path.resolve('/tmp', 'etebox_data', 'etebox_database.json')
    ];

    let sourceFile: string | null = null;
    for (const p of jsonPaths) {
      if (fs.existsSync(p)) {
        sourceFile = p;
        break;
      }
    }

    if (!sourceFile) {
      return;
    }

    try {
      console.log(`[DB Migration] Found existing JSON database at: ${sourceFile}. Starting safe migration...`);
      const fileContent = fs.readFileSync(sourceFile, 'utf8');
      const json = JSON.parse(fileContent);

      // 1. Users
      if (json.users) {
        const userList = Array.isArray(json.users) ? json.users : Object.values(json.users);
        for (const u of userList as any[]) {
          const userIdStr = String(u.id || u.telegram_user_id);
          const existing = this.data.users.find(x => x.id === userIdStr || String(x.telegram_user_id) === userIdStr);
          if (!existing) {
            this.data.users.push({
              id: userIdStr,
              telegram_user_id: !isNaN(Number(userIdStr)) ? Number(userIdStr) : 0,
              username: u.username || undefined,
              first_name: u.first_name || undefined,
              balance: Number(u.balance) || 0,
              total_earned: Number(u.total_earned) || Number(u.balance) || 0,
              total_spent: Number(u.total_spent) || 0,
              registered_at: u.registered_at || new Date().toISOString(),
              last_activity_at: u.last_activity_at || u.last_activity || new Date().toISOString(),
              last_reward_at: u.last_auto_reward_at || u.last_reward_at || undefined,
              verification_status: u.verification_status || 'verified',
              failed_verification_attempts: Number(u.failed_verification_attempts) || 0,
              referral_count: Number(u.referral_count) || 0,
              referred_by: u.referred_by ? String(u.referred_by) : undefined,
              is_banned: Boolean(u.is_banned || u.ban_status),
              banned_reason: u.banned_reason || undefined,
              unlocked_channels: Array.isArray(u.unlocked_channels) ? u.unlocked_channels : []
            });
          }
        }
      }

      // 2. Admins
      if (json.admins) {
        const adminList = Array.isArray(json.admins) ? json.admins : Object.values(json.admins);
        for (const a of adminList as any[]) {
          if (!this.data.admins.some(x => x.username.toLowerCase() === a.username.toLowerCase())) {
            this.data.admins.push({
              id: a.id || `admin_${Date.now()}`,
              username: a.username,
              password_hash: a.password_hash,
              permissions: Array.isArray(a.permissions) ? a.permissions : ['all'],
              status: a.status || 'active',
              created_at: a.created_at || new Date().toISOString()
            });
          }
        }
      }

      // 3. Bot Settings
      if (json.bot_settings) {
        const bs = json.bot_settings;
        this.data.bot_settings = {
          bot_token: bs.bot_token || bs.main_bot_token || this.data.bot_settings.bot_token,
          store_url: bs.store_url || this.data.bot_settings.store_url,
          backup_bot_url: bs.backup_bot_url || this.data.bot_settings.backup_bot_url,
          auto_notify_free_content: bs.auto_notify_free_content ?? this.data.bot_settings.auto_notify_free_content,
          reward_stars: bs.reward_stars ?? this.data.bot_settings.reward_stars,
          reward_hours: bs.reward_hours ?? this.data.bot_settings.reward_hours,
          webhook_url: bs.webhook_url,
          webhook_secret: bs.webhook_secret,
          updated_at: new Date().toISOString()
        };
      }

      // 4. Star Transactions
      if (Array.isArray(json.star_transactions)) {
        for (const tx of json.star_transactions) {
          if (!this.data.star_transactions.some(x => x.id === tx.id)) {
            this.data.star_transactions.push({
              id: tx.id,
              user_id: String(tx.user_id),
              amount: Number(tx.amount),
              balance_before: Number(tx.balance_before),
              balance_after: Number(tx.balance_after),
              type: tx.type,
              description: tx.description,
              reference_id: tx.reference_id,
              timestamp: tx.timestamp || tx.created_at || new Date().toISOString()
            });
          }
        }
      }

      // 5. Star Packages
      if (Array.isArray(json.star_packages)) {
        for (const pkg of json.star_packages) {
          if (!this.data.star_packages.some(x => x.id === pkg.id)) {
            this.data.star_packages.push(pkg);
          }
        }
      }

      // 6. Star Codes
      if (json.star_codes) {
        const codeList = Array.isArray(json.star_codes) ? json.star_codes : Object.values(json.star_codes);
        for (const c of codeList as any[]) {
          if (!this.data.star_codes.some(x => x.code === c.code)) {
            this.data.star_codes.push({
              id: c.id || `code_${c.code}`,
              code: c.code,
              stars_amount: Number(c.stars_amount),
              is_active: Boolean(c.is_active),
              is_used: Boolean(c.is_used),
              used_by_user_id: c.used_by_user_id ? String(c.used_by_user_id) : undefined,
              used_by_username: c.used_by_username,
              used_at: c.used_at,
              created_at: c.created_at || new Date().toISOString()
            });
          }
        }
      }

      // 7. Free Videos
      if (Array.isArray(json.free_videos)) {
        for (const fv of json.free_videos) {
          if (!this.data.free_videos.some(x => x.id === fv.id)) {
            this.data.free_videos.push(fv);
          }
        }
      }

      // 8. Files & File Purchases
      if (Array.isArray(json.files)) {
        for (const f of json.files) {
          if (!this.data.files.some(x => x.id === f.id)) {
            this.data.files.push(f);
          }
        }
      }
      if (Array.isArray(json.file_purchases)) {
        for (const fp of json.file_purchases) {
          if (!this.data.file_purchases.some(x => x.id === fp.id)) {
            this.data.file_purchases.push({ ...fp, user_id: String(fp.user_id) });
          }
        }
      }

      // 9. Channels
      if (Array.isArray(json.channels)) {
        for (const ch of json.channels) {
          if (!this.data.channels.some(x => x.id === ch.id)) {
            this.data.channels.push(ch);
          }
        }
      }

      // 10. Referrals
      if (Array.isArray(json.referrals)) {
        for (const r of json.referrals) {
          if (!this.data.referrals.some(x => x.id === r.id)) {
            this.data.referrals.push({
              id: r.id,
              referrer_user_id: String(r.referrer_user_id),
              referred_user_id: String(r.referred_user_id),
              reward_amount: Number(r.stars_rewarded || r.reward_amount || 5),
              created_at: r.created_at || new Date().toISOString()
            });
          }
        }
      }

      // 11. Video packages & purchases if present in json
      if (Array.isArray(json.video_packages)) {
        for (const vp of json.video_packages) {
          if (!this.data.video_packages.some(x => x.id === vp.id)) {
            this.data.video_packages.push(vp);
          }
        }
      }
      if (Array.isArray(json.video_package_purchases)) {
        for (const vpp of json.video_package_purchases) {
          if (!this.data.video_package_purchases.some(x => x.id === vpp.id)) {
            this.data.video_package_purchases.push({ ...vpp, user_id: String(vpp.user_id) });
          }
        }
      }

      // 12. Admin logs
      if (Array.isArray(json.admin_logs)) {
        for (const l of json.admin_logs) {
          if (!this.data.admin_logs.some(x => x.id === l.id)) {
            this.data.admin_logs.push(l);
          }
        }
      }

      console.log(`[DB Migration] Safely ingested JSON database: ${this.data.users.length} users, ${this.data.star_transactions.length} transactions.`);
    } catch (err: any) {
      console.error('[DB Migration] Error migrating data from JSON:', err.message);
    }
  }

  /**
   * Reads all tables from Supabase into memory cache
   */
  private async pullFromSupabase(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. Settings
      const { data: settingsData } = await supabase.from('bot_settings').select('*').limit(1).maybeSingle();
      if (settingsData) {
        this.data.bot_settings = {
          bot_token: settingsData.bot_token || this.data.bot_settings.bot_token,
          store_url: settingsData.store_url || this.data.bot_settings.store_url,
          backup_bot_url: settingsData.backup_bot_url || this.data.bot_settings.backup_bot_url,
          auto_notify_free_content: settingsData.auto_notify_free_content ?? true,
          reward_stars: settingsData.reward_stars ?? 3,
          reward_hours: settingsData.reward_hours ?? 8,
          webhook_url: settingsData.webhook_url,
          webhook_secret: settingsData.webhook_secret,
          updated_at: settingsData.updated_at
        };
      }

      // 2. Users
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData && usersData.length > 0) {
        this.data.users = usersData.map((u: any) => ({
          id: String(u.telegram_user_id),
          telegram_user_id: Number(u.telegram_user_id),
          username: u.username || undefined,
          first_name: u.first_name || undefined,
          balance: Number(u.balance) || 0,
          total_earned: Number(u.total_earned) || 0,
          total_spent: Number(u.total_spent) || 0,
          registered_at: u.registered_at,
          last_activity_at: u.last_activity,
          last_reward_at: u.last_reward_at || undefined,
          verification_status: u.verification_status || 'verified',
          failed_verification_attempts: u.failed_verification_attempts || 0,
          referral_count: u.referral_count || 0,
          referred_by: u.referred_by ? String(u.referred_by) : undefined,
          is_banned: Boolean(u.ban_status),
          banned_reason: u.banned_reason || undefined,
          unlocked_channels: Array.isArray(u.unlocked_channels) ? u.unlocked_channels : []
        }));
      }

      // 3. Admins
      const { data: adminsData } = await supabase.from('admins').select('*');
      if (adminsData && adminsData.length > 0) {
        this.data.admins = adminsData.map((a: any) => ({
          id: a.id,
          username: a.username,
          password_hash: a.password_hash,
          permissions: Array.isArray(a.permissions) ? a.permissions : ['all'],
          status: a.status || 'active',
          created_at: a.created_at
        }));
      }

      // 4. Video Packages
      const { data: pkgData } = await supabase.from('video_packages').select('*');
      if (pkgData && pkgData.length > 0) {
        this.data.video_packages = pkgData.map((p: any) => ({
          id: p.id,
          package_name: p.package_name,
          number_of_videos: Number(p.number_of_videos),
          stars_price: Number(p.stars_price),
          video_urls: Array.isArray(p.video_urls) ? p.video_urls : [],
          active: Boolean(p.active),
          created_at: p.created_at,
          updated_at: p.updated_at
        }));
      }

      // 5. Video Purchases
      const { data: vPurchases } = await supabase.from('video_package_purchases').select('*');
      if (vPurchases) {
        this.data.video_package_purchases = vPurchases.map((vp: any) => ({
          id: vp.id,
          user_id: String(vp.user_id),
          package_id: vp.package_id,
          package_name: vp.package_name,
          price_paid: Number(vp.price_paid),
          video_count: Number(vp.video_count),
          video_urls: Array.isArray(vp.video_urls) ? vp.video_urls : [],
          purchased_at: vp.purchased_at
        }));
      }

      // 6. Star Transactions
      const { data: txData } = await supabase.from('star_transactions').select('*').order('created_at', { ascending: false }).limit(100);
      if (txData && txData.length > 0) {
        this.data.star_transactions = txData.map((t: any) => ({
          id: t.id,
          user_id: String(t.user_id),
          amount: Number(t.amount),
          balance_before: Number(t.balance_before),
          balance_after: Number(t.balance_after),
          type: t.transaction_type,
          description: t.description,
          reference_id: t.reference_id,
          timestamp: t.created_at
        }));
      }

      // 7. Free Videos
      const { data: fvData } = await supabase.from('free_videos').select('*');
      if (fvData && fvData.length > 0) {
        this.data.free_videos = fvData;
      }

      // 8. Files & File purchases
      const { data: fData } = await supabase.from('files').select('*');
      if (fData && fData.length > 0) {
        this.data.files = fData;
      }
      const { data: fpData } = await supabase.from('file_purchases').select('*');
      if (fpData) {
        this.data.file_purchases = fpData.map((fp: any) => ({
          ...fp,
          user_id: String(fp.user_id)
        }));
      }

      // 9. Star packages & Star codes
      const { data: spData } = await supabase.from('star_packages').select('*');
      if (spData && spData.length > 0) this.data.star_packages = spData;

      const { data: scData } = await supabase.from('star_codes').select('*');
      if (scData && scData.length > 0) {
        this.data.star_codes = scData.map((sc: any) => ({
          ...sc,
          used_by_user_id: sc.used_by_user_id ? String(sc.used_by_user_id) : undefined
        }));
      }

      // 10. Channels
      const { data: chData } = await supabase.from('channels').select('*');
      if (chData && chData.length > 0) this.data.channels = chData;
    } catch (err: any) {
      console.warn('[DB] Supabase pull notice:', err.message);
    }
  }

  /**
   * Synchronizes current memory state changes to Supabase PostgreSQL
   */
  public async syncToSupabase(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. Sync Bot Settings
      await supabase.from('bot_settings').upsert({
        id: 'current',
        bot_token: this.data.bot_settings.bot_token,
        store_url: this.data.bot_settings.store_url,
        backup_bot_url: this.data.bot_settings.backup_bot_url,
        auto_notify_free_content: this.data.bot_settings.auto_notify_free_content,
        reward_stars: this.data.bot_settings.reward_stars,
        reward_hours: this.data.bot_settings.reward_hours,
        webhook_url: this.data.bot_settings.webhook_url,
        webhook_secret: this.data.bot_settings.webhook_secret,
        updated_at: new Date().toISOString()
      });

      // 2. Sync Users (upsert all users in cache)
      if (this.data.users.length > 0) {
        const userRows = this.data.users.map(u => ({
          telegram_user_id: Number(u.telegram_user_id || u.id),
          username: u.username || null,
          first_name: u.first_name || null,
          balance: u.balance,
          total_earned: u.total_earned,
          total_spent: u.total_spent,
          registered_at: u.registered_at,
          last_activity: u.last_activity_at,
          last_reward_at: u.last_reward_at || null,
          verification_status: u.verification_status,
          failed_verification_attempts: u.failed_verification_attempts,
          referral_count: u.referral_count,
          referred_by: u.referred_by ? Number(u.referred_by) : null,
          ban_status: u.is_banned,
          banned_reason: u.banned_reason || null,
          unlocked_channels: u.unlocked_channels || []
        }));
        await supabase.from('users').upsert(userRows, { onConflict: 'telegram_user_id' });
      }

      // 3. Sync Video Packages
      if (this.data.video_packages.length > 0) {
        const pkgRows = this.data.video_packages.map(p => ({
          id: p.id,
          package_name: p.package_name,
          number_of_videos: p.number_of_videos,
          stars_price: p.stars_price,
          video_urls: p.video_urls,
          active: p.active,
          created_at: p.created_at,
          updated_at: p.updated_at
        }));
        await supabase.from('video_packages').upsert(pkgRows, { onConflict: 'id' });
      }

      // 4. Sync Video Purchases
      if (this.data.video_package_purchases.length > 0) {
        const vpRows = this.data.video_package_purchases.map(vp => ({
          id: vp.id,
          user_id: Number(vp.user_id),
          package_id: vp.package_id,
          package_name: vp.package_name,
          price_paid: vp.price_paid,
          video_count: vp.video_count,
          video_urls: vp.video_urls,
          purchased_at: vp.purchased_at
        }));
        await supabase.from('video_package_purchases').upsert(vpRows, { onConflict: 'id' });
      }

      // 5. Sync Transactions
      if (this.data.star_transactions.length > 0) {
        const txRows = this.data.star_transactions.slice(0, 50).map(t => ({
          id: t.id,
          user_id: Number(t.user_id),
          amount: t.amount,
          balance_before: t.balance_before,
          balance_after: t.balance_after,
          transaction_type: t.type,
          description: t.description,
          reference_id: t.reference_id || null,
          created_at: t.timestamp
        }));
        await supabase.from('star_transactions').upsert(txRows, { onConflict: 'id' });
      }

      // 6. Sync Star Codes
      if (this.data.star_codes.length > 0) {
        const scRows = this.data.star_codes.map(sc => ({
          id: sc.id,
          code: sc.code,
          stars_amount: sc.stars_amount,
          is_active: sc.is_active,
          is_used: sc.is_used,
          used_by_user_id: sc.used_by_user_id ? Number(sc.used_by_user_id) : null,
          used_by_username: sc.used_by_username || null,
          used_at: sc.used_at || null,
          created_at: sc.created_at
        }));
        await supabase.from('star_codes').upsert(scRows, { onConflict: 'id' });
      }

      // 7. Sync Free Videos & Files
      if (this.data.free_videos.length > 0) {
        await supabase.from('free_videos').upsert(this.data.free_videos, { onConflict: 'id' });
      }
      if (this.data.files.length > 0) {
        await supabase.from('files').upsert(this.data.files, { onConflict: 'id' });
      }
      if (this.data.file_purchases.length > 0) {
        const fpRows = this.data.file_purchases.map(fp => ({
          ...fp,
          user_id: Number(fp.user_id)
        }));
        await supabase.from('file_purchases').upsert(fpRows, { onConflict: 'id' });
      }

      // 8. Channels
      if (this.data.channels.length > 0) {
        await supabase.from('channels').upsert(this.data.channels, { onConflict: 'id' });
      }
    } catch (err: any) {
      console.warn('[DB] Supabase push notice:', err.message);
    }
  }

  /**
   * Synchronous accessor for in-memory mirror of PostgreSQL database
   */
  public getRaw(): EteboxDatabase {
    return this.data;
  }

  /**
   * Atomic mutation runner preserving compatibility with existing code
   */
  public async atomic(updater: (data: EteboxDatabase) => void | Promise<void>): Promise<EteboxDatabase> {
    // Chain sequentially to prevent internal concurrency issues
    this.syncQueue = this.syncQueue.then(async () => {
      await updater(this.data);
      await this.syncToSupabase();
    });

    await this.syncQueue;
    return this.data;
  }

  /**
   * Find or create persistent Telegram user by telegram_user_id
   */
  public async getOrCreateUser(
    telegramId: number,
    username?: string,
    firstName?: string,
    referrerId?: number
  ): Promise<User> {
    const strId = String(telegramId);
    let user = this.data.users.find(u => u.telegram_user_id === telegramId || u.id === strId);

    if (user) {
      // Update last activity and name if changed
      await this.atomic(data => {
        const target = data.users.find(u => u.telegram_user_id === telegramId || u.id === strId);
        if (target) {
          target.last_activity_at = new Date().toISOString();
          if (username) target.username = username;
          if (firstName) target.first_name = firstName;
        }
      });
      return this.data.users.find(u => u.telegram_user_id === telegramId || u.id === strId)!;
    }

    // Create new persistent user
    const newUser: User = {
      id: strId,
      telegram_user_id: telegramId,
      username,
      first_name: firstName,
      balance: 10, // Starting welcome balance: 10 Stars
      total_earned: 10,
      total_spent: 0,
      registered_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      verification_status: 'verified',
      failed_verification_attempts: 0,
      referral_count: 0,
      referred_by: referrerId ? String(referrerId) : undefined,
      is_banned: false,
      unlocked_channels: []
    };

    await this.atomic(data => {
      data.users.push(newUser);
      data.star_transactions.unshift({
        id: `tx_welcome_${Date.now()}`,
        user_id: strId,
        amount: 10,
        balance_before: 0,
        balance_after: 10,
        type: 'reward',
        description: '🎉 Welcome Bonus Stars',
        timestamp: new Date().toISOString()
      });

      // Handle referral bonus if valid
      if (referrerId && referrerId !== telegramId) {
        const referrer = data.users.find(u => u.telegram_user_id === referrerId || u.id === String(referrerId));
        if (referrer) {
          referrer.referral_count = (referrer.referral_count || 0) + 1;
          const oldBal = referrer.balance;
          referrer.balance += 5;
          referrer.total_earned += 5;

          data.referrals.push({
            id: `ref_${Date.now()}`,
            referrer_user_id: String(referrerId),
            referred_user_id: strId,
            reward_amount: 5,
            created_at: new Date().toISOString()
          });

          data.star_transactions.unshift({
            id: `tx_ref_${Date.now()}`,
            user_id: String(referrerId),
            amount: 5,
            balance_before: oldBal,
            balance_after: referrer.balance,
            type: 'referral',
            description: `👥 Referral reward from user @${username || strId}`,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    return newUser;
  }

  /**
   * ATOMIC Video Package Purchase Operation
   */
  public async executeVideoPackagePurchase(
    telegramId: number,
    packageId: string
  ): Promise<{ success: boolean; error?: string; purchase?: VideoPackagePurchase; links?: string[]; remainingBalance?: number }> {
    const supabase = getSupabase();

    // 1. Try atomic PostgreSQL RPC if configured
    if (supabase) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('purchase_video_package', {
          p_user_id: telegramId,
          p_package_id: packageId
        });

        if (!rpcErr && rpcRes) {
          if (!rpcRes.success) {
            return { success: false, error: rpcRes.error };
          }
          // Refresh memory cache
          await this.pullFromSupabase();
          return {
            success: true,
            purchase: {
              id: rpcRes.purchase_id,
              user_id: String(telegramId),
              package_id: packageId,
              package_name: rpcRes.package_name,
              price_paid: rpcRes.stars_paid,
              video_count: rpcRes.video_count,
              video_urls: rpcRes.video_urls,
              purchased_at: new Date().toISOString()
            },
            links: rpcRes.video_urls,
            remainingBalance: rpcRes.remaining_balance
          };
        }
      } catch (err: any) {
        console.warn('[DB] Supabase RPC fallback to atomic layer:', err.message);
      }
    }

    // 2. High-concurrency atomic check and deduction
    let purchaseResult: any = null;
    let purchaseError: string | null = null;

    await this.atomic(data => {
      const user = data.users.find(u => u.telegram_user_id === telegramId || u.id === String(telegramId));
      if (!user) {
        purchaseError = 'User account not found';
        return;
      }

      if (user.is_banned) {
        purchaseError = 'Your account has been restricted';
        return;
      }

      const pkg = data.video_packages.find(p => p.id === packageId && p.active);
      if (!pkg) {
        purchaseError = 'Video package is unavailable or inactive';
        return;
      }

      if (user.balance < pkg.stars_price) {
        purchaseError = `Insufficient Stars. Required: ${pkg.stars_price} ⭐, Balance: ${user.balance} ⭐`;
        return;
      }

      // Deduct Stars safely
      const balanceBefore = user.balance;
      user.balance -= pkg.stars_price;
      user.total_spent += pkg.stars_price;
      user.last_activity_at = new Date().toISOString();

      const purchaseId = `vpur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const purchase: VideoPackagePurchase = {
        id: purchaseId,
        user_id: String(telegramId),
        package_id: pkg.id,
        package_name: pkg.package_name,
        price_paid: pkg.stars_price,
        video_count: pkg.number_of_videos,
        video_urls: [...pkg.video_urls],
        purchased_at: new Date().toISOString()
      };

      data.video_package_purchases.unshift(purchase);

      data.star_transactions.unshift({
        id: `tx_${Date.now()}`,
        user_id: String(telegramId),
        amount: -pkg.stars_price,
        balance_before: balanceBefore,
        balance_after: user.balance,
        type: 'video_purchase',
        description: `🎬 Purchased ${pkg.package_name} (${pkg.number_of_videos} Videos)`,
        reference_id: purchaseId,
        timestamp: new Date().toISOString()
      });

      purchaseResult = {
        purchase,
        links: pkg.video_urls,
        remainingBalance: user.balance
      };
    });

    if (purchaseError) {
      return { success: false, error: purchaseError };
    }

    return {
      success: true,
      purchase: purchaseResult.purchase,
      links: purchaseResult.links,
      remainingBalance: purchaseResult.remainingBalance
    };
  }

  /**
   * ATOMIC Paid File Purchase
   */
  public async executeFilePurchase(
    telegramId: number,
    fileId: string
  ): Promise<{ success: boolean; error?: string; file?: PaidFile; remainingBalance?: number }> {
    let result: any = null;
    let purchaseError: string | null = null;

    await this.atomic(data => {
      const user = data.users.find(u => u.telegram_user_id === telegramId || u.id === String(telegramId));
      if (!user) {
        purchaseError = 'User account not found';
        return;
      }
      if (user.is_banned) {
        purchaseError = 'User is banned';
        return;
      }

      const file = data.files.find(f => f.id === fileId && f.is_active);
      if (!file) {
        purchaseError = 'File not found or inactive';
        return;
      }

      if (user.balance < file.price_stars) {
        purchaseError = `Insufficient Stars. Price: ${file.price_stars} ⭐, Balance: ${user.balance} ⭐`;
        return;
      }

      const before = user.balance;
      user.balance -= file.price_stars;
      user.total_spent += file.price_stars;
      user.last_activity_at = new Date().toISOString();

      const purchaseId = `fpur_${Date.now()}`;
      data.file_purchases.unshift({
        id: purchaseId,
        user_id: String(telegramId),
        file_id: file.id,
        file_name: file.file_name,
        price_paid: file.price_stars,
        file_code: file.file_code,
        zip_password: file.zip_password,
        purchased_at: new Date().toISOString()
      });

      data.star_transactions.unshift({
        id: `tx_${Date.now()}`,
        user_id: String(telegramId),
        amount: -file.price_stars,
        balance_before: before,
        balance_after: user.balance,
        type: 'file_purchase',
        description: `📁 Purchased file: ${file.file_name}`,
        reference_id: purchaseId,
        timestamp: new Date().toISOString()
      });

      result = { file, remainingBalance: user.balance };
    });

    if (purchaseError) return { success: false, error: purchaseError };
    return { success: true, file: result.file, remainingBalance: result.remainingBalance };
  }

  /**
   * ATOMIC Auto-Reward Claim (+3 Stars every 8 hours)
   */
  public async claimAutoReward(
    telegramId: number
  ): Promise<{ success: boolean; rewardStars?: number; newBalance?: number; error?: string; hoursRemaining?: number }> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('claim_auto_reward', {
          p_user_id: telegramId
        });
        if (!rpcErr && rpcRes) {
          if (!rpcRes.success) {
            return {
              success: false,
              error: rpcRes.error,
              hoursRemaining: rpcRes.hours_remaining
            };
          }
          await this.pullFromSupabase();
          return {
            success: true,
            rewardStars: rpcRes.reward_stars,
            newBalance: rpcRes.new_balance
          };
        }
      } catch (err: any) {
        console.warn('[DB] Supabase RPC claimAutoReward fallback:', err.message);
      }
    }

    let rewardResult: any = null;
    let errorMsg: string | null = null;
    let hoursRemaining = 0;

    await this.atomic(data => {
      const user = data.users.find(u => u.telegram_user_id === telegramId || u.id === String(telegramId));
      if (!user) {
        errorMsg = 'User not found';
        return;
      }

      const rewardHours = data.bot_settings.reward_hours || 8;
      const rewardStars = data.bot_settings.reward_stars || 3;

      if (user.last_reward_at) {
        const last = new Date(user.last_reward_at).getTime();
        const now = Date.now();
        const diffHours = (now - last) / (1000 * 60 * 60);

        if (diffHours < rewardHours) {
          hoursRemaining = Math.max(0.1, Number((rewardHours - diffHours).toFixed(1)));
          errorMsg = `Reward on cooldown. Available in ${hoursRemaining} hours.`;
          return;
        }
      }

      const before = user.balance;
      user.balance += rewardStars;
      user.total_earned += rewardStars;
      user.last_reward_at = new Date().toISOString();
      user.last_activity_at = new Date().toISOString();

      data.star_transactions.unshift({
        id: `tx_reward_${Date.now()}`,
        user_id: String(telegramId),
        amount: rewardStars,
        balance_before: before,
        balance_after: user.balance,
        type: 'reward',
        description: `🎁 Auto-Reward (+${rewardStars} Stars)`,
        timestamp: new Date().toISOString()
      });

      rewardResult = {
        rewardStars,
        newBalance: user.balance
      };
    });

    if (errorMsg) {
      return { success: false, error: errorMsg, hoursRemaining };
    }

    return {
      success: true,
      rewardStars: rewardResult.rewardStars,
      newBalance: rewardResult.newBalance
    };
  }

  /**
   * ATOMIC Redeem Star Code
   */
  public async redeemStarCode(
    telegramId: number,
    codeStr: string
  ): Promise<{ success: boolean; starsAdded?: number; newBalance?: number; error?: string }> {
    let result: any = null;
    let err: string | null = null;

    await this.atomic(data => {
      const user = data.users.find(u => u.telegram_user_id === telegramId || u.id === String(telegramId));
      if (!user) {
        err = 'User not found';
        return;
      }

      const cleanCode = codeStr.trim().toUpperCase();
      const codeRecord = data.star_codes.find(c => c.code.toUpperCase() === cleanCode && c.is_active);

      if (!codeRecord) {
        err = 'Invalid or expired Star code';
        return;
      }

      if (codeRecord.is_used) {
        err = 'This Star code has already been redeemed';
        return;
      }

      codeRecord.is_used = true;
      codeRecord.used_by_user_id = String(telegramId);
      codeRecord.used_by_username = user.username;
      codeRecord.used_at = new Date().toISOString();

      const before = user.balance;
      user.balance += codeRecord.stars_amount;
      user.total_earned += codeRecord.stars_amount;
      user.last_activity_at = new Date().toISOString();

      data.star_transactions.unshift({
        id: `tx_redeem_${Date.now()}`,
        user_id: String(telegramId),
        amount: codeRecord.stars_amount,
        balance_before: before,
        balance_after: user.balance,
        type: 'redeem_code',
        description: `🎟️ Redeemed Star code: ${codeRecord.code}`,
        reference_id: codeRecord.id,
        timestamp: new Date().toISOString()
      });

      result = { starsAdded: codeRecord.stars_amount, newBalance: user.balance };
    });

    if (err) return { success: false, error: err };
    return { success: true, ...result };
  }

  /**
   * Schedule automatic message deletion (10 minutes)
   */
  public async scheduleMessageDeletion(chatId: number, messageId: number, delayMs: number = 600000): Promise<void> {
    const deleteAt = new Date(Date.now() + delayMs).toISOString();
    await this.atomic(data => {
      data.scheduled_deletions.push({
        id: `del_${Date.now()}_${messageId}`,
        chat_id: chatId,
        message_id: messageId,
        delete_at: deleteAt,
        created_at: new Date().toISOString()
      });
    });
  }
}

export const db = new DatabaseService();
