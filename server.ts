import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { db, hashPassword, verifyPassword } from './server/db.js';
import { telegramBot, cleanBotToken } from './server/telegramBot.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Support video uploads up to 35-40MB
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

// Handle serverless pre-parsed or string body
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {}
  }
  next();
});

// Static uploads serving for direct videos
const isVercelEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isVercelEnv
  ? path.resolve('/tmp', 'etebox_uploads', 'videos')
  : path.resolve(process.cwd(), 'data', 'uploads', 'videos');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Server] Could not ensure UPLOADS_DIR:', e);
}

app.use('/uploads', express.static(isVercelEnv ? path.resolve('/tmp', 'etebox_uploads') : path.resolve(process.cwd(), 'data', 'uploads')));

// Simple in-memory session store for admins
interface AdminSession {
  adminId: string;
  username: string;
  createdAt: number;
}
const sessions = new Map<string, AdminSession>();

// Authentication Middleware (Seamless Direct Dashboard Access)
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const defaultAdmin = db.getRaw().admins['admin_initial'] || {
    id: 'admin_initial',
    username: 'Abood',
    permissions: ['all'],
    status: 'active'
  };

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any).admin = defaultAdmin;
    return next();
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);
  if (!session) {
    (req as any).admin = defaultAdmin;
    return next();
  }

  const admin = db.getRaw().admins[session.adminId] || defaultAdmin;
  (req as any).admin = admin;
  (req as any).sessionToken = token;
  next();
}

// Log Admin Action
async function logAction(adminUsername: string, action: string, target?: string, details?: string) {
  await db.atomic((d) => {
    d.admin_logs.unshift({
      id: crypto.randomUUID(),
      admin_username: adminUsername,
      action,
      target,
      details,
      timestamp: new Date().toISOString()
    });
    // Keep max 500 logs
    if (d.admin_logs.length > 500) {
      d.admin_logs.length = 500;
    }
  });
}

// -----------------------------------------------------------------------------
// 1. ADMIN AUTHENTICATION
// -----------------------------------------------------------------------------
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = (username || '').toString().trim();
  const cleanPassword = (password || '').toString().trim();

  const rawAdmins = Object.values(db.getRaw().admins);
  const admin = rawAdmins.find((a) => a.username.toLowerCase() === cleanUsername.toLowerCase());

  if (!admin || admin.status !== 'active') {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValid = verifyPassword(password, admin.password_hash, admin.salt) ||
                  verifyPassword(cleanPassword, admin.password_hash, admin.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionToken, {
    adminId: admin.id,
    username: admin.username,
    createdAt: Date.now()
  });

  await logAction(admin.username, 'LOGIN', 'Admin Auth', 'Successful login to Admin Panel');

  res.json({
    token: sessionToken,
    admin: {
      id: admin.id,
      username: admin.username,
      permissions: admin.permissions
    }
  });
});

app.post('/api/admin/logout', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const token = (req as any).sessionToken;
  sessions.delete(token);
  await logAction(admin.username, 'LOGOUT', 'Admin Auth', 'Admin logged out');
  res.json({ success: true });
});

app.get('/api/admin/me', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).admin;
  res.json({
    admin: {
      id: admin.id,
      username: admin.username,
      permissions: admin.permissions
    }
  });
});

app.post('/api/admin/change-password', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const isValid = verifyPassword(currentPassword, admin.password_hash, admin.salt);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newHash = hashPassword(newPassword);
  await db.atomic((d) => {
    if (d.admins[admin.id]) {
      d.admins[admin.id].password_hash = newHash.hash;
      d.admins[admin.id].salt = newHash.salt;
    }
  });

  await logAction(admin.username, 'CHANGE_PASSWORD', 'Admin Account', 'Password updated successfully');
  res.json({ success: true, message: 'Password changed successfully' });
});

