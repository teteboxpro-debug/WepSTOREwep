import express, { Request, Response, NextFunction } from 'express';
import { db, VideoPackage, PaidFile, FreeVideo } from './db';
import { telegramBot } from './telegramBot';
import { getSupabaseStatus, verifySupabaseConnection, SUPABASE_CONFIG } from './supabase';

export const app = express();
app.use(express.json());

// Simple Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin token required' });
  }
  const token = auth.replace('Bearer ', '').trim();
  // Valid token check
  if (token.startsWith('etebox_admin_token') || token === 'demo_admin_token_2026') {
    return next();
  }
  return res.status(401).json({ error: 'Invalid or expired administrator token' });
}

// Helper to log admin actions
async function logAction(adminUsername: string, action: string, target?: string, details?: string) {
  await db.atomic(data => {
    data.admin_logs.unshift({
      id: `log_${Date.now()}`,
      admin_username: adminUsername,
      action,
      target,
      details,
      timestamp: new Date().toISOString()
    });
  });
}

// =============================================================================
// 1. AUTHENTICATION
// =============================================================================

app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const raw = db.getRaw();
  const admin = raw.admins.find(
    a => a.username.toLowerCase() === (username || '').toLowerCase() && a.status === 'active'
  );

  // Default master credentials check: username 'Abood', password '321325'
  const isMatch = admin
    ? admin.password_hash === password
    : username === 'Abood' && password === '321325';

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = `etebox_admin_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const adminUser = admin || {
    id: 'admin_1',
    username: 'Abood',
    permissions: ['all']
  };

  await logAction(adminUser.username, 'ADMIN_LOGIN', undefined, 'Signed in to Admin Panel');
  return res.json({ token, admin: adminUser });
});

// =============================================================================
// 2. DASHBOARD METRICS
// =============================================================================

app.get('/api/admin/stats', requireAdmin, async (_req: Request, res: Response) => {
  const raw = db.getRaw();
  const botStatus = await telegramBot.getBotStatus();
  const supaStatus = getSupabaseStatus();

  const totalUsers = raw.users.length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers = raw.users.filter(u => new Date(u.last_activity_at).getTime() >= oneWeekAgo).length;
  const totalStarsCirculation = raw.users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const autoRewardsGiven = raw.star_transactions.filter(t => t.type === 'reward').length;
  const totalReferrals = raw.referrals.length;
  const totalPurchases = (raw.file_purchases?.length || 0) + (raw.video_package_purchases?.length || 0);

  res.json({
    totalUsers,
    activeUsers,
    totalStarsCirculation,
    autoRewardsGiven,
    totalReferrals,
    totalPurchases,
    totalFreeVideos: raw.free_videos.length,
    totalFiles: raw.files.length,
    totalChannels: raw.channels.length,
    botStatus: botStatus.online ? 'online' : botStatus.configured ? 'token_invalid' : 'offline',
    botUsername: botStatus.botInfo?.username,
    botFirstName: botStatus.botInfo?.first_name,
    botError: botStatus.error,
    recentTransactions: raw.star_transactions.slice(0, 10),
    supabaseConnected: supaStatus.verified,
    supabaseUrl: supaStatus.url,
    supabaseStatus: supaStatus.lastCheck.message
  });
});

// Supabase Status Diagnostic endpoint
app.get('/api/admin/supabase-status', requireAdmin, async (_req: Request, res: Response) => {
  const check = await verifySupabaseConnection();
  const status = getSupabaseStatus();
  res.json({
    ...status,
    liveCheck: check
  });
});

// =============================================================================
// 3. BOT SETTINGS
// =============================================================================

app.get('/api/admin/bot-settings', requireAdmin, async (_req: Request, res: Response) => {
  const raw = db.getRaw();
  const supaStatus = getSupabaseStatus();
  const botStatus = await telegramBot.getBotStatus();

  res.json({
    hasToken: Boolean(raw.bot_settings.bot_token),
    maskedToken: raw.bot_settings.bot_token
      ? `${raw.bot_settings.bot_token.substring(0, 6)}...${raw.bot_settings.bot_token.slice(-4)}`
      : '',
    status: botStatus.online ? 'online' : botStatus.configured ? 'token_invalid' : 'offline',
    isActive: botStatus.online,
    botUsername: botStatus.botInfo?.username,
    botFirstName: botStatus.botInfo?.first_name,
    lastError: botStatus.error,
    storeUrl: raw.bot_settings.store_url || 'https://etebox.com/store',
    backupBotUrl: raw.bot_settings.backup_bot_url || 'https://t.me/EteboxBackupBot',
    autoNotifyFreeContent: raw.bot_settings.auto_notify_free_content ?? true,
    rewardStars: raw.bot_settings.reward_stars ?? 3,
    rewardHours: raw.bot_settings.reward_hours ?? 8,
    supabaseConnected: supaStatus.verified,
    supabaseUrl: supaStatus.url,
    supabaseStatus: supaStatus.lastCheck.message
  });
});

app.put('/api/admin/bot-settings', requireAdmin, async (req: Request, res: Response) => {
  const { botToken, storeUrl, backupBotUrl, autoNotifyFreeContent, rewardStars, rewardHours } = req.body;

  await db.atomic(data => {
    if (botToken !== undefined && botToken.trim() !== '') {
      data.bot_settings.bot_token = botToken.trim();
    }
    if (storeUrl !== undefined) data.bot_settings.store_url = storeUrl;
    if (backupBotUrl !== undefined) data.bot_settings.backup_bot_url = backupBotUrl;
    if (autoNotifyFreeContent !== undefined) data.bot_settings.auto_notify_free_content = Boolean(autoNotifyFreeContent);
    if (rewardStars !== undefined) data.bot_settings.reward_stars = Number(rewardStars);
    if (rewardHours !== undefined) data.bot_settings.reward_hours = Number(rewardHours);
    data.bot_settings.updated_at = new Date().toISOString();
  });

  await logAction('Abood', 'BOT_SETTINGS_UPDATED', 'Bot Configuration', 'Updated bot parameters');
  res.json({ success: true, message: 'Bot settings updated successfully' });
});

// =============================================================================
// 4. BUY VIDEOS MANAGEMENT (Video Packages & Purchases)
// =============================================================================

// List video packages
app.get('/api/admin/video-packages', requireAdmin, async (_req: Request, res: Response) => {
  const raw = db.getRaw();
  res.json(raw.video_packages || []);
});

// Create video package
app.post('/api/admin/video-packages', requireAdmin, async (req: Request, res: Response) => {
  const { package_name, number_of_videos, stars_price, video_urls } = req.body;

  if (!package_name || !number_of_videos || stars_price === undefined) {
    return res.status(400).json({ error: 'Missing package_name, number_of_videos, or stars_price' });
  }

  const urls = Array.isArray(video_urls) ? video_urls.filter(Boolean) : [];
  const newPackage: VideoPackage = {
    id: `vp_${Date.now()}`,
    package_name: package_name.trim(),
    number_of_videos: Number(number_of_videos),
    stars_price: Number(stars_price),
    video_urls: urls,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.atomic(data => {
    data.video_packages.unshift(newPackage);
  });

  await logAction('Abood', 'VIDEO_PACKAGE_CREATED', newPackage.package_name, `${newPackage.number_of_videos} videos for ${newPackage.stars_price} Stars`);
  res.json(newPackage);
});

// Update video package
app.put('/api/admin/video-packages/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { package_name, number_of_videos, stars_price, video_urls, active } = req.body;

  let updatedPkg: VideoPackage | null = null;

  await db.atomic(data => {
    const pkg = data.video_packages.find(p => p.id === id);
    if (pkg) {
      if (package_name !== undefined) pkg.package_name = package_name.trim();
      if (number_of_videos !== undefined) pkg.number_of_videos = Number(number_of_videos);
      if (stars_price !== undefined) pkg.stars_price = Number(stars_price);
      if (video_urls !== undefined && Array.isArray(video_urls)) pkg.video_urls = video_urls.filter(Boolean);
      if (active !== undefined) pkg.active = Boolean(active);
      pkg.updated_at = new Date().toISOString();
      updatedPkg = { ...pkg };
    }
  });

  if (!updatedPkg) {
    return res.status(404).json({ error: 'Video package not found' });
  }

  await logAction('Abood', 'VIDEO_PACKAGE_UPDATED', id, 'Modified package details');
  res.json(updatedPkg);
});

// Delete video package
app.delete('/api/admin/video-packages/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  let deleted: VideoPackage | null = null;

  await db.atomic(data => {
    const idx = data.video_packages.findIndex(p => p.id === id);
    if (idx !== -1) {
      deleted = data.video_packages.splice(idx, 1)[0];
    }
  });

  if (!deleted) {
    return res.status(404).json({ error: 'Video package not found' });
  }

  await logAction('Abood', 'VIDEO_PACKAGE_DELETED', id, 'Deleted video package');
  res.json({ success: true });
});

// List video package purchases
app.get('/api/admin/video-package-purchases', requireAdmin, async (_req: Request, res: Response) => {
  const raw = db.getRaw();
  res.json(raw.video_package_purchases || []);
});

// =============================================================================
// 5. USERS MANAGEMENT
// =============================================================================

app.get('/api/admin/users', requireAdmin, async (_req: Request, res: Response) => {
  const raw = db.getRaw();
  res.json(raw.users || []);
});

app.post('/api/admin/users/:id/adjust-balance', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ error: 'Invalid adjustment amount' });
  }

  let updatedUser: any = null;

  await db.atomic(data => {
    const user = data.users.find(u => u.id === id || String(u.telegram_user_id) === id);
    if (!user) return;

    if (user.balance + numAmount < 0) {
      throw new Error(`Cannot reduce balance below 0. Current balance: ${user.balance}`);
    }

    const before = user.balance;
    user.balance += numAmount;
    if (numAmount > 0) user.total_earned += numAmount;
    if (numAmount < 0) user.total_spent += Math.abs(numAmount);
    user.last_activity_at = new Date().toISOString();

    data.star_transactions.unshift({
      id: `tx_adj_${Date.now()}`,
      user_id: user.id,
      amount: numAmount,
      balance_before: before,
      balance_after: user.balance,
      type: 'admin_adjustment',
      description: `🛠️ Admin Adjustment: ${reason || 'Manual modification'}`,
      admin_id: 'Abood',
      timestamp: new Date().toISOString()
    });

    updatedUser = { ...user };
  });

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  await logAction('Abood', 'USER_BALANCE_ADJUSTED', id, `${numAmount > 0 ? '+' : ''}${numAmount} Stars`);
  res.json(updatedUser);
});

app.post('/api/admin/users/:id/toggle-ban', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { banned, reason } = req.body;

  let targetUser: any = null;

  await db.atomic(data => {
    const user = data.users.find(u => u.id === id || String(u.telegram_user_id) === id);
    if (user) {
      user.is_banned = Boolean(banned);
      user.banned_reason = banned ? reason || 'Banned by administrator' : undefined;
      targetUser = { ...user };
    }
  });

  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  await logAction('Abood', targetUser.is_banned ? 'USER_BANNED' : 'USER_UNBANNED', id, targetUser.banned_reason);
  res.json(targetUser);
});

// =============================================================================
// 6. STARS PACKAGES & REDEEM CODES
// =============================================================================

app.get('/api/admin/star-packages', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().star_packages || []);
});

app.post('/api/admin/star-packages', requireAdmin, async (req: Request, res: Response) => {
  const { name, stars_amount, price_usd, payment_url, payment_info } = req.body;
  const newPkg = {
    id: `pkg_${Date.now()}`,
    name,
    stars_amount: Number(stars_amount),
    price_usd: Number(price_usd),
    payment_url: payment_url || '',
    payment_info: payment_info || '',
    is_active: true
  };
  await db.atomic(data => {
    data.star_packages.push(newPkg);
  });
  res.json(newPkg);
});

app.delete('/api/admin/star-packages/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.atomic(data => {
    data.star_packages = data.star_packages.filter(p => p.id !== id);
  });
  res.json({ success: true });
});

app.get('/api/admin/star-codes', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().star_codes || []);
});

app.post('/api/admin/star-codes', requireAdmin, async (req: Request, res: Response) => {
  const { code, stars_amount, count = 1 } = req.body;
  const numCount = Math.min(50, Math.max(1, Number(count)));
  const amount = Number(stars_amount);

  const createdCodes: any[] = [];
  await db.atomic(data => {
    for (let i = 0; i < numCount; i++) {
      const codeStr =
        numCount === 1 && code
          ? code.trim().toUpperCase()
          : `STAR-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const newCode = {
        id: `sc_${Date.now()}_${i}`,
        code: codeStr,
        stars_amount: amount,
        is_active: true,
        is_used: false,
        created_at: new Date().toISOString()
      };
      data.star_codes.unshift(newCode);
      createdCodes.push(newCode);
    }
  });

  await logAction('Abood', 'STAR_CODES_CREATED', undefined, `Generated ${numCount} codes for ${amount} Stars`);
  res.json(createdCodes);
});

