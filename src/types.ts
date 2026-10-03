export interface AdminUser {
  id: string;
  username: string;
  permissions: string[];
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalStarsCirculation: number;
  autoRewardsGiven: number;
  totalReferrals: number;
  totalPurchases: number;
  totalFreeVideos: number;
  totalFiles: number;
  totalChannels: number;
  botStatus: 'online' | 'offline' | 'token_invalid' | 'telegram_error';
  botUsername?: string;
  botFirstName?: string;
  botError?: string;
  botTokenValid?: boolean;
  webhookConfigured?: boolean;
  webhookReachable?: boolean;
  lastWebhookError?: string;
  lastUpdateReceivedAt?: string;
  recentTransactions: StarTx[];
  supabaseConnected?: boolean;
  supabaseStatus?: string;
  supabaseDetails?: string;
  supabaseUrl?: string;
  supabaseProjectId?: string;
}

export interface BotSettingsData {
  hasToken: boolean;
  maskedToken: string;
  status: 'online' | 'offline' | 'token_invalid' | 'telegram_error';
  isActive: boolean;
  botUsername?: string;
  botFirstName?: string;
  lastError?: string;
  storeUrl: string;
  backupBotUrl: string;
  autoNotifyFreeContent: boolean;
  rewardStars?: number;
  rewardHours?: number;
  webhookUrl?: string;
  webhookConfigured?: boolean;
  webhookReachable?: boolean;
  hasSecretToken?: boolean;
  lastWebhookError?: string;
  lastUpdateReceivedAt?: string;
  lastUpdateId?: number;
  supabaseConnected?: boolean;
  supabaseUrl?: string;
  supabaseStatus?: string;
  supabaseDetails?: string;
  supabaseProjectId?: string;
}

export interface UserItem {
  id: string;
  username?: string;
  first_name?: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  registered_at: string;
  last_activity_at: string;
  verification_status: 'verified' | 'pending';
  is_banned: boolean;
  banned_reason?: string;
  referral_count: number;
  referred_by?: string;
}

export interface StarTx {
  id: string;
  user_id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  type: string;
  description: string;
  timestamp: string;
  admin_id?: string;
}

export interface FilePurchaseItem {
  id: string;
  user_id: string;
  file_id: string;
  file_name: string;
  price_paid: number;
  file_code: string;
  zip_password?: string;
  purchased_at: string;
}

export interface FreeVideoItem {
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

export type FreeVideo = FreeVideoItem;

export interface PaidFileItem {
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

export interface StarPackageItem {
  id: string;
  name: string;
  stars_amount: number;
  price_usd: number;
  payment_url: string;
  payment_info: string;
  is_active: boolean;
}

export interface StarCodeItem {
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

export interface ChannelItem {
  id: string;
  name: string;
  url: string;
  display_order: number;
  is_active: boolean;
  required_stars: number;
}

export interface BroadcastItem {
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

export interface AdminLogItem {
  id: string;
  admin_username: string;
  action: string;
  target?: string;
  details?: string;
  timestamp: string;
}

export interface AdminAccountItem {
  id: string;
  username: string;
  permissions: string[];
  status: 'active' | 'disabled';
  created_at: string;
}

export interface VideoPackage {
  id: string;
  package_name: string;
  name?: string;
  number_of_videos: number;
  video_count?: number;
  stars_price: number;
  video_urls: string[];
  active: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VideoPackagePurchase {
  id: string;
  user_id: string;
  package_id: string;
  package_name: string;
  price_paid?: number;
  stars_paid?: number;
  video_count?: number;
  video_urls: string[];
  purchased_at: string;
}