// -----------------------------------------------------------------------------
// 2. DASHBOARD STATS
// -----------------------------------------------------------------------------
app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const raw = db.getRaw();
  const users = Object.values(raw.users);
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => new Date(u.last_activity_at).getTime() >= sevenDaysAgo).length;
  const totalStarsCirculation = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  const autoRewardsGiven = raw.star_transactions.filter((t) => t.type === 'AUTO_REWARD').length;
  const totalReferrals = raw.referrals.filter((r) => r.status === 'qualified').length;
  const totalPurchases = raw.file_purchases.length;
  const totalFreeVideos = raw.free_videos.filter((v) => v.is_active).length;
  const totalFiles = raw.files.filter((f) => f.is_active).length;
  const totalChannels = raw.channels.filter((c) => c.is_active).length;

  res.json({
    totalUsers,
    activeUsers,
    totalStarsCirculation,
    autoRewardsGiven,
    totalReferrals,
    totalPurchases,
    totalFreeVideos,
    totalFiles,
    totalChannels,
    botStatus: raw.bot_settings.status,
    botUsername: raw.bot_settings.main_bot_username,
    botFirstName: raw.bot_settings.main_bot_first_name,
    botError: raw.bot_settings.last_error,
    recentTransactions: raw.star_transactions.slice(-8).reverse()
  });
});

// -----------------------------------------------------------------------------
// 3. BOT SETTINGS & TOKEN MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/admin/bot/settings', requireAdmin, (req: Request, res: Response) => {
  const settings = db.getRaw().bot_settings;
  // Mask the token: show only last 4 chars
  const rawToken = settings.main_bot_token || '';
  const maskedToken = rawToken.length > 8 ? '••••••••••••' + rawToken.slice(-4) : (rawToken ? '••••••••••••' : '');

  res.json({
    hasToken: Boolean(rawToken),
    maskedToken,
    status: settings.status,
    isActive: settings.is_main_active,
    botUsername: settings.main_bot_username,
    botFirstName: settings.main_bot_first_name,
    lastError: settings.last_error,
    storeUrl: settings.store_url || 'https://etebox.com/store',
    backupBotUrl: settings.backup_bot_url || 'https://t.me/EteboxBackupBot',
    autoNotifyFreeContent: settings.auto_notify_free_content ?? true
  });
});

app.post('/api/admin/bot/save-and-activate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin || { username: 'Abood' };
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { botToken, storeUrl, backupBotUrl, autoNotifyFreeContent } = body;

    let tokenToUse = cleanBotToken(botToken || '');
    const currentSettings = db.getRaw().bot_settings;

    // If user didn't enter a new token and already has one, keep existing token
    if (!tokenToUse && currentSettings.main_bot_token) {
      tokenToUse = cleanBotToken(currentSettings.main_bot_token);
    }

    if (!tokenToUse) {
      return res.status(400).json({
        error: 'يرجى إدخال توكن البوت الذي حصلت عليه من @BotFather (مثال: 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ)'
      });
    }

    // Update configuration URLs
    await db.atomic((d) => {
      if (storeUrl !== undefined) d.bot_settings.store_url = storeUrl;
      if (backupBotUrl !== undefined) d.bot_settings.backup_bot_url = backupBotUrl;
      if (autoNotifyFreeContent !== undefined) d.bot_settings.auto_notify_free_content = Boolean(autoNotifyFreeContent);
    });

    // Detect if running on Vercel or any public domain
    const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase();
    const isPublicOrVercel = Boolean(host && !host.includes('localhost') && !host.includes('127.0.0.1'));

    // Step 1: Validate token directly with Telegram API
    const validation = await telegramBot.validateToken(tokenToUse);
    if (!validation.valid || !validation.user) {
      await db.atomic((d) => {
        d.bot_settings.status = 'token_invalid';
        d.bot_settings.last_error = validation.error || 'Token validation failed';
      });
      await logAction(admin.username, 'BOT_ACTIVATION_FAILED', 'Bot Engine', `Invalid token: ${validation.error}`);
      return res.status(400).json({
        error: `توكن البوت غير صالح وفقاً لتيليجرام (${validation.error || 'Invalid token'}). تأكد من نسخه بدقة من @BotFather.`
      });
    }

    let webhookConfigured = false;
    let activationMessage = '';

    if (isPublicOrVercel) {
      // Step 2A (Public / Vercel Host): Configure Webhook directly
      // Do NOT start long-polling, as long-polling causes 409 conflict and hangs serverless
      const autoWebhookUrl = `https://${host}/api/telegram-webhook`;
      console.log(`[Bot Engine] Public host detected (${host}). Setting Webhook: ${autoWebhookUrl}`);

      try {
        const hookRes = await telegramBot.setWebhook(tokenToUse, autoWebhookUrl);
        webhookConfigured = hookRes.success;
      } catch (hookErr: any) {
        console.warn('[Bot Engine] Webhook configuration warning:', hookErr.message);
      }

      await db.atomic((d) => {
        d.bot_settings.main_bot_token = tokenToUse;
        d.bot_settings.is_main_active = true;
        d.bot_settings.main_bot_username = validation.user.username;
        d.bot_settings.main_bot_first_name = validation.user.first_name;
        d.bot_settings.status = 'online';
        d.bot_settings.last_error = undefined;
      });

      activationMessage = webhookConfigured
        ? `✅ تم ربط البوت @${validation.user.username} وتفعيل الويب هوك بنجاح! جميع الأزرار تعمل الآن في التيليجرام.`
        : `✅ تم تفعيل البوت @${validation.user.username} بنجاح!`;
    } else {
      // Step 2B (Localhost / VPS): Start long-polling
      const result = await telegramBot.startBot(tokenToUse);
      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to start bot polling' });
      }
      activationMessage = `✅ تم تفعيل البوت @${validation.user.username} بنجاح!`;
    }

    await logAction(admin.username, 'BOT_ACTIVATED', 'Bot Engine', `Activated @${validation.user.username}`);
    const updatedSettings = db.getRaw().bot_settings;

    res.json({
      success: true,
      message: activationMessage,
      botUsername: updatedSettings.main_bot_username,
      botFirstName: updatedSettings.main_bot_first_name,
      status: 'online',
      webhookConfigured
    });
  } catch (err: any) {
    console.error('[Bot Engine] Unexpected error in save-and-activate:', err);
    res.status(500).json({
      error: `حدث خطأ أثناء تفعيل البوت: ${err.message || 'خطأ غير معروف في الخادم'}`
    });
  }
});