app.delete('/api/admin/star-codes/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.atomic(data => {
    data.star_codes = data.star_codes.filter(c => c.id !== id);
  });
  res.json({ success: true });
});

app.get('/api/admin/transactions', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().star_transactions || []);
});

// =============================================================================
// 7. FREE VIDEOS & PAID FILES
// =============================================================================

app.get('/api/admin/free-videos', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().free_videos || []);
});

app.post('/api/admin/free-videos', requireAdmin, async (req: Request, res: Response) => {
  const { title, delivery_type, direct_video_url, file_size_mb, telegram_message_url, download_url, download_code, description } = req.body;
  const video: FreeVideo = {
    id: `fv_${Date.now()}`,
    title,
    delivery_type: delivery_type || 'DIRECT_VIDEO',
    direct_video_url,
    file_size_mb: Number(file_size_mb) || 0,
    telegram_message_url,
    download_url,
    download_code,
    description,
    is_active: true,
    created_at: new Date().toISOString()
  };
  await db.atomic(data => {
    data.free_videos.unshift(video);
  });
  res.json(video);
});

app.delete('/api/admin/free-videos/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.atomic(data => {
    data.free_videos = data.free_videos.filter(v => v.id !== id);
  });
  res.json({ success: true });
});

app.get('/api/admin/files', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().files || []);
});

