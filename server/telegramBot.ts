import { db, User, FreeVideo, PaidFile, VideoPackage, VideoPackagePurchase } from './db.js';
import crypto from 'node:crypto';

// Cleans bot token of any mobile copy-paste artifacts:
// - Removes invisible Unicode formatting characters (LTR/RTL markers, zero-width spaces, BOM)
// - Normalizes Eastern/Arabic-Indic digits to Latin digits
// - Extracts the actual token if the user pasted the entire message from BotFather
export function cleanBotToken(input: string): string {
  if (!input) return '';
  let str = input.toString();

  // Convert Arabic-Indic numerals (٠-٩) and Persian numerals (۰-۹) to standard digits (0-9)
  str = str.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  str = str.replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString());

  // Remove invisible formatting and unicode control characters
  str = str.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u00A0\r\n\t]/g, '');

  // Strip wrapping quotes, brackets or symbols
  str = str.replace(/^["'`<(\[]+|["'`>)\]]+$/g, '').trim();

  // Extract token if embedded in text (e.g. from BotFather text: "Use this token to access...")
  const match = str.match(/\b(\d{8,12}:[A-Za-z0-9_-]{30,50})\b/);
  if (match) {
    return match[1].trim();
  }

  // Remove remaining spaces
  return str.replace(/\s+/g, '');
}

// Telegram API Helper
export class TelegramBotService {
  private pollingActive = false;
  private pollAbortController: AbortController | null = null;
  private currentToken: string = '';
  private deleteInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoDeleteWorker();
  }

  // Telegram API request wrapper with markdown fallback and error resilience
  public async apiCall(token: string, method: string, payload: Record<string, any> = {}): Promise<any> {
    const cleanToken = cleanBotToken(token);
    if (!cleanToken) {
      return { ok: false, error: 'Empty bot token' };
    }

    const url = `https://api.telegram.org/bot${cleanToken}/${method}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[Telegram API] ${method} -> response status: ${res.status}`);
      const data = await res.json().catch(() => ({ ok: false, description: 'Invalid response from Telegram API' }));
      if (!data.ok) {
        console.warn(`[Telegram API] ${method} error response:`, data.description || data);
        // If Markdown formatting failed, retry sending as plain text
        if (payload.parse_mode) {
          const fallback = { ...payload };
          delete fallback.parse_mode;
          const retryRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallback)
          });
          return await retryRes.json().catch(() => data);
        }
      }
      return data;
    } catch (err: any) {
      console.error(`[Telegram API] Network error in ${method}:`, err.message);
      return { ok: false, error: err.name === 'AbortError' ? 'Telegram request timed out' : err.message };
    }
  }

  // Validate bot token
  public async validateToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    const cleanToken = cleanBotToken(token);
    if (!cleanToken) {
      return { valid: false, error: 'يرجى كتابة أو لصق توكن البوت' };
    }

    try {
      const res = await this.apiCall(cleanToken, 'getMe');
      if (res.ok && res.result?.is_bot) {
        return { valid: true, user: res.result };
      }
      const desc = res.description || res.error || '';
      if (desc.toLowerCase().includes('unauthorized')) {
        return { valid: false, error: 'التوكن غير مصرح به (Unauthorized). تأكد من صحة التوكن من @BotFather دون تعديل.' };
      }
      if (desc.toLowerCase().includes('not found')) {
        return { valid: false, error: 'التوكن غير موجود لدى سيرفرات تيليجرام (Not Found). تأكد من نسخ كامل التوكن.' };
      }
      return { valid: false, error: desc || 'توكن البوت غير صالح' };
    } catch (err: any) {
      return { valid: false, error: err.message || 'تعذر الاتصال بسيرفر تيليجرام' };
    }
  }

  // Webhook helpers for cloud/Vercel environments
  public async getWebhookInfo(token: string): Promise<any> {
    const cleanToken = cleanBotToken(token);
    const res = await this.apiCall(cleanToken, 'getWebhookInfo');
    return res.result;
  }

  public async setWebhook(token: string, webhookUrl: string, secretToken?: string): Promise<{ success: boolean; description?: string }> {
    this.stopBot();
    const cleanToken = cleanBotToken(token);
    const cleanUrl = webhookUrl.trim();
    const payload: Record<string, any> = {
      url: cleanUrl,
      drop_pending_updates: false,
      allowed_updates: ['message', 'callback_query']
    };
    if (secretToken) {
      payload.secret_token = secretToken;
    }
    const res = await this.apiCall(cleanToken, 'setWebhook', payload);

    if (res.ok) {
      await db.atomic((d) => {
        d.bot_settings.status = 'online';
        d.bot_settings.webhook_url = cleanUrl;
        if (secretToken) {
          d.bot_settings.webhook_secret = secretToken;
        }
        d.bot_settings.last_error = undefined;
      });
      return { success: true, description: res.description || 'Webhook registered successfully' };
    }
    return { success: false, description: res.description || res.error || 'Failed to set webhook' };
  }

  public async deleteWebhook(token: string): Promise<{ success: boolean; description?: string }> {
    const res = await this.apiCall(token.trim(), 'deleteWebhook', { drop_pending_updates: false });
    if (res.ok) {
      this.currentToken = token.trim();
      this.pollingActive = true;
      this.pollAbortController = new AbortController();
      this.runPollingLoop();
      return { success: true, description: 'Webhook removed. Long polling activated.' };
    }
    return { success: false, description: res.description || 'Failed to delete webhook' };
  }

  // Start Bot Service with Token
  public async startBot(token: string): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateToken(token);
    if (!validation.valid || !validation.user) {
      await db.atomic((data) => {
        data.bot_settings.status = 'token_invalid';
        data.bot_settings.last_error = validation.error || 'Token validation failed';
      });
      return { success: false, error: validation.error };
    }

    // Stop existing polling if any
    this.stopBot();

    this.currentToken = token.trim();

    // Check if webhook is active
    const hookInfo = await this.getWebhookInfo(this.currentToken);
    if (!hookInfo?.url) {
      // No webhook configured, clear any stale webhook and activate long polling
      await this.apiCall(this.currentToken, 'deleteWebhook', { drop_pending_updates: false });
      this.pollingActive = true;
      this.pollAbortController = new AbortController();
      this.runPollingLoop();
    } else {
      console.log('[Telegram Bot] Bot is using active Webhook:', hookInfo.url);
    }

    await db.atomic((data) => {
      data.bot_settings.main_bot_token = this.currentToken;
      data.bot_settings.is_main_active = true;
      data.bot_settings.main_bot_username = validation.user.username;
      data.bot_settings.main_bot_first_name = validation.user.first_name;
      data.bot_settings.status = 'online';
      data.bot_settings.last_error = undefined;
    });

    return { success: true };
  }

  // Stop Bot Service
  public stopBot() {
    this.pollingActive = false;
    if (this.pollAbortController) {
      this.pollAbortController.abort();
      this.pollAbortController = null;
    }
  }

  // Background polling loop
  private async runPollingLoop() {
    let offset = 0;
    while (this.pollingActive) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.currentToken}/getUpdates?offset=${offset}&timeout=20`, {
          signal: this.pollAbortController?.signal
        });

        if (!res.ok) {
          if (res.status === 409) {
            console.warn('[Telegram Poll] 409 Conflict. Clearing webhook and retrying...');
            await this.apiCall(this.currentToken, 'deleteWebhook', { drop_pending_updates: false });
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          console.warn('[Telegram Poll] HTTP error:', res.status, res.statusText);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            try {
              await this.handleUpdate(update, this.currentToken);
            } catch (err) {
              console.error('[Telegram] Error handling update:', err);
            }
          }
        } else {
          if (data.error_code === 401) {
            console.error('[Telegram] 401 Unauthorized token');
            await db.atomic((d) => {
              d.bot_settings.status = 'token_invalid';
              d.bot_settings.last_error = 'Unauthorized: Bot Token revoked';
            });
            this.stopBot();
            break;
          }
          if (data.error_code === 409) {
            console.warn('[Telegram Poll] 409 Conflict in response. Clearing webhook...');
            await this.apiCall(this.currentToken, 'deleteWebhook', { drop_pending_updates: false });
          }
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        console.warn('[Telegram Poll] Connection retry in 3s:', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  // Main menu inline keyboard markup with decorative Unicode style (no persistent reply keyboard)
  public getMainMenuKeyboard() {
    const raw = db.getRaw();
    const storeUrl = raw.bot_settings?.store_url || 'https://etebox.com/store';
    const backupUrl = raw.bot_settings?.backup_bot_url || 'https://t.me/EteboxBackupBot';

    return {
      inline_keyboard: [
        [{ text: '🎬 Bᴜʏ Vɪᴅᴇᴏs', callback_data: 'menu_buy_videos' }],
        [{ text: '🆓 Fʀᴇᴇ 1 Vɪᴅᴇᴏs', callback_data: 'menu_free_videos' }, { text: '💰 Mʏ Bᴀʟᴀɴᴄᴇ', callback_data: 'menu_my_balance' }],
        [{ text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }, { text: '📺 Cʜᴀɴɴᴇʟs', callback_data: 'menu_channels' }],
        [{ text: '📁 Fɪʟᴇs', callback_data: 'menu_files' }, { text: '🛒 Eɴᴛᴇʀ Sᴛᴏʀᴇ', url: storeUrl }],
        [{ text: '🔄 Bᴀᴄᴋᴜᴘ Bᴏᴛ', url: backupUrl }, { text: '👥 Rᴇғᴇʀ & Eᴀʀɴ', callback_data: 'menu_refer_earn' }],
        [{ text: '🎮 Gᴀᴍᴇs', callback_data: 'menu_games' }]
      ]
    };
  }

  // Auto-delete worker running every 15 seconds
  private startAutoDeleteWorker() {
    if (this.deleteInterval) clearInterval(this.deleteInterval);
    this.deleteInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const settings = db.getRaw().bot_settings;
        if (!settings.main_bot_token || settings.status !== 'online') return;

        const toDelete: { id: string; chat_id: string; message_id: number }[] = [];
        await db.atomic((data) => {
          const remaining = [];
          for (const item of data.scheduled_deletions) {
            if (item.delete_at <= now) {
              toDelete.push(item);
            } else {
              remaining.push(item);
            }
          }
          data.scheduled_deletions = remaining;
        });

        for (const item of toDelete) {
          try {
            await this.apiCall(settings.main_bot_token, 'deleteMessage', {
              chat_id: item.chat_id,
              message_id: item.message_id
            });
          } catch {
            // Ignore message deletion failures (e.g. if already deleted by user)
          }
        }
      } catch (err) {
        console.error('[AutoDelete] Error processing deletions:', err);
      }
    }, 15000);
  }

  // Schedule a message for auto-deletion in 10 minutes
  public async scheduleMessageDeletion(chatId: string, messageId: number, delayMs = 10 * 60 * 1000) {
    await db.atomic((data) => {
      data.scheduled_deletions.push({
        id: crypto.randomUUID(),
        chat_id: chatId,
        message_id: messageId,
        delete_at: Date.now() + delayMs
      });
    });
  }

  // Human Verification check (48h inactivity)
  private async checkHumanVerificationNeeded(userId: string): Promise<boolean> {
    const raw = db.getRaw();
    const user = raw.users[userId];
    if (!user) return false;

    // If verification already pending
    if (user.verification_status === 'pending') return true;

    // Check if more than 48 hours since last activity
    const lastActivity = new Date(user.last_activity_at).getTime();
    const elapsed = Date.now() - lastActivity;
    const hours48 = 48 * 60 * 60 * 1000;

    if (elapsed > hours48) {
      await db.atomic((data) => {
        if (data.users[userId]) {
          data.users[userId].verification_status = 'pending';
        }
      });
      return true;
    }
    return false;
  }

  // Generate server-side math verification challenge
  public async createVerificationChallenge(userId: string) {
    const num1 = Math.floor(Math.random() * 15) + 5;
    const num2 = Math.floor(Math.random() * 15) + 5;
    const correct = num1 * num2;

    const wrong1 = correct + 10;
    const wrong2 = Math.max(10, correct - 10);
    const options = [correct, wrong1, wrong2].sort(() => Math.random() - 0.5);

    const challenge = {
      id: crypto.randomUUID(),
      user_id: userId,
      question: `${num1} × ${num2} = ?`,
      options,
      correct_answer: correct,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };

    await db.atomic((data) => {
      data.human_verifications[userId] = challenge;
    });

    return challenge;
  }

  // Process 8-hour Auto-Reward
  public async processAutoReward(userId: string): Promise<{ rewarded: boolean; newBalance?: number; nextRewardHours?: number }> {
    return await db.atomic((data) => {
      const user = data.users[userId];
      if (!user) return { rewarded: false };

      const now = Date.now();
      const lastReward = user.last_auto_reward_at ? new Date(user.last_auto_reward_at).getTime() : 0;
      const eightHoursMs = 8 * 60 * 60 * 1000;

      if (now - lastReward >= eightHoursMs) {
        const balanceBefore = user.balance;
        user.balance += 3;
        user.total_earned += 3;
        user.last_auto_reward_at = new Date(now).toISOString();

        // Transaction record
        data.star_transactions.push({
          id: crypto.randomUUID(),
          user_id: userId,
          amount: 3,
          balance_before: balanceBefore,
          balance_after: user.balance,
          type: 'AUTO_REWARD',
          description: '8-Hour Auto Reward (+3 Stars)',
          timestamp: new Date(now).toISOString()
        });

        return { rewarded: true, newBalance: user.balance, nextRewardHours: 8 };
      }

      const hoursLeft = Math.ceil((eightHoursMs - (now - lastReward)) / (60 * 60 * 1000));
      return { rewarded: false, nextRewardHours: hoursLeft };
    });
  }

  // Handle incoming Telegram update
  public async handleUpdate(update: any, token: string) {
    if (update.message) {
      await this.handleMessage(update.message, token);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query, token);
    }
  }

  // Handle Telegram text message
  public async handleMessage(message: any, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const chatId = message.chat?.id?.toString() || message.from?.id?.toString();
    const userId = message.from?.id?.toString();
    const username = message.from?.username || '';
    const firstName = message.from?.first_name || 'User';
    const text = (message.text || '').trim();

    if (!userId) return { text: '❌ Invalid user request.' };

    // 1. Get or create user record
    let user = await db.atomic((data) => {
      let u = data.users[userId];
      const nowIso = new Date().toISOString();
      if (!u) {
        u = {
          id: userId,
          username,
          first_name: firstName,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          registered_at: nowIso,
          last_activity_at: nowIso,
          verification_status: 'verified',
          last_verification_at: nowIso,
          failed_verification_attempts: 0,
          is_banned: false,
          referral_count: 0
        };
        data.users[userId] = u;

        // Process referral link if /start ref_USERID
        if (text.startsWith('/start ref_')) {
          const referrerId = text.replace('/start ref_', '').trim();
          if (referrerId !== userId && data.users[referrerId]) {
            u.referred_by = referrerId;
            data.referrals.push({
              id: crypto.randomUUID(),
              referrer_user_id: referrerId,
              referred_user_id: userId,
              status: 'qualified', // or verified
              stars_rewarded: 10,
              created_at: nowIso,
              qualified_at: nowIso
            });

            // Credit referrer
            const referrer = data.users[referrerId];
            const refBalBefore = referrer.balance;
            referrer.balance += 10;
            referrer.total_earned += 10;
            referrer.referral_count += 1;

            data.star_transactions.push({
              id: crypto.randomUUID(),
              user_id: referrerId,
              amount: 10,
              balance_before: refBalBefore,
              balance_after: referrer.balance,
              type: 'REFERRAL',
              description: `Referral bonus for inviting ${username ? '@' + username : firstName}`,
              timestamp: nowIso
            });
          }
        }
      } else {
        // Update user activity
        u.last_activity_at = nowIso;
        if (username) u.username = username;
        if (firstName) u.first_name = firstName;
      }
      return u;
    });

    // Check Ban
    if (user.is_banned) {
      const banMsg = `❌ Your account has been suspended.\nReason: ${user.banned_reason || 'Violation of terms'}`;
      if (token) {
        await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: banMsg });
      }
      return { text: banMsg };
    }

    // 2. Check 48h Human Verification
    const needsVerification = await this.checkHumanVerificationNeeded(userId);
    if (needsVerification) {
      const challenge = await this.createVerificationChallenge(userId);
      const inlineKeyboard = {
        inline_keyboard: [
          challenge.options.map((opt) => ({
            text: opt.toString(),
            callback_data: `verify_${opt}`
          }))
        ]
      };
      const promptText = `🤖 Human Verification Required\n\nYou haven't used the bot recently. Please solve this to continue:\n\n${challenge.question}`;
      if (token) {
        await this.apiCall(token, 'sendMessage', {
          chat_id: chatId,
          text: promptText,
          reply_markup: inlineKeyboard
        });
      }
      return { text: promptText, replyMarkup: inlineKeyboard };
    }

    // Check for Auto Reward on any interaction!
    const autoReward = await this.processAutoReward(userId);
    if (autoReward.rewarded && token) {
      const rewardMsg = `🎁 Auto Reward Received!\n\n⭐ Stars Earned: +3\n💰 New Balance: ${autoReward.newBalance} Stars\n✨ Next auto reward in 8 hours!`;
      await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: rewardMsg });
    }

    // 3. Routing commands and button clicks
    const keyboard = this.getMainMenuKeyboard();
    const clean = text.trim();
    const cleanLower = clean.toLowerCase();

    // Check code redemption command: /redeem CODE
    if (cleanLower.startsWith('/redeem') || cleanLower.startsWith('redeem ') || clean.startsWith('كود ') || clean.startsWith('شحن ')) {
      const codePart = clean.replace(/^(\/?redeem|كود|شحن)\s*/i, '').trim();
      if (!codePart) {
        const msg = 'ℹ️ To redeem a Stars code, send:\n`/redeem YOUR_CODE`';
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
        return { text: msg };
      }
      const redeemRes = await this.redeemStarsCode(userId, codePart);
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: redeemRes.message });
      return { text: redeemRes.message };
    }

    // New Menu Button: 🎬 Bᴜʏ Vɪᴅᴇᴏs
    if (
      clean.includes('Bᴜʏ Vɪᴅᴇᴏs') ||
      cleanLower.includes('buy videos') ||
      cleanLower === '/buyvideos' ||
      clean.includes('فيديوهات') ||
      clean.includes('شراء')
    ) {
      return await this.handleBuyVideosMenu(chatId, userId, token);
    }

    // Button 1: 🆓 Fʀᴇᴇ 1 Vɪᴅᴇᴏs
    if (
      clean.includes('FREE 1 VIDEOS') ||
      clean.includes('Fʀᴇᴇ 1 Vɪᴅᴇᴏs') ||
      clean.includes('Fʀᴇᴇ Vɪᴅᴇᴏs') ||
      cleanLower === '/free' ||
      clean.includes('مجاني')
    ) {
      return await this.handleFreeVideosMenu(chatId, token);
    }

    // Button 2: 💰 Mʏ Bᴀʟᴀɴᴄᴇ
    if (
      clean.includes('My Balance') ||
      clean.includes('Mʏ Bᴀʟᴀɴᴄᴇ') ||
      cleanLower === '/balance' ||
      clean.includes('رصيدي') ||
      clean.includes('رصيد')
    ) {
      return await this.handleMyBalanceMenu(chatId, userId, token);
    }

    // Button 3: ⭐ Bᴜʏ Sᴛᴀʀs
    if (
      clean.includes('Buy Stars') ||
      clean.includes('Bᴜʏ Sᴛᴀʀs') ||
      cleanLower === '/buy' ||
      clean.includes('اشترِ النجوم') ||
      clean.includes('شراء النجوم')
    ) {
      return await this.handleBuyStarsMenu(chatId, token);
    }

    // Button 4: 📺 Cʜᴀɴɴᴇʟs
    if (
      clean.includes('Channels') ||
      clean.includes('Cʜᴀɴɴᴇʟs') ||
      cleanLower === '/channels' ||
      clean.includes('القنوات') ||
      clean.includes('قنوات')
    ) {
      return await this.handleChannelsMenu(chatId, userId, token);
    }

    // Button 5: 📁 Fɪʟᴇs
    if (
      clean.includes('Files') ||
      clean.includes('Fɪʟᴇs') ||
      cleanLower === '/files' ||
      clean.includes('الملفات') ||
      clean.includes('ملفات')
    ) {
      return await this.handleFilesMenu(chatId, token);
    }

    // Button 6: 🛒 Eɴᴛᴇʀ Sᴛᴏʀᴇ
    if (
      clean.includes('Enter Store') ||
      clean.includes('Eɴᴛᴇʀ Sᴛᴏʀᴇ') ||
      cleanLower === '/store' ||
      clean.includes('المتجر')
    ) {
      return await this.handleStoreMenu(chatId, token);
    }

    // Button 7: 🔄 Bᴀᴄᴋᴜᴘ Bᴏᴛ
    if (
      clean.includes('Backup Bot') ||
      clean.includes('Bᴀᴄᴋᴜᴘ Bᴏᴛ') ||
      cleanLower === '/backup' ||
      clean.includes('الاحتياطي')
    ) {
      return await this.handleBackupBotMenu(chatId, token);
    }

    // Button 8: 👥 Rᴇғᴇʀ & Eᴀʀɴ
    if (
      clean.includes('Refer & Earn') ||
      clean.includes('Rᴇғᴇʀ & Eᴀʀɴ') ||
      cleanLower === '/refer' ||
      clean.includes('الإحالة') ||
      clean.includes('احالة')
    ) {
      return await this.handleReferEarnMenu(chatId, userId, token);
    }

    // Button 9: 🎮 Gᴀᴍᴇs
    if (
      clean.includes('Games') ||
      clean.includes('Gᴀᴍᴇs') ||
      cleanLower === '/games' ||
      clean.includes('ألعاب') ||
      clean.includes('العاب')
    ) {
      return await this.handleGamesMenu(chatId, token);
    }

    // Default /start or welcome
    const welcome = `👋 Welcome to ETEBOX!\n\nYour Permanent ID: \`${userId}\`\n\nChoose an option from the menu below to browse exclusive videos, manage your Stars, and download files:`;
    if (token) {
      await this.apiCall(token, 'sendMessage', {
        chat_id: chatId,
        text: welcome,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    return { text: welcome, replyMarkup: keyboard };
  }

  // ---------------------------------------------------------------------------
  // Bot Menu Helper Methods (All in English with decorative Unicode text style)
  // ---------------------------------------------------------------------------
  public async handleBuyVideosMenu(chatId: string, userId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const raw = db.getRaw();
    const packages = (raw.video_packages || []).filter((p) => p.is_active);

    if (packages.length === 0) {
      const msg = `🎬 Bᴜʏ Vɪᴅᴇᴏs\n\nNo video packages are available at the moment. Please check back later!`;
      const markup = {
        inline_keyboard: [[{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
      };
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      return { text: msg, replyMarkup: markup };
    }

    const buttons: Array<Array<{ text: string; callback_data: string }>> = packages.map((pkg) => [
      { text: `🎬 ${pkg.name} (${pkg.video_count} Videos) — ⭐ ${pkg.stars_price}`, callback_data: `vpkg_info_${pkg.id}` }
    ]);
    buttons.push([{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

    const msg = `🎬 Bᴜʏ Vɪᴅᴇᴏs\n\nSelect a video package below to view details and unlock with Stars:`;
    if (token) {
      await this.apiCall(token, 'sendMessage', {
        chat_id: chatId,
        text: msg,
        reply_markup: { inline_keyboard: buttons }
      });
    }
    return { text: msg, replyMarkup: { inline_keyboard: buttons } };
  }

  public async handleFreeVideosMenu(chatId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const videos = db.getRaw().free_videos.filter((v) => v.is_active);
    if (videos.length === 0) {
      const msg = '🆓 Fʀᴇᴇ 1 Vɪᴅᴇᴏs\n\nNo free videos are available right now. Please check back later!';
      const markup = {
        inline_keyboard: [[{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
      };
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      return { text: msg, replyMarkup: markup };
    }

    const inlineButtons: Array<Array<{ text: string; callback_data: string }>> = videos.map((v) => [
      { text: `🎬 ${v.title || 'Free Video'}`, callback_data: `free_vid_${v.id}` }
    ]);
    inlineButtons.push([{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

    const msg = `🆓 Fʀᴇᴇ 1 Vɪᴅᴇᴏs\n\nSelect a free video below to watch:`;
    if (token) {
      await this.apiCall(token, 'sendMessage', {
        chat_id: chatId,
        text: msg,
        reply_markup: { inline_keyboard: inlineButtons }
      });
    }
    return { text: msg, replyMarkup: { inline_keyboard: inlineButtons } };
  }

  public async handleMyBalanceMenu(chatId: string, userId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const user = db.getRaw().users[userId] || { balance: 0, total_earned: 0, total_spent: 0, referral_count: 0 };
    const msg = `💰 Yᴏᴜʀ Bᴀʟᴀɴᴄᴇ\n\n⭐ Stars Balance: ${user.balance}\n\n📈 Total Earned: ${user.total_earned} Stars\n📉 Total Spent: ${user.total_spent} Stars\n👥 Referrals: ${user.referral_count}`;
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }, { text: '🔑 Rᴇᴅᴇᴇᴍ Cᴏᴅᴇ', callback_data: 'nav_redeem_prompt' }],
        [{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
      ]
    };
    if (token) {
      await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: inlineKeyboard });
    }
    return { text: msg, replyMarkup: inlineKeyboard };
  }

  public async handleBuyStarsMenu(chatId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const packages = db.getRaw().star_packages.filter((p) => p.is_active);
    const packageButtons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = packages.map((pkg) => [
      { text: `${pkg.name} — $${pkg.price_usd}`, url: pkg.payment_url }
    ]);
    packageButtons.push([{ text: '🔑 Rᴇᴅᴇᴇᴍ Cᴏᴅᴇ', callback_data: 'nav_redeem_prompt' }]);
    packageButtons.push([{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

    const msg = `⭐ Bᴜʏ Sᴛᴀʀs\n\nSelect a Stars pack to top up your account balance:\n\n*(Note: Stars are internal app credits used to unlock premium content.)*`;
    if (token) {
      await this.apiCall(token, 'sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: packageButtons }
      });
    }
    return { text: msg, replyMarkup: { inline_keyboard: packageButtons } };
  }

  public async handleChannelsMenu(chatId: string, userId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const channels = db.getRaw().channels.filter((c) => c.is_active).sort((a, b) => a.display_order - b.display_order);
    if (channels.length === 0) {
      const msg = '📺 Oғғɪᴄɪᴀʟ Cʜᴀɴɴᴇʟs\n\nNo official channels are currently available.';
      const markup = {
        inline_keyboard: [[{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
      };
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      return { text: msg, replyMarkup: markup };
    }

    const refreshedUser = db.getRaw().users[userId] || { unlocked_channels: [] };
    const unlockedSet = new Set(refreshedUser.unlocked_channels || []);

    const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = channels.map((c) => {
      const reqStars = typeof c.required_stars === 'number' ? c.required_stars : 0;
      if (reqStars <= 0) {
        return [{ text: `📢 ${c.name} (Fʀᴇᴇ)`, url: c.url }];
      } else if (unlockedSet.has(c.id)) {
        return [{ text: `🔓 ${c.name} (Uɴʟᴏᴄᴋᴇᴅ)`, url: c.url }];
      } else {
        return [{ text: `🔒 ${c.name} — ⭐ ${reqStars}`, callback_data: `chan_view_${c.id}` }];
      }
    });
    buttons.push([{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

    const msg = `📺 Oғғɪᴄɪᴀʟ Cʜᴀɴɴᴇʟs\n\nSelect a channel below to join or unlock with Stars:`;
    if (token) {
      await this.apiCall(token, 'sendMessage', {
        chat_id: chatId,
        text: msg,
        reply_markup: { inline_keyboard: buttons }
      });
    }
    return { text: msg, replyMarkup: { inline_keyboard: buttons } };
  }

  public async handleFilesMenu(chatId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const files = db.getRaw().files.filter((f) => f.is_active);
    if (files.length === 0) {
      const msg = '📁 Pʀᴇᴍɪᴜᴍ Fɪʟᴇs\n\nNo premium files are currently available in the catalog.';
      const markup = {
        inline_keyboard: [[{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
      };
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      return { text: msg, replyMarkup: markup };
    }

    const buttons: Array<Array<{ text: string; callback_data: string }>> = files.map((f) => [
      { text: `🎬 ${f.file_name} — ⭐ ${f.price_stars}`, callback_data: `file_detail_${f.id}` }
    ]);
    buttons.push([{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

    const msg = `📁 Pʀᴇᴍɪᴜᴍ Fɪʟᴇs\n\nSelect a file below to preview sample or purchase with Stars:`;
    if (token) {
      await this.apiCall(token, 'sendMessage', {
        chat_id: chatId,
        text: msg,
        reply_markup: { inline_keyboard: buttons }
      });
    }
    return { text: msg, replyMarkup: { inline_keyboard: buttons } };
  }

  public async handleStoreMenu(chatId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const storeUrl = db.getRaw().bot_settings.store_url || 'https://etebox.com/store';
    const msg = `🛒 Eɴᴛᴇʀ Sᴛᴏʀᴇ\n\nClick the button below to open the official store:`;
    const markup = {
      inline_keyboard: [
        [{ text: '🛒 Oᴘᴇɴ Sᴛᴏʀᴇ', url: storeUrl }],
        [{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
      ]
    };
    if (token) {
      await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
    }
    return { text: msg, replyMarkup: markup };
  }

  public async handleBackupBotMenu(chatId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const backupUrl = db.getRaw().bot_settings.backup_bot_url || 'https://t.me/EteboxBackupBot';
    const msg = `🔄 Bᴀᴄᴋᴜᴘ Bᴏᴛ\n\nIf the main bot is undergoing maintenance, you can use our official backup bot to access your points and purchases:`;
    const markup = {
      inline_keyboard: [
        [{ text: '🔄 Oᴘᴇɴ Bᴀᴄᴋᴜᴘ Bᴏᴛ', url: backupUrl }],
        [{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
      ]
    };
    if (token) {
      await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
    }
    return { text: msg, replyMarkup: markup };
  }

  public async handleReferEarnMenu(chatId: string, userId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const botUsername = db.getRaw().bot_settings.main_bot_username || 'YOUR_BOT';
    const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    const refreshed = db.getRaw().users[userId] || { referral_count: 0 };
    const msg = `👥 Rᴇғᴇʀ & Eᴀʀɴ\n\nShare your personal invite link with friends and earn Stars for free!\n\nYour Referral Link:\n${refLink}\n\nSuccessful Referrals: ${refreshed.referral_count}\nEarned Stars: ${refreshed.referral_count * 10} ⭐\n\n*(You receive +10 Stars for each friend who joins using your link!)*`;
    const markup = {
      inline_keyboard: [[{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
    };
    if (token) {
      await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
    }
    return { text: msg, replyMarkup: markup };
  }

  public async handleGamesMenu(chatId: string, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const msg = `🎮 Gᴀᴍᴇs & Aᴄᴛɪᴠɪᴛʏ\n\nPlay mini-games to test your luck and earn bonus Stars:`;
    const markup = {
      inline_keyboard: [
        [{ text: '🎲 Lᴜᴄᴋʏ Dɪᴄᴇ', callback_data: 'game_dice' }, { text: '📦 Mʏsᴛᴇʀʏ Bᴏx', callback_data: 'game_box' }],
        [{ text: '🎡 Lᴜᴄᴋʏ Wʜᴇᴇʟ', callback_data: 'game_wheel' }],
        [{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
      ]
    };
    if (token) {
      await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
    }
    return { text: msg, replyMarkup: markup };
  }

  // Handle Telegram Callback Queries
  public async handleCallbackQuery(cb: any, token: string): Promise<{ text: string; replyMarkup?: any }> {
    const data = cb.data || '';
    const userId = cb.from?.id?.toString();
    const chatId = cb.message?.chat?.id?.toString() || userId;
    const messageId = cb.message?.message_id;

    if (!userId) return { text: 'Invalid' };

    // Answer callback query to remove loading spinner in TG client
    if (token && cb.id) {
      try {
        await this.apiCall(token, 'answerCallbackQuery', { callback_query_id: cb.id });
      } catch {}
    }

    // 1. Human Verification Answer
    if (data.startsWith('verify_')) {
      const selected = parseInt(data.replace('verify_', ''), 10);
      const challenge = db.getRaw().human_verifications[userId];
      if (!challenge || challenge.status !== 'pending') {
        const msg = 'ℹ️ Verification is already completed or expired.';
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
        return { text: msg };
      }

      if (selected === challenge.correct_answer) {
        await db.atomic((d) => {
          if (d.users[userId]) {
            d.users[userId].verification_status = 'verified';
            d.users[userId].last_verification_at = new Date().toISOString();
            d.users[userId].failed_verification_attempts = 0;
          }
          if (d.human_verifications[userId]) {
            d.human_verifications[userId].status = 'passed';
          }
        });
        const msg = '✅ Verification Successful!\n\nYou may now continue using all bot features.';
        const keyboard = this.getMainMenuKeyboard();
        if (token) {
          await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: keyboard });
        }
        return { text: msg, replyMarkup: keyboard };
      } else {
        await db.atomic((d) => {
          if (d.users[userId]) {
            d.users[userId].failed_verification_attempts = (d.users[userId].failed_verification_attempts || 0) + 1;
          }
        });
        // Generate new question
        const newChallenge = await this.createVerificationChallenge(userId);
        const inlineKeyboard = {
          inline_keyboard: [
            newChallenge.options.map((opt) => ({
              text: opt.toString(),
              callback_data: `verify_${opt}`
            }))
          ]
        };
        const msg = `❌ Incorrect answer. Please try again:\n\n${newChallenge.question}`;
        if (token) {
          await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: inlineKeyboard });
        }
        return { text: msg, replyMarkup: inlineKeyboard };
      }
    }

    // 2. Navigation & Main Menu Callbacks
    if (data === 'nav_main_menu') {
      const welcome = `👋 Welcome to ETEBOX!\n\nYour Permanent ID: \`${userId}\`\n\nChoose an option from the menu below to browse exclusive videos, manage your Stars, and download files:`;
      const keyboard = this.getMainMenuKeyboard();
      if (token) {
        await this.apiCall(token, 'sendMessage', {
          chat_id: chatId,
          text: welcome,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
      return { text: welcome, replyMarkup: keyboard };
    }

    if (data === 'menu_buy_videos') {
      return await this.handleBuyVideosMenu(chatId, userId, token);
    }

    if (data.startsWith('vpkg_info_')) {
      const pkgId = data.replace('vpkg_info_', '');
      const pkg = (db.getRaw().video_packages || []).find((p) => p.id === pkgId && p.is_active);
      if (!pkg) {
        const msg = '❌ This video package is no longer available.';
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
        return { text: msg };
      }

      const refreshedUser = db.getRaw().users[userId] || { balance: 0 };
      const msg = `🎬 ${pkg.name}\n\n📹 Number of Videos: ${pkg.video_count}\n⭐ Price: ${pkg.stars_price} Stars\n💰 Your Balance: ${refreshedUser.balance} Stars\n\nInstant direct delivery of all ${pkg.video_count} videos upon purchase!`;
      const markup = {
        inline_keyboard: [
          [{ text: `⭐ Bᴜʏ Nᴏᴡ — ${pkg.stars_price} Stars`, callback_data: `vpkg_buy_${pkg.id}` }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Pᴀᴄᴋᴀɢᴇs', callback_data: 'menu_buy_videos' }, { text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      if (token) {
        await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      }
      return { text: msg, replyMarkup: markup };
    }

    if (data.startsWith('vpkg_buy_')) {
      const pkgId = data.replace('vpkg_buy_', '');
      const result = await this.executeVideoPackagePurchase(userId, pkgId);
      if (token) {
        const sent = await this.apiCall(token, 'sendMessage', {
          chat_id: chatId,
          text: result.message,
          reply_markup: result.markup
        });
        if (result.success && sent.ok && sent.result?.message_id) {
          await this.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
        }
      }
      return { text: result.message, replyMarkup: result.markup };
    }

    if (data === 'menu_free_videos') {
      return await this.handleFreeVideosMenu(chatId, token);
    }

    if (data === 'menu_my_balance') {
      return await this.handleMyBalanceMenu(chatId, userId, token);
    }

    if (data === 'menu_buy_stars' || data === 'nav_buy_stars') {
      return await this.handleBuyStarsMenu(chatId, token);
    }

    if (data === 'menu_channels') {
      return await this.handleChannelsMenu(chatId, userId, token);
    }

    if (data === 'menu_files') {
      return await this.handleFilesMenu(chatId, token);
    }

    if (data === 'menu_refer_earn') {
      return await this.handleReferEarnMenu(chatId, userId, token);
    }

    if (data === 'menu_games') {
      return await this.handleGamesMenu(chatId, token);
    }

    // 3. Free Video Delivery
    if (data.startsWith('free_vid_')) {
      const vidId = data.replace('free_vid_', '');
      const video = db.getRaw().free_videos.find((v) => v.id === vidId && v.is_active);
      if (!video) {
        const msg = '❌ This free video is no longer available.';
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
        return { text: msg };
      }

      let deliveryMsg = '';
      let replyMarkup: any = null;

      if (video.delivery_type === 'DIRECT_VIDEO') {
        const videoUrl = video.direct_video_url || '';
        const sizeInfo = video.file_size_mb ? ` (${video.file_size_mb} MB)` : '';
        deliveryMsg = `🎬 ${video.title}${sizeInfo}\n\n${video.description || 'Enjoy your exclusive free video!'}\n\n⚠️ Direct access expires & deletes in 10 minutes.`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '▶️ WATCH / DOWNLOAD DIRECT VIDEO', url: videoUrl.startsWith('http') ? videoUrl : `https://${db.getRaw().bot_settings.store_url || 'etebox.com'}${videoUrl}` }]
          ]
        };

        if (token) {
          // Attempt direct video send if absolute URL
          let sentOk = false;
          if (videoUrl.startsWith('http')) {
            try {
              const vidRes = await this.apiCall(token, 'sendVideo', {
                chat_id: chatId,
                video: videoUrl,
                caption: `🎬 ${video.title}\n\n⚠️ Auto-deleted in 10 minutes.`
              });
              if (vidRes.ok && vidRes.result?.message_id) {
                await this.scheduleMessageDeletion(chatId, vidRes.result.message_id, 10 * 60 * 1000);
                sentOk = true;
              }
            } catch (err) {
              console.warn('[TelegramBot] sendVideo direct fallback to text:', err);
            }
          }

          if (!sentOk) {
            const sent = await this.apiCall(token, 'sendMessage', {
              chat_id: chatId,
              text: deliveryMsg,
              reply_markup: replyMarkup
            });
            if (sent.ok && sent.result?.message_id) {
              await this.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
            }
          }
        }
        return { text: deliveryMsg, replyMarkup };
      } else if (video.delivery_type === 'EXTERNAL_CLOUD') {
        deliveryMsg = `🎬 ${video.title}\n\n☁️ Cloud Storage Download Link:\n${video.download_url}\n\n🔑 ACCESS CODE: ${video.download_code || 'None'}\n\n${video.description || ''}\n\n⚠️ Copy and save your code. This link & message will be deleted after 10 minutes.`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '☁️ DOWNLOAD FROM CLOUD', url: video.download_url || 'https://example.com' }]
          ]
        };
      } else {
        // TELEGRAM_CHANNEL
        deliveryMsg = `🎬 ${video.title}\n\n${video.description || ''}\n\n🔗 Watch on Telegram:\n${video.telegram_message_url}\n\n⚠️ This message will be deleted after 10 minutes.`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '▶️ VIEW ON TELEGRAM', url: video.telegram_message_url || 'https://t.me' }]
          ]
        };
      }

      if (token) {
        const sent = await this.apiCall(token, 'sendMessage', {
          chat_id: chatId,
          text: deliveryMsg,
          reply_markup: replyMarkup
        });
        if (sent.ok && sent.result?.message_id) {
          // Schedule 10 minute deletion
          await this.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
        }
      }
      return { text: deliveryMsg, replyMarkup };
    }

    // 3. File Detail
    if (data.startsWith('file_detail_')) {
      const fileId = data.replace('file_detail_', '');
      const file = db.getRaw().files.find((f) => f.id === fileId && f.is_active);
      if (!file) {
        const msg = '❌ File not found or deactivated.';
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
        return { text: msg };
      }

      const msg = `🎬 ${file.file_name}\n\n⭐ Price: ${file.price_stars} Stars`;
      const markup = {
        inline_keyboard: [
          [{ text: '📥 SAMPLE', url: file.sample_url }],
          [{ text: `⭐ BUY — ${file.price_stars} Stars`, callback_data: `buy_file_${file.id}` }]
        ]
      };

      if (token) {
        await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      }
      return { text: msg, replyMarkup: markup };
    }

    // 4. File Purchase (ATOMIC)
    if (data.startsWith('buy_file_')) {
      const fileId = data.replace('buy_file_', '');
      const purchaseResult = await this.executeFilePurchase(userId, fileId);

      if (token) {
        const sent = await this.apiCall(token, 'sendMessage', {
          chat_id: chatId,
          text: purchaseResult.message,
          reply_markup: purchaseResult.markup
        });
        if (purchaseResult.success && sent.ok && sent.result?.message_id) {
          // Schedule 10 minute deletion
          await this.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
        }
      }
      return { text: purchaseResult.message, replyMarkup: purchaseResult.markup };
    }

    // 5. Channel Details & Unlock
    if (data.startsWith('chan_view_')) {
      const chanId = data.replace('chan_view_', '');
      const channel = db.getRaw().channels.find((c) => c.id === chanId && c.is_active);
      if (!channel) {
        const msg = '❌ Channel not found or deactivated.';
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
        return { text: msg };
      }

      const refreshedUser = db.getRaw().users[userId];
      const isUnlocked = refreshedUser?.unlocked_channels?.includes(chanId);

      if (isUnlocked || (channel.required_stars || 0) <= 0) {
        const msg = `📢 ${channel.name}\n\n✅ You already have access to this channel! Click below to join:`;
        const markup = {
          inline_keyboard: [[{ text: '🔗 Join Channel Now', url: channel.url }]]
        };
        if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
        return { text: msg, replyMarkup: markup };
      }

      const msg = `🔒 ${channel.name}\n\n⭐ Required Stars to Enter: ${channel.required_stars} Stars\n💰 Your Balance: ${refreshedUser?.balance ?? 0} Stars\n\nTo enter this channel and receive the direct invite link, unlock it with Stars:`;
      const markup = {
        inline_keyboard: [
          [{ text: `🔓 Unlock Channel — ${channel.required_stars} Stars`, callback_data: `chan_unlock_${channel.id}` }],
          [{ text: '⭐ Buy Stars', callback_data: 'nav_buy_stars' }]
        ]
      };
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, reply_markup: markup });
      return { text: msg, replyMarkup: markup };
    }

    if (data.startsWith('chan_unlock_')) {
      const chanId = data.replace('chan_unlock_', '');
      const result = await this.executeChannelUnlock(userId, chanId);

      if (token) {
        await this.apiCall(token, 'sendMessage', {
          chat_id: chatId,
          text: result.message,
          reply_markup: result.markup
        });
      }
      return { text: result.message, replyMarkup: result.markup };
    }

    // 6. Games Handling
    if (data === 'game_dice') {
      const dice = Math.floor(Math.random() * 6) + 1;
      const record = await this.recordGame(userId, 'LUCKY_DICE', `Rolled a ${dice}`);
      const msg = `🎲 LUCKY DICE\n\nYou rolled: 🎲 [ ${dice} ]!\n\n${dice >= 5 ? '🎉 Lucky Roll! +1 Star achievement unlocked!' : 'Nice roll! Try again anytime!'}`;
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
      return { text: msg };
    }

    if (data === 'game_box') {
      const prizes = ['Special Badge', 'Bonus 1 Star', 'VIP Emoji', 'Lucky Charm'];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      await this.recordGame(userId, 'MYSTERY_BOX', `Opened: ${prize}`);
      const msg = `📦 MYSTERY BOX\n\nYou opened the mystery box and discovered:\n✨ ${prize}!`;
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
      return { text: msg };
    }

    if (data === 'game_wheel') {
      const outcomes = ['⭐ 1 Star Bonus', '🌟 Golden Spin', '🎯 Bullseye', '✨ Double Luck'];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      await this.recordGame(userId, 'LUCKY_WHEEL', `Spun: ${outcome}`);
      const msg = `🎡 LUCKY WHEEL\n\nThe wheel stopped at:\n🎪 [ ${outcome} ]!`;
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg });
      return { text: msg };
    }

    if (data === 'nav_buy_stars') {
      return await this.handleMessage({ chat: { id: chatId }, from: { id: userId }, text: '⭐ Buy Stars' }, token);
    }

    if (data === 'nav_redeem_prompt') {
      const msg = '🔑 Rᴇᴅᴇᴇᴍ Sᴛᴀʀs Cᴏᴅᴇ\n\nTo redeem a Stars code, send:\n`/redeem YOUR_CODE`';
      const markup = {
        inline_keyboard: [[{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
      };
      if (token) await this.apiCall(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: markup });
      return { text: msg, replyMarkup: markup };
    }

    return { text: 'Done' };
  }

  // Atomic file purchase execution
  public async executeFilePurchase(userId: string, fileId: string): Promise<{ success: boolean; message: string; markup?: any }> {
    return await db.atomic((data) => {
      const file = data.files.find((f) => f.id === fileId && f.is_active);
      if (!file) {
        return { success: false, message: '❌ File is no longer available.' };
      }

      const user = data.users[userId];
      if (!user) {
        return { success: false, message: '❌ User record not found.' };
      }

      const price = file.price_stars;
      if (user.balance < price) {
        return {
          success: false,
          message: `❌ Insufficient Stars.\n\nYou need: ${price} Stars\nYour balance: ${user.balance} Stars`
        };
      }

      // Atomic deduction
      const balanceBefore = user.balance;
      user.balance -= price;
      user.total_spent += price;

      // Create purchase record
      const purchaseId = crypto.randomUUID();
      data.file_purchases.push({
        id: purchaseId,
        user_id: userId,
        file_id: file.id,
        file_name: file.file_name,
        price_paid: price,
        file_code: file.file_code,
        zip_password: file.zip_password,
        purchased_at: new Date().toISOString()
      });

      // Create transaction record
      data.star_transactions.push({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -price,
        balance_before: balanceBefore,
        balance_after: user.balance,
        type: 'PURCHASE',
        description: `Purchased file: ${file.file_name}`,
        timestamp: new Date().toISOString()
      });

      const successMsg = `✅ Pᴜʀᴄʜᴀsᴇ Sᴜᴄᴄᴇssғᴜʟ!\n\n🎬 File: ${file.file_name}\n⭐ Paid: ${price} Stars\n💰 Remaining Balance: ${user.balance} Stars\n\n📥 DOWNLOAD: ${file.download_url}\n🔑 File Code: ${file.file_code}\n🔐 ZIP Password: ${file.zip_password || 'None'}\n\n⚠️ Important Notice:\nPlease copy and save your File Code.\nThis message will be deleted after 10 minutes.`;
      const markup = {
        inline_keyboard: [
          [{ text: '📥 Dᴏᴡɴʟᴏᴀᴅ Nᴏᴡ', url: file.download_url }],
          [{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };

      return { success: true, message: successMsg, markup };
    });
  }

  // Atomic Video Package purchase execution
  public async executeVideoPackagePurchase(userId: string, packageId: string): Promise<{ success: boolean; message: string; markup?: any }> {
    return await db.atomic((data) => {
      if (!Array.isArray(data.video_packages)) data.video_packages = [];
      if (!Array.isArray(data.video_package_purchases)) data.video_package_purchases = [];

      const pkg = data.video_packages.find((p) => p.id === packageId && p.is_active);
      if (!pkg) {
        return { success: false, message: '❌ This video package is no longer available.' };
      }

      const user = data.users[userId];
      if (!user) {
        return { success: false, message: '❌ User record not found.' };
      }

      const price = pkg.stars_price;
      if (user.balance < price) {
        return {
          success: false,
          message: `❌ Insufficient Stars.\n\nPackage Price: ${price} Stars\nYour Balance: ${user.balance} Stars\n\nYou need ${price - user.balance} more Stars to purchase this package.`,
          markup: {
            inline_keyboard: [
              [{ text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }],
              [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Pᴀᴄᴋᴀɢᴇs', callback_data: 'menu_buy_videos' }, { text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
            ]
          }
        };
      }

      // Atomic deduction
      const balanceBefore = user.balance;
      user.balance -= price;
      user.total_spent += price;

      // Create purchase record
      const purchaseId = crypto.randomUUID();
      data.video_package_purchases.push({
        id: purchaseId,
        user_id: userId,
        package_id: pkg.id,
        package_name: pkg.name,
        stars_paid: price,
        video_urls: [...pkg.video_urls],
        purchased_at: new Date().toISOString()
      });

      // Create transaction record
      data.star_transactions.push({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -price,
        balance_before: balanceBefore,
        balance_after: user.balance,
        type: 'PURCHASE',
        description: `Purchased Video Package: ${pkg.name}`,
        timestamp: new Date().toISOString()
      });

      const linksFormatted = pkg.video_urls.map((url, idx) => `📹 Video ${idx + 1}: ${url}`).join('\n\n');

      const successMsg = `✅ Pᴜʀᴄʜᴀsᴇ Sᴜᴄᴄᴇssғᴜʟ!\n\n🎬 ${pkg.name}\n⭐ Paid: ${price} Stars\n💰 Remaining Balance: ${user.balance} Stars\n\n📹 Your Unlocked Videos (${pkg.video_urls.length}):\n\n${linksFormatted}\n\n⚠️ Important Notice:\nPlease copy and save your links! For security and storage protection, this message will be automatically deleted after 10 minutes.`;

      // Build inline URL buttons for direct tapping
      const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [];
      const validUrls = pkg.video_urls.filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')));
      for (let i = 0; i < validUrls.length; i += 2) {
        const row: Array<{ text: string; url?: string; callback_data?: string }> = [
          { text: `▶️ Vɪᴅᴇᴏ ${i + 1}`, url: validUrls[i] }
        ];
        if (i + 1 < validUrls.length) {
          row.push({ text: `▶️ Vɪᴅᴇᴏ ${i + 2}`, url: validUrls[i + 1] });
        }
        buttons.push(row);
      }
      buttons.push([{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

      return { success: true, message: successMsg, markup: { inline_keyboard: buttons } };
    });
  }

  // Atomic channel unlock execution with Stars
  public async executeChannelUnlock(userId: string, channelId: string): Promise<{ success: boolean; message: string; markup?: any }> {
    return await db.atomic((data) => {
      const channel = data.channels.find((c) => c.id === channelId && c.is_active);
      if (!channel) {
        return { success: false, message: '❌ Channel not found or deactivated.' };
      }

      const user = data.users[userId];
      if (!user) {
        return { success: false, message: '❌ User record not found.' };
      }

      if (!user.unlocked_channels) {
        user.unlocked_channels = [];
      }

      if (user.unlocked_channels.includes(channel.id)) {
        return {
          success: true,
          message: `📢 ${channel.name}\n\n✅ You have already unlocked this channel! Click below to enter:`,
          markup: {
            inline_keyboard: [[{ text: '🔗 Join Channel Now', url: channel.url }]]
          }
        };
      }

      const price = channel.required_stars || 0;
      if (user.balance < price) {
        return {
          success: false,
          message: `❌ Insufficient Stars to enter this channel.\n\nYou need: ${price} Stars\nYour balance: ${user.balance} Stars`,
          markup: {
            inline_keyboard: [[{ text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }]]
          }
        };
      }

      // Atomic deduction
      const balanceBefore = user.balance;
      user.balance -= price;
      user.total_spent += price;
      user.unlocked_channels.push(channel.id);

      // Create transaction record
      data.star_transactions.push({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -price,
        balance_before: balanceBefore,
        balance_after: user.balance,
        type: 'CHANNEL_UNLOCK',
        description: `Unlocked Channel Access: ${channel.name}`,
        timestamp: new Date().toISOString()
      });

      const successMsg = `🎉 Cʜᴀɴɴᴇʟ Uɴʟᴏᴄᴋᴇᴅ Sᴜᴄᴄᴇssғᴜʟʟʏ!\n\n📢 ${channel.name}\n⭐ Paid: ${price} Stars\n💰 New Balance: ${user.balance} Stars\n\n👇 Click below to enter the channel:`;
      const markup = {
        inline_keyboard: [
          [{ text: '🔗 Jᴏɪɴ Cʜᴀɴɴᴇʟ Nᴏᴡ', url: channel.url }],
          [{ text: '🏠 Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };

      return { success: true, message: successMsg, markup };
    });
  }

  // Atomic Stars Code redemption
  public async redeemStarsCode(userId: string, rawCode: string): Promise<{ success: boolean; message: string }> {
    const code = rawCode.trim();
    return await db.atomic((data) => {
      const user = data.users[userId];
      if (!user) {
        return { success: false, message: '❌ User not found.' };
      }

      const starCode = data.star_codes[code];
      if (!starCode || !starCode.is_active) {
        return { success: false, message: '❌ Invalid code.' };
      }

      if (starCode.is_used) {
        return { success: false, message: '❌ This code has already been used.' };
      }

      // Lock and mark as used
      starCode.is_used = true;
      starCode.used_by_user_id = userId;
      starCode.used_by_username = user.username || user.first_name;
      starCode.used_at = new Date().toISOString();

      // Add stars
      const balanceBefore = user.balance;
      user.balance += starCode.stars_amount;
      user.total_earned += starCode.stars_amount;

      // Add transaction
      data.star_transactions.push({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: starCode.stars_amount,
        balance_before: balanceBefore,
        balance_after: user.balance,
        type: 'CODE_REDEEM',
        description: `Redeemed Code: ${code} (+${starCode.stars_amount} Stars)`,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `🎉 Code Redeemed Successfully!\n\n⭐ Added: +${starCode.stars_amount} Stars\n💰 New Balance: ${user.balance} Stars`
      };
    });
  }

  // Game logging & optional reward
  private async recordGame(userId: string, gameType: 'LUCKY_DICE' | 'MYSTERY_BOX' | 'LUCKY_WHEEL', result: string) {
    let reward = 0;
    if (result.includes('+1 Star') || result.includes('1 Star Bonus')) {
      reward = 1;
    }

    await db.atomic((data) => {
      data.game_records.push({
        id: crypto.randomUUID(),
        user_id: userId,
        game_type: gameType,
        result_details: result,
        reward_stars: reward,
        timestamp: new Date().toISOString()
      });

      if (reward > 0 && data.users[userId]) {
        const u = data.users[userId];
        const balBefore = u.balance;
        u.balance += reward;
        u.total_earned += reward;
        data.star_transactions.push({
          id: crypto.randomUUID(),
          user_id: userId,
          amount: reward,
          balance_before: balBefore,
          balance_after: u.balance,
          type: 'GAME_REWARD',
          description: `Game reward from ${gameType}`,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Broadcast processor (batched, non-blocking queue)
  public async executeBroadcast(broadcastId: string) {
    const raw = db.getRaw();
    const broadcast = raw.broadcasts.find((b) => b.id === broadcastId);
    if (!broadcast || !raw.bot_settings.main_bot_token) return;

    const token = raw.bot_settings.main_bot_token;
    const users = Object.values(raw.users).filter((u) => !u.is_banned);

    await db.atomic((d) => {
      const b = d.broadcasts.find((x) => x.id === broadcastId);
      if (b) {
        b.status = 'running';
        b.total_users = users.length;
      }
    });

    let sent = 0;
    let failed = 0;
    let blocked = 0;

    for (const u of users) {
      try {
        const payload: any = {
          chat_id: u.id,
          text: broadcast.text
        };
        if (broadcast.button_text && broadcast.button_url) {
          payload.reply_markup = {
            inline_keyboard: [[{ text: broadcast.button_text, url: broadcast.button_url }]]
          };
        }

        const res = await this.apiCall(token, 'sendMessage', payload);
        if (res.ok) {
          sent++;
        } else {
          if (res.error_code === 403) {
            blocked++;
          } else {
            failed++;
          }
        }
      } catch {
        failed++;
      }

      // Small delay between sends to respect Telegram rate limits
      await new Promise((r) => setTimeout(r, 60));
    }

    await db.atomic((d) => {
      const b = d.broadcasts.find((x) => x.id === broadcastId);
      if (b) {
        b.status = 'completed';
        b.sent_count = sent;
        b.failed_count = failed;
        b.blocked_count = blocked;
      }
    });
  }

  // New Free Content Notification
  public async notifyNewFreeContent(video: FreeVideo) {
    const raw = db.getRaw();
    if (!raw.bot_settings.main_bot_token || !raw.bot_settings.auto_notify_free_content) return;

    const token = raw.bot_settings.main_bot_token;
    const users = Object.values(raw.users).filter((u) => !u.is_banned);

    const text = `🆕 Nᴇᴡ Fʀᴇᴇ Vɪᴅᴇᴏ Aᴠᴀɪʟᴀʙʟᴇ!\n\n🎬 ${video.title}\n🎁 A new free video has been released.\n\n👇 Watch now:`;
    const markup = {
      inline_keyboard: [[{ text: '🆓 Gᴇᴛ Fʀᴇᴇ Vɪᴅᴇᴏ', callback_data: `free_vid_${video.id}` }]]
    };

    // Run asynchronously in background batch
    (async () => {
      for (const u of users) {
        try {
          await this.apiCall(token, 'sendMessage', {
            chat_id: u.id,
            text,
            reply_markup: markup
          });
        } catch {}
        await new Promise((r) => setTimeout(r, 60));
      }
    })();
  }
}

export const telegramBot = new TelegramBotService();