app.post('/api/admin/bot/stop', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  telegramBot.stopBot();
  await db.atomic((d) => {
    d.bot_settings.is_main_active = false;
    d.bot_settings.status = 'offline';
  });
  await logAction(admin.username, 'BOT_STOPPED', 'Bot Engine', 'Bot stopped by administrator');
  res.json({ success: true, status: 'offline' });
});

// Telegram Webhook Management
app.get('/api/admin/bot/webhook-info', requireAdmin, async (_req: Request, res: Response) => {
  const token = db.getRaw().bot_settings.main_bot_token;
  if (!token) return res.status(400).json({ error: 'No bot token configured' });
  const info = await telegramBot.getWebhookInfo(token);
  res.json({ info });
});

app.post('/api/admin/bot/set-webhook', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { webhookUrl } = req.body;
  const token = db.getRaw().bot_settings.main_bot_token;
  if (!token) return res.status(400).json({ error: 'No bot token configured' });
  if (!webhookUrl) return res.status(400).json({ error: 'Webhook URL is required' });

  const result = await telegramBot.setWebhook(token, webhookUrl);
  if (!result.success) {
    return res.status(400).json({ error: result.description });
  }

  await logAction(admin.username, 'WEBHOOK_SET', 'Telegram Bot', `Webhook set to ${webhookUrl}`);
  res.json({ success: true, message: result.description });
});

app.post('/api/admin/bot/delete-webhook', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const token = db.getRaw().bot_settings.main_bot_token;
  if (!token) return res.status(400).json({ error: 'No bot token configured' });

  const result = await telegramBot.deleteWebhook(token);
  if (!result.success) {
    return res.status(400).json({ error: result.description });
  }

  await logAction(admin.username, 'WEBHOOK_DELETED', 'Telegram Bot', 'Switched to Long Polling');
  res.json({ success: true, message: result.description });
});