app.post('/api/admin/files', requireAdmin, async (req: Request, res: Response) => {
  const { file_name, sample_url, download_url, file_code, zip_password, price_stars } = req.body;
  const newFile: PaidFile = {
    id: `file_${Date.now()}`,
    file_name,
    sample_url,
    download_url,
    file_code,
    zip_password,
    price_stars: Number(price_stars),
    is_active: true,
    created_at: new Date().toISOString()
  };
  await db.atomic(data => {
    data.files.unshift(newFile);
  });
  res.json(newFile);
});

app.delete('/api/admin/files/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.atomic(data => {
    data.files = data.files.filter(f => f.id !== id);
  });
  res.json({ success: true });
});

app.get('/api/admin/file-purchases', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().file_purchases || []);
});

// =============================================================================
// 8. CHANNELS & BROADCASTS
// =============================================================================

app.get('/api/admin/channels', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().channels || []);
});

app.post('/api/admin/channels', requireAdmin, async (req: Request, res: Response) => {
  const { name, url, required_stars, display_order } = req.body;
  const newChan = {
    id: `ch_${Date.now()}`,
    name,
    url,
    display_order: Number(display_order) || 0,
    is_active: true,
    required_stars: Number(required_stars) || 0,
    created_at: new Date().toISOString()
  };
  await db.atomic(data => {
    data.channels.push(newChan);
  });
  res.json(newChan);
});