// Public Telegram Webhook Endpoint (Receives updates from Telegram servers)
app.post(['/api/telegram-webhook', '/api/webhook'], async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const settings = db.getRaw().bot_settings;
    const token = settings.main_bot_token;
    if (token && update) {
      await telegramBot.handleUpdate(update, token);
    }
  } catch (err: any) {
    console.error('[Telegram Webhook] Error processing update:', err.message);
  }
  res.status(200).json({ ok: true });
});

// -----------------------------------------------------------------------------
// 4. USER MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const rawUsers = Object.values(db.getRaw().users);

  let filtered = rawUsers;
  if (query) {
    filtered = rawUsers.filter(
      (u) =>
        u.id.toLowerCase().includes(query) ||
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.first_name && u.first_name.toLowerCase().includes(query))
    );
  }

  // Sort by last activity descending
  filtered.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());

  res.json({
    users: filtered.map((u) => ({
      id: u.id,
      username: u.username,
      first_name: u.first_name,
      balance: u.balance,
      total_earned: u.total_earned,
      total_spent: u.total_spent,
      registered_at: u.registered_at,
      last_activity_at: u.last_activity_at,
      verification_status: u.verification_status,
      is_banned: u.is_banned,
      banned_reason: u.banned_reason,
      referral_count: u.referral_count,
      referred_by: u.referred_by
    }))
  });
});

app.get('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const userId = req.params.id;
  const raw = db.getRaw();
  const user = raw.users[userId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const transactions = raw.star_transactions.filter((t) => t.user_id === userId).reverse();
  const purchases = raw.file_purchases.filter((p) => p.user_id === userId).reverse();
  const referrals = raw.referrals.filter((r) => r.referrer_user_id === userId).reverse();

  res.json({
    user,
    transactions,
    purchases,
    referrals
  });
});

app.post('/api/admin/users/:id/adjust-balance', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const userId = req.params.id;
  const { amount, reason } = req.body;

  const numAmount = parseInt(amount, 10);
  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ error: 'Invalid adjustment amount' });
  }

  const result = await db.atomic((data) => {
    const user = data.users[userId];
    if (!user) return null;

    const balanceBefore = user.balance;
    const balanceAfter = Math.max(0, balanceBefore + numAmount);
    const actualChange = balanceAfter - balanceBefore;

    user.balance = balanceAfter;
    if (actualChange > 0) {
      user.total_earned += actualChange;
    }

    const type = numAmount > 0 ? 'ADMIN_ADD' : 'ADMIN_DEDUCT';
    const tx = {
      id: crypto.randomUUID(),
      user_id: userId,
      amount: actualChange,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: type as any,
      description: reason || `Manual adjustment by admin ${admin.username}`,
      timestamp: new Date().toISOString(),
      admin_id: admin.id
    };

    data.star_transactions.push(tx);
    return { user, tx };
  });

  if (!result) {
    return res.status(404).json({ error: 'User not found' });
  }

  await logAction(
    admin.username,
    'USER_BALANCE_ADJUSTED',
    `User ${userId}`,
    `${numAmount > 0 ? '+' : ''}${numAmount} Stars. Reason: ${reason || 'Manual'}`
  );

  res.json({ success: true, balance: result.user.balance });
});

app.post('/api/admin/users/:id/ban', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const userId = req.params.id;
  const { reason } = req.body;

  const success = await db.atomic((data) => {
    const user = data.users[userId];
    if (!user) return false;
    user.is_banned = true;
    user.banned_reason = reason || 'Suspended by admin';
    return true;
  });

  if (!success) return res.status(404).json({ error: 'User not found' });

  await logAction(admin.username, 'USER_BANNED', `User ${userId}`, reason || 'Suspended');
  res.json({ success: true });
});

app.post('/api/admin/users/:id/unban', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const userId = req.params.id;

  const success = await db.atomic((data) => {
    const user = data.users[userId];
    if (!user) return false;
    user.is_banned = false;
    user.banned_reason = undefined;
    return true;
  });

  if (!success) return res.status(404).json({ error: 'User not found' });

  await logAction(admin.username, 'USER_UNBANNED', `User ${userId}`, 'Account restored');
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 5. FREE 1 VIDEOS MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/admin/free-videos', requireAdmin, (req: Request, res: Response) => {
  res.json({ videos: db.getRaw().free_videos });
});

// Direct Video Upload (Strict max 30MB limit)
app.post('/api/admin/free-videos/upload-direct', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { filename, base64Data, sizeBytes } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'Filename and video data are required' });
    }

    const maxSizeBytes = 30 * 1024 * 1024; // 30 MB
    if (sizeBytes && sizeBytes > maxSizeBytes) {
      return res.status(400).json({
        error: 'حجم الفيديو يتجاوز 30MB! بالنسبة للفيديوهات التي تتجاوز 30MB، يرجى رفعها على سحابة تخزين (مثل Google Drive أو Mega) واختيار خيار (سحابة التخزين - رابط خارجي) لإضافة الرابط في الزر.'
      });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > maxSizeBytes) {
      return res.status(400).json({
        error: 'حجم الفيديو يتجاوز 30MB! بالنسبة للفيديوهات التي تتجاوز 30MB، يرجى رفعها على سحابة تخزين (مثل Google Drive أو Mega) واختيار خيار (سحابة التخزين - رابط خارجي).'
      });
    }

    const ext = path.extname(filename) || '.mp4';
    const safeFileName = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFileName);

    fs.writeFileSync(filePath, buffer);

    const sizeMb = parseFloat((buffer.length / (1024 * 1024)).toFixed(2));
    const url = `/uploads/videos/${safeFileName}`;

    res.json({
      success: true,
      url,
      sizeMb,
      message: `تم رفع الفيديو المباشر بنجاح (${sizeMb} MB)`
    });
  } catch (err: any) {
    console.error('[Upload Direct] Error:', err);
    res.status(500).json({ error: 'Failed to upload video: ' + err.message });
  }
});

app.post('/api/admin/free-videos', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { title, delivery_type, direct_video_url, file_size_mb, telegram_message_url, download_url, download_code, description, is_active, notify_users } = req.body;

  if (!title || !delivery_type) {
    return res.status(400).json({ error: 'Title and Delivery Type are required' });
  }

  const newVideo: any = {
    id: 'free_' + crypto.randomUUID().slice(0, 8),
    title,
    delivery_type,
    direct_video_url: direct_video_url || '',
    file_size_mb: file_size_mb || undefined,
    telegram_message_url: telegram_message_url || '',
    download_url: download_url || '',
    download_code: download_code || '',
    description: description || '',
    is_active: is_active ?? true,
    created_at: new Date().toISOString()
  };

  await db.atomic((d) => {
    d.free_videos.unshift(newVideo);
  });

  await logAction(admin.username, 'FREE_VIDEO_ADDED', newVideo.title, `Type: ${delivery_type}`);

  if (notify_users && newVideo.is_active) {
    telegramBot.notifyNewFreeContent(newVideo);
  }

  res.json({ success: true, video: newVideo });
});

app.put('/api/admin/free-videos/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;
  const updates = req.body;

  const updated = await db.atomic((d) => {
    const index = d.free_videos.findIndex((v) => v.id === id);
    if (index === -1) return null;
    d.free_videos[index] = { ...d.free_videos[index], ...updates };
    return d.free_videos[index];
  });

  if (!updated) return res.status(404).json({ error: 'Video not found' });

  await logAction(admin.username, 'FREE_VIDEO_UPDATED', updated.title, `Updated status/details`);
  res.json({ success: true, video: updated });
});

app.delete('/api/admin/free-videos/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;

  const deleted = await db.atomic((d) => {
    const index = d.free_videos.findIndex((v) => v.id === id);
    if (index === -1) return null;
    return d.free_videos.splice(index, 1)[0];
  });

  if (!deleted) return res.status(404).json({ error: 'Video not found' });

  await logAction(admin.username, 'FREE_VIDEO_DELETED', deleted.title, `Removed from catalog`);
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 6. PAID FILES MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/admin/files', requireAdmin, (req: Request, res: Response) => {
  res.json({ files: db.getRaw().files });
});