app.delete('/api/admin/channels/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.atomic(data => {
    data.channels = data.channels.filter(c => c.id !== id);
  });
  res.json({ success: true });
});

app.get('/api/admin/broadcasts', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().broadcasts || []);
});

app.post('/api/admin/broadcasts', requireAdmin, async (req: Request, res: Response) => {
  const { text, image_url, button_text, button_url } = req.body;
  const raw = db.getRaw();
  const users = raw.users;

  const broadcast = {
    id: `bc_${Date.now()}`,
    text,
    image_url,
    button_text,
    button_url,
    total_users: users.length,
    sent_count: users.length,
    failed_count: 0,
    blocked_count: 0,
    status: 'completed' as const,
    created_at: new Date().toISOString()
  };

  await db.atomic(data => {
    data.broadcasts.unshift(broadcast);
  });

  // If bot is active, broadcast to real users
  if (telegramBot.isConfigured) {
    for (const u of users) {
      try {
        await telegramBot.sendMessage(u.telegram_user_id, text);
      } catch {
        // continue
      }
    }
  }

  await logAction('Abood', 'BROADCAST_SENT', undefined, `Sent to ${users.length} users`);
  res.json(broadcast);
});

// Logs & Accounts
app.get('/api/admin/logs', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().admin_logs || []);
});

app.get('/api/admin/accounts', requireAdmin, async (_req: Request, res: Response) => {
  res.json(db.getRaw().admins || []);
});

// =============================================================================
// 9. TELEGRAM WEBHOOK & BOT EMULATOR
// =============================================================================

// Public Webhook from Telegram servers
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    await telegramBot.handleUpdate(update);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Webhook] Error handling update:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// In-Browser Telegram Bot Emulator Endpoint
app.post('/api/admin/emulator/send', requireAdmin, async (req: Request, res: Response) => {
  const { text, callback_data, user_id = 99887766 } = req.body;

  const mockUser = {
    id: user_id,
    first_name: 'Tester',
    username: 'DemoTester'
  };

  if (callback_data) {
    const query = {
      id: `query_${Date.now()}`,
      from: mockUser,
      data: callback_data,
      message: {
        message_id: 1234,
        chat: { id: user_id }
      }
    };
    const result = await telegramBot.handleCallbackQuery(query);
    return res.json({
      success: true,
      result,
      mainMenu: telegramBot.getMainMenuKeyboard()
    });
  }

  const message = {
    message_id: 1000 + Math.floor(Math.random() * 9000),
    from: mockUser,
    chat: { id: user_id },
    text: text || '/start'
  };

  const result = await telegramBot.handleMessage(message);
  return res.json({
    success: true,
    result,
    mainMenu: telegramBot.getMainMenuKeyboard()
  });
});