app.post('/api/admin/files', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { file_name, sample_url, download_url, file_code, zip_password, price_stars, is_active } = req.body;

  if (!file_name || !download_url || price_stars === undefined) {
    return res.status(400).json({ error: 'File name, Download URL, and Price are required' });
  }

  // Generate unique file code if not provided
  const uniqueCode = file_code || crypto.randomBytes(4).toString('hex').toUpperCase();

  const newFile = {
    id: 'file_' + crypto.randomUUID().slice(0, 8),
    file_name,
    sample_url: sample_url || '',
    download_url,
    file_code: uniqueCode,
    zip_password: zip_password || '',
    price_stars: parseInt(price_stars, 10) || 10,
    is_active: is_active ?? true,
    created_at: new Date().toISOString()
  };

  await db.atomic((d) => {
    d.files.unshift(newFile);
  });

  await logAction(admin.username, 'FILE_ADDED', newFile.file_name, `Price: ${newFile.price_stars} Stars, Code: ${uniqueCode}`);
  res.json({ success: true, file: newFile });
});

app.put('/api/admin/files/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;
  const updates = req.body;

  const updated = await db.atomic((d) => {
    const index = d.files.findIndex((f) => f.id === id);
    if (index === -1) return null;
    d.files[index] = { ...d.files[index], ...updates };
    return d.files[index];
  });

  if (!updated) return res.status(404).json({ error: 'File not found' });

  await logAction(admin.username, 'FILE_UPDATED', updated.file_name, `Updated price/urls`);
  res.json({ success: true, file: updated });
});

app.delete('/api/admin/files/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;

  const deleted = await db.atomic((d) => {
    const index = d.files.findIndex((f) => f.id === id);
    if (index === -1) return null;
    return d.files.splice(index, 1)[0];
  });

  if (!deleted) return res.status(404).json({ error: 'File not found' });

  await logAction(admin.username, 'FILE_DELETED', deleted.file_name, `Removed from catalog`);
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 7. BUY STARS PACKAGES
// -----------------------------------------------------------------------------
app.get('/api/admin/packages', requireAdmin, (req: Request, res: Response) => {
  res.json({ packages: db.getRaw().star_packages });
});

app.post('/api/admin/packages', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { name, stars_amount, price_usd, payment_url, payment_info, is_active } = req.body;

  if (!name || !stars_amount) {
    return res.status(400).json({ error: 'Package name and Stars amount are required' });
  }

  const newPkg = {
    id: 'pkg_' + crypto.randomUUID().slice(0, 8),
    name,
    stars_amount: parseInt(stars_amount, 10),
    price_usd: parseFloat(price_usd) || 0,
    payment_url: payment_url || '',
    payment_info: payment_info || '',
    is_active: is_active ?? true
  };

  await db.atomic((d) => {
    d.star_packages.push(newPkg);
  });

  await logAction(admin.username, 'PACKAGE_ADDED', newPkg.name, `Stars: ${newPkg.stars_amount}`);
  res.json({ success: true, package: newPkg });
});

app.put('/api/admin/packages/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;
  const updates = req.body;

  const updated = await db.atomic((d) => {
    const index = d.star_packages.findIndex((p) => p.id === id);
    if (index === -1) return null;
    d.star_packages[index] = { ...d.star_packages[index], ...updates };
    return d.star_packages[index];
  });

  if (!updated) return res.status(404).json({ error: 'Package not found' });

  await logAction(admin.username, 'PACKAGE_UPDATED', updated.name, `Updated package`);
  res.json({ success: true, package: updated });
});

app.delete('/api/admin/packages/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;

  const deleted = await db.atomic((d) => {
    const index = d.star_packages.findIndex((p) => p.id === id);
    if (index === -1) return null;
    return d.star_packages.splice(index, 1)[0];
  });

  if (!deleted) return res.status(404).json({ error: 'Package not found' });

  await logAction(admin.username, 'PACKAGE_DELETED', deleted.name, `Deleted package`);
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 8. ONE-TIME STARS CODES
// -----------------------------------------------------------------------------
app.get('/api/admin/codes', requireAdmin, (req: Request, res: Response) => {
  const codes = Object.values(db.getRaw().star_codes);
  res.json({ codes });
});

app.post('/api/admin/codes', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { code, stars_amount } = req.body;

  const codeString = (code || crypto.randomBytes(4).toString('hex')).trim();
  const stars = parseInt(stars_amount, 10);

  if (!stars || stars <= 0) {
    return res.status(400).json({ error: 'Stars amount must be greater than 0' });
  }

  const newCode = {
    id: 'code_' + crypto.randomUUID().slice(0, 8),
    code: codeString,
    stars_amount: stars,
    is_active: true,
    is_used: false,
    created_at: new Date().toISOString()
  };

  await db.atomic((d) => {
    d.star_codes[codeString] = newCode;
  });

  await logAction(admin.username, 'CODE_CREATED', `Code ${codeString}`, `Amount: ${stars} Stars`);
  res.json({ success: true, code: newCode });
});

app.delete('/api/admin/codes/:code', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const code = req.params.code;

  const deleted = await db.atomic((d) => {
    if (d.star_codes[code]) {
      const c = d.star_codes[code];
      delete d.star_codes[code];
      return c;
    }
    return null;
  });

  if (!deleted) return res.status(404).json({ error: 'Code not found' });

  await logAction(admin.username, 'CODE_DELETED', `Code ${code}`, 'Removed');
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 9. CHANNELS MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/admin/channels', requireAdmin, (req: Request, res: Response) => {
  const channels = [...db.getRaw().channels].sort((a, b) => a.display_order - b.display_order);
  res.json({ channels });
});

app.post('/api/admin/channels', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { name, url, display_order, is_active, required_stars } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Channel name and URL are required' });
  }

  const newChannel = {
    id: 'chan_' + crypto.randomUUID().slice(0, 8),
    name,
    url,
    display_order: parseInt(display_order, 10) || 1,
    is_active: is_active ?? true,
    required_stars: Math.max(0, parseInt(required_stars, 10) || 0)
  };

  await db.atomic((d) => {
    d.channels.push(newChannel);
  });

  await logAction(admin.username, 'CHANNEL_ADDED', newChannel.name, `${newChannel.url} (${newChannel.required_stars} Stars required)`);
  res.json({ success: true, channel: newChannel });
});

app.put('/api/admin/channels/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;
  const updates = req.body;

  if (updates.required_stars !== undefined) {
    updates.required_stars = Math.max(0, parseInt(updates.required_stars, 10) || 0);
  }

  const updated = await db.atomic((d) => {
    const index = d.channels.findIndex((c) => c.id === id);
    if (index === -1) return null;
    d.channels[index] = { ...d.channels[index], ...updates };
    return d.channels[index];
  });

  if (!updated) return res.status(404).json({ error: 'Channel not found' });

  await logAction(admin.username, 'CHANNEL_UPDATED', updated.name, 'Updated channel');
  res.json({ success: true, channel: updated });
});

app.delete('/api/admin/channels/:id', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const id = req.params.id;

  const deleted = await db.atomic((d) => {
    const index = d.channels.findIndex((c) => c.id === id);
    if (index === -1) return null;
    return d.channels.splice(index, 1)[0];
  });

  if (!deleted) return res.status(404).json({ error: 'Channel not found' });

  await logAction(admin.username, 'CHANNEL_DELETED', deleted.name, 'Removed channel');
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 10. BROADCASTS
// -----------------------------------------------------------------------------
app.get('/api/admin/broadcasts', requireAdmin, (req: Request, res: Response) => {
  res.json({ broadcasts: db.getRaw().broadcasts.slice().reverse() });
});

app.post('/api/admin/broadcasts', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const { text, image_url, button_text, button_url } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Broadcast text message is required' });
  }

  const broadcast = {
    id: crypto.randomUUID(),
    text,
    image_url,
    button_text,
    button_url,
    total_users: Object.keys(db.getRaw().users).length,
    sent_count: 0,
    failed_count: 0,
    blocked_count: 0,
    status: 'pending' as const,
    created_at: new Date().toISOString()
  };

  await db.atomic((d) => {
    d.broadcasts.push(broadcast);
  });

  // Execute in background
  telegramBot.executeBroadcast(broadcast.id);
  await logAction(admin.username, 'BROADCAST_QUEUED', `Broadcast ${broadcast.id}`, text.slice(0, 40) + '...');

  res.json({ success: true, broadcast });
});

// -----------------------------------------------------------------------------
// 11. AUDIT LOGS & ADMIN MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/admin/logs', requireAdmin, (req: Request, res: Response) => {
  res.json({ logs: db.getRaw().admin_logs });
});

app.get('/api/admin/admins', requireAdmin, (req: Request, res: Response) => {
  const admins = Object.values(db.getRaw().admins).map((a) => ({
    id: a.id,
    username: a.username,
    permissions: a.permissions,
    status: a.status,
    created_at: a.created_at
  }));
  res.json({ admins });
});

app.post('/api/admin/admins', requireAdmin, async (req: Request, res: Response) => {
  const currentAdmin = (req as any).admin;
  const { username, password, permissions } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username and minimum 6-character password are required' });
  }

  const raw = db.getRaw();
  const existing = Object.values(raw.admins).find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Admin username already exists' });
  }

  const auth = hashPassword(password);
  const newAdmin = {
    id: 'admin_' + crypto.randomUUID().slice(0, 8),
    username: username.trim(),
    password_hash: auth.hash,
    salt: auth.salt,
    permissions: Array.isArray(permissions) ? permissions : ['all'],
    status: 'active' as const,
    created_at: new Date().toISOString()
  };

  await db.atomic((d) => {
    d.admins[newAdmin.id] = newAdmin;
  });

  await logAction(currentAdmin.username, 'ADMIN_CREATED', newAdmin.username, 'New admin account added');
  res.json({ success: true, admin: { id: newAdmin.id, username: newAdmin.username, status: newAdmin.status } });
});

app.delete('/api/admin/admins/:id', requireAdmin, async (req: Request, res: Response) => {
  const currentAdmin = (req as any).admin;
  const id = req.params.id;

  if (id === 'admin_initial') {
    return res.status(400).json({ error: 'The primary initial administrator cannot be deleted' });
  }

  const deleted = await db.atomic((d) => {
    if (d.admins[id]) {
      const a = d.admins[id];
      delete d.admins[id];
      return a;
    }
    return null;
  });

  if (!deleted) return res.status(404).json({ error: 'Admin not found' });

  await logAction(currentAdmin.username, 'ADMIN_DELETED', deleted.username, 'Admin account removed');
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 12. INTERACTIVE TELEGRAM BOT EMULATOR API
// (Allows instant testing of the exact bot experience directly in the Web UI!)
// -----------------------------------------------------------------------------
app.post('/api/bot-emulator/message', async (req: Request, res: Response) => {
  const { userId = '777888999', text = '/start', username = 'TestUser', firstName = 'Abood Tester' } = req.body;
  const mockMsg = {
    chat: { id: userId },
    from: { id: userId, username, first_name: firstName },
    text
  };

  const response = await telegramBot.handleMessage(mockMsg, '');
  res.json(response);
});

app.post('/api/bot-emulator/callback', async (req: Request, res: Response) => {
  const { userId = '777888999', data = '', messageId = 1 } = req.body;
  const mockCb = {
    id: 'mock_cb_' + Date.now(),
    data,
    from: { id: userId },
    message: { chat: { id: userId }, message_id: messageId }
  };

  const response = await telegramBot.handleCallbackQuery(mockCb, '');
  res.json(response);
});

// -----------------------------------------------------------------------------
// STATIC / VITE INTEGRATION
// -----------------------------------------------------------------------------
async function bootstrap() {
  // If a valid bot token was previously stored and active, auto-reconnect on server startup
  const initialSettings = db.getRaw().bot_settings;
  if (initialSettings.main_bot_token && initialSettings.is_main_active) {
    console.log('[Bot Service] Auto-reconnecting saved Telegram Bot Token...');
    telegramBot.startBot(initialSettings.main_bot_token).catch((err) => {
      console.warn('[Bot Service] Auto-reconnect warning:', err.message);
    });
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Etebox System] Server running on port ${PORT} (Prod: ${isProd})`);
  });
}

if (!process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error('[Etebox System] Fatal bootstrap error:', err);
  });
}

export default app;
