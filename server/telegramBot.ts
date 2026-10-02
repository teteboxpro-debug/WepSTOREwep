import { db, User, VideoPackage, PaidFile, FreeVideo } from './db';

interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

class TelegramBotService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private deletionInterval: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;
  private botInfo: any = null;
  private isProcessing = false;

  constructor() {
    this.startDeletionWorker();
  }

  private get botToken(): string {
    return db.getRaw().bot_settings?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  public get isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.length > 15);
  }

  public async getBotStatus(): Promise<{
    configured: boolean;
    online: boolean;
    botInfo?: any;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return { configured: false, online: false, error: 'No Telegram bot token configured' };
    }

    try {
      const res = await this.callApi('getMe');
      if (res.ok) {
        this.botInfo = res.result;
        return { configured: true, online: true, botInfo: res.result };
      }
      return { configured: true, online: false, error: res.description || 'Invalid Bot Token' };
    } catch (err: any) {
      return { configured: true, online: false, error: err.message };
    }
  }

  public async callApi(method: string, payload: any = {}): Promise<any> {
    const token = this.botToken;
    if (!token) throw new Error('Telegram bot token not provided');

    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await res.json();
  }

  /**
   * Main Menu Inline Keyboard with decorative Unicode styling
   */
  public getMainMenuKeyboard(): TelegramInlineKeyboardMarkup {
    const raw = db.getRaw();
    const storeUrl = raw.bot_settings?.store_url || 'https://etebox.com/store';
    const backupUrl = raw.bot_settings?.backup_bot_url || 'https://t.me/EteboxBackupBot';

    return {
      inline_keyboard: [
        // Row 1: BUY VIDEOS
        [{ text: '🎬 Bᴜʏ Vɪᴅᴇᴏs', callback_data: 'menu_buy_videos' }],

        // Row 2: Free Videos & Balance
        [
          { text: '🆓 Fʀᴇᴇ Vɪᴅᴇᴏs', callback_data: 'menu_free_videos' },
          { text: '💰 Mʏ Bᴀʟᴀɴᴄᴇ', callback_data: 'menu_my_balance' }
        ],

        // Row 3: Buy Stars & Channels
        [
          { text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' },
          { text: '📺 Cʜᴀɴɴᴇʟs', callback_data: 'menu_channels' }
        ],

        // Row 4: Files & Enter Store
        [
          { text: '📁 Fɪʟᴇs', callback_data: 'menu_files' },
          { text: '🏪 Eɴᴛᴇʀ Sᴛᴏʀᴇ', url: storeUrl }
        ],

        // Row 5: Backup Bot & Referral
        [
          { text: '🤖 Bᴀᴄᴋᴜᴘ Bᴏᴛ', url: backupUrl },
          { text: '👥 Rᴇғᴇʀʀᴀʟ', callback_data: 'menu_refer_earn' }
        ],

        // Row 6: Mini Games
        [{ text: '🎮 Gᴀᴍᴇs', callback_data: 'menu_games' }]
      ]
    };
  }

  /**
   * Processes incoming Telegram update (webhook or emulator)
   */
  public async handleUpdate(update: any): Promise<{ handled: boolean; replyText?: string }> {
    try {
      if (update.message) {
        return await this.handleMessage(update.message);
      }
      if (update.callback_query) {
        return await this.handleCallbackQuery(update.callback_query);
      }
    } catch (err: any) {
      console.error('[Bot] Error handling update:', err.message);
    }
    return { handled: false };
  }

  /**
   * Handle incoming user message
   */
  public async handleMessage(message: any): Promise<{ handled: boolean; replyText?: string }> {
    const from = message.from;
    const chatId = message.chat?.id || from?.id;
    const text = (message.text || '').trim();

    if (!from || !chatId) return { handled: false };

    // Register / update persistent user
    let referrerId: number | undefined;
    if (text.startsWith('/start ')) {
      const param = text.split(' ')[1];
      const parsedRef = parseInt(param, 10);
      if (!isNaN(parsedRef)) referrerId = parsedRef;
    }

    const user = await db.getOrCreateUser(from.id, from.username, from.first_name, referrerId);

    // Command: /start
    if (text.startsWith('/start')) {
      const welcome =
        `✨ *Wᴇʟᴄᴏᴍᴇ ᴛᴏ ETEBOX Vᴀᴜʟᴛ* ✨\n\n` +
        `👤 *Aᴄᴄᴏᴜɴᴛ:* \`${user.telegram_user_id}\`\n` +
        `⭐ *Sᴛᴀʀs Bᴀʟᴀɴᴄᴇ:* \`${user.balance}\` ⭐\n\n` +
        `Access exclusive video packages, cloud vaults, premium downloads, and hourly star rewards directly below.`;

      await this.sendMessage(chatId, welcome, this.getMainMenuKeyboard());
      return { handled: true, replyText: welcome };
    }

    // Command: /balance
    if (text === '/balance') {
      const balMsg =
        `💰 *Yᴏᴜʀ Wᴀʟʟᴇᴛ Bᴀʟᴀɴᴄᴇ*\n\n` +
        `⭐ *Cᴜʀʀᴇɴᴛ Sᴛᴀʀs:* \`${user.balance}\` ⭐\n` +
        `📈 *Tᴏᴛᴀʟ Eᴀʀɴᴇᴅ:* \`${user.total_earned}\` ⭐\n` +
        `🛍️ *Tᴏᴛᴀʟ Sᴘᴇɴᴛ:* \`${user.total_spent}\` ⭐\n` +
        `👥 *Rᴇғᴇʀʀᴀʟs:* \`${user.referral_count}\` users\n\n` +
        `_Stars can be used to unlock video packages and premium archive files._`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🎁 Cʟᴀɪᴍ Aᴜᴛᴏ-Rᴇᴡᴀʀᴅ (+3 ⭐)', callback_data: 'claim_auto_reward' }],
          [{ text: '⭐ Bᴜʏ Mᴏʀᴇ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      await this.sendMessage(chatId, balMsg, kb);
      return { handled: true, replyText: balMsg };
    }

    // Command: /redeem <code>
    if (text.startsWith('/redeem')) {
      const code = text.replace('/redeem', '').trim();
      if (!code) {
        const msg = `⚠️ *Pʟᴇᴀsᴇ sᴘᴇᴄɪғʏ ᴀ ᴄᴏᴅᴇ:* \`/redeem YOUR_CODE\``;
        await this.sendMessage(chatId, msg);
        return { handled: true, replyText: msg };
      }

      const res = await db.redeemStarCode(from.id, code);
      if (!res.success) {
        const msg = `❌ *Rᴇᴅᴇᴇᴍ Fᴀɪʟᴇᴅ:* ${res.error}`;
        await this.sendMessage(chatId, msg);
        return { handled: true, replyText: msg };
      }

      const successMsg =
        `🎉 *Cᴏᴅᴇ Rᴇᴅᴇᴇᴍᴇᴅ Sᴜᴄᴄᴇssғᴜʟʟʏ!*\n\n` +
        `Added: *+${res.starsAdded} Stars* ⭐\n` +
        `New Balance: *${res.newBalance} Stars* ⭐`;
      await this.sendMessage(chatId, successMsg, this.getMainMenuKeyboard());
      return { handled: true, replyText: successMsg };
    }

    // Default reply: Show Main Menu
    const defaultMsg = `💡 Use the interactive menu below to browse packages, download files, or check your stars balance:`;
    await this.sendMessage(chatId, defaultMsg, this.getMainMenuKeyboard());
    return { handled: true, replyText: defaultMsg };
  }

  /**
   * Handle Inline Keyboard Callback Queries
   */
  public async handleCallbackQuery(query: any): Promise<{ handled: boolean; replyText?: string }> {
    const data = query.data || '';
    const from = query.from;
    const message = query.message;
    const chatId = message?.chat?.id || from?.id;
    const queryId = query.id;

    if (!from || !chatId) return { handled: false };

    const user = await db.getOrCreateUser(from.id, from.username, from.first_name);

    // Answer callback query to acknowledge
    await this.answerCallback(queryId);

    // 1. Navigation: Main Menu
    if (data === 'nav_main_menu') {
      const welcome =
        `✨ *Wᴇʟᴄᴏᴍᴇ ᴛᴏ ETEBOX Vᴀᴜʟᴛ* ✨\n\n` +
        `👤 *Aᴄᴄᴏᴜɴᴛ:* \`${user.telegram_user_id}\`\n` +
        `⭐ *Sᴛᴀʀs Bᴀʟᴀɴᴄᴇ:* \`${user.balance}\` ⭐\n\n` +
        `Select an option below:`;
      await this.editOrSendMessage(chatId, message?.message_id, welcome, this.getMainMenuKeyboard());
      return { handled: true, replyText: welcome };
    }

    // 2. Menu: BUY VIDEOS
    if (data === 'menu_buy_videos') {
      const activePkgs = db.getRaw().video_packages.filter(p => p.active);

      if (activePkgs.length === 0) {
        const emptyMsg = `🎬 *Nᴏ Vɪᴅᴇᴏ Pᴀᴄᴋᴀɢᴇs Aᴠᴀɪʟᴀʙʟᴇ*\n\nPlease check back later for new releases!`;
        const kb: TelegramInlineKeyboardMarkup = {
          inline_keyboard: [[{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
        };
        await this.editOrSendMessage(chatId, message?.message_id, emptyMsg, kb);
        return { handled: true, replyText: emptyMsg };
      }

      const rows: TelegramInlineKeyboardButton[][] = activePkgs.map(p => [
        {
          text: `🎬 ${p.package_name} (${p.number_of_videos} Videos) — ${p.stars_price} ⭐`,
          callback_data: `vpkg_info_${p.id}`
        }
      ]);

      rows.push([{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

      const msg =
        `🎬 *Bᴜʏ Vɪᴅᴇᴏ Pᴀᴄᴋᴀɢᴇs*\n\n` +
        `⭐ *Yᴏᴜʀ Bᴀʟᴀɴᴄᴇ:* \`${user.balance}\` Stars\n\n` +
        `Select a video package to view details and unlock instant cloud streaming links:`;

      await this.editOrSendMessage(chatId, message?.message_id, msg, { inline_keyboard: rows });
      return { handled: true, replyText: msg };
    }

    // 3. Video Package Details: vpkg_info_{id}
    if (data.startsWith('vpkg_info_')) {
      const pkgId = data.replace('vpkg_info_', '');
      const pkg = db.getRaw().video_packages.find(p => p.id === pkgId);

      if (!pkg) {
        await this.sendMessage(chatId, '❌ Package not found.');
        return { handled: true };
      }

      const canAfford = user.balance >= pkg.stars_price;
      const detailMsg =
        `🎬 *Vɪᴅᴇᴏ Pᴀᴄᴋᴀɢᴇ Dᴇᴛᴀɪʟs*\n\n` +
        `📦 *Pᴀᴄᴋᴀɢᴇ:* ${pkg.package_name}\n` +
        `🎞️ *Nᴜᴍʙᴇʀ ᴏғ Vɪᴅᴇᴏs:* ${pkg.number_of_videos} Videos\n` +
        `💰 *Pʀɪᴄᴇ:* ${pkg.stars_price} Stars ⭐\n` +
        `💳 *Yᴏᴜʀ Bᴀʟᴀɴᴄᴇ:* ${user.balance} Stars ⭐\n\n` +
        (canAfford
          ? `✅ You have sufficient balance. Click *Bᴜʏ Nᴏᴡ* to unlock immediately!`
          : `⚠️ You need *${pkg.stars_price - user.balance} more Stars* to buy this package.`);

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: `⭐ Bᴜʏ Nᴏᴡ (${pkg.stars_price} Stars)`, callback_data: `vpkg_buy_${pkg.id}` }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Pᴀᴄᴋᴀɢᴇs', callback_data: 'menu_buy_videos' }]
        ]
      };

      await this.editOrSendMessage(chatId, message?.message_id, detailMsg, kb);
      return { handled: true, replyText: detailMsg };
    }

    // 4. Video Package Purchase: vpkg_buy_{id}
    if (data.startsWith('vpkg_buy_')) {
      const pkgId = data.replace('vpkg_buy_', '');
      const purchaseRes = await db.executeVideoPackagePurchase(from.id, pkgId);

      if (!purchaseRes.success) {
        const errorText = `❌ *Pᴜʀᴄʜᴀsᴇ Fᴀɪʟᴇᴅ:*\n${purchaseRes.error}\n\nNeed more stars? You can claim auto-rewards or buy star packages.`;
        const kb: TelegramInlineKeyboardMarkup = {
          inline_keyboard: [
            [{ text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }],
            [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Pᴀᴄᴋᴀɢᴇs', callback_data: 'menu_buy_videos' }]
          ]
        };
        await this.editOrSendMessage(chatId, message?.message_id, errorText, kb);
        return { handled: true, replyText: errorText };
      }

      // Success: send purchased links with 10-minute auto-deletion
      const links = purchaseRes.links || [];
      const linksFormatted = links.map((url, i) => `${i + 1}. [Video ${i + 1}](${url})`).join('\n');

      const successMsg =
        `🎉 *Pᴜʀᴄʜᴀsᴇ Sᴜᴄᴄᴇssғᴜʟ!*\n\n` +
        `📦 *Pᴀᴄᴋᴀɢᴇ:* ${purchaseRes.purchase?.package_name}\n` +
        `⭐ *Dᴇᴅᴜᴄᴛᴇᴅ:* ${purchaseRes.purchase?.price_paid} Stars\n` +
        `💳 *Rᴇᴍᴀɪɴɪɴɢ Bᴀʟᴀɴᴄᴇ:* ${purchaseRes.remainingBalance} Stars\n\n` +
        `🔗 *Yᴏᴜʀ Vɪᴅᴇᴏ Lɪɴᴋs:*\n${linksFormatted}\n\n` +
        `⏳ _Notice: This message and access links will automatically self-destruct in 10 minutes for security._`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🎬 Bᴜʏ Aɴᴏᴛʜᴇʀ Pᴀᴄᴋᴀɢᴇ', callback_data: 'menu_buy_videos' }],
          [{ text: '⬅️ Mᴀɪɴ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };

      const sent = await this.sendMessage(chatId, successMsg, kb);
      if (sent?.result?.message_id) {
        await db.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
      }

      return { handled: true, replyText: successMsg };
    }

    // 5. Menu: Free Videos
    if (data === 'menu_free_videos') {
      const freeVideos = db.getRaw().free_videos.filter(v => v.is_active);

      if (freeVideos.length === 0) {
        const noFree = `🆓 *Nᴏ Fʀᴇᴇ Vɪᴅᴇᴏs Aᴠᴀɪʟᴀʙʟᴇ Cᴜʀʀᴇɴᴛʟʏ*\n\nPlease check back soon!`;
        await this.editOrSendMessage(chatId, message?.message_id, noFree, {
          inline_keyboard: [[{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]]
        });
        return { handled: true, replyText: noFree };
      }

      const rows: TelegramInlineKeyboardButton[][] = freeVideos.map(v => [
        {
          text: `▶️ ${v.title} (${v.file_size_mb || 25} MB)`,
          callback_data: `fv_view_${v.id}`
        }
      ]);
      rows.push([{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

      const msg = `🆓 *Fʀᴇᴇ Vɪᴅᴇᴏ Cᴀᴛᴀʟᴏɢ*\n\nSelect a free showcase video to stream or download:`;
      await this.editOrSendMessage(chatId, message?.message_id, msg, { inline_keyboard: rows });
      return { handled: true, replyText: msg };
    }

    // Free video view
    if (data.startsWith('fv_view_')) {
      const fvId = data.replace('fv_view_', '');
      const video = db.getRaw().free_videos.find(v => v.id === fvId);

      if (!video) {
        await this.sendMessage(chatId, '❌ Video not found.');
        return { handled: true };
      }

      const videoLink = video.direct_video_url || video.download_url || video.telegram_message_url || '#';
      const msg =
        `🎬 *${video.title}*\n\n` +
        `${video.description || 'Exclusive showcase video.'}\n\n` +
        `📦 *Size:* ${video.file_size_mb || 'N/A'} MB\n` +
        `🔗 [Click here to Stream / Download](${videoLink})\n\n` +
        `⏳ _This message will automatically delete in 10 minutes._`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '📥 Wᴀᴛᴄʜ / Dᴏᴡɴʟᴏᴀᴅ', url: videoLink }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Fʀᴇᴇ Vɪᴅᴇᴏs', callback_data: 'menu_free_videos' }]
        ]
      };

      const sent = await this.sendMessage(chatId, msg, kb);
      if (sent?.result?.message_id) {
        await db.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
      }
      return { handled: true, replyText: msg };
    }

    // 6. Menu: My Balance & Auto-Reward
    if (data === 'menu_my_balance') {
      const balMsg =
        `💰 *Yᴏᴜʀ Wᴀʟʟᴇᴛ Bᴀʟᴀɴᴄᴇ*\n\n` +
        `⭐ *Cᴜʀʀᴇɴᴛ Sᴛᴀʀs:* \`${user.balance}\` ⭐\n` +
        `📈 *Tᴏᴛᴀʟ Eᴀʀɴᴇᴅ:* \`${user.total_earned}\` ⭐\n` +
        `🛍️ *Tᴏᴛᴀʟ Sᴘᴇɴᴛ:* \`${user.total_spent}\` ⭐\n` +
        `👥 *Rᴇғᴇʀʀᴀʟs:* \`${user.referral_count}\` users\n\n` +
        `_Auto-Reward grants +3 Stars every 8 hours automatically._`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🎁 Cʟᴀɪᴍ Aᴜᴛᴏ-Rᴇᴡᴀʀᴅ (+3 ⭐)', callback_data: 'claim_auto_reward' }],
          [{ text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      await this.editOrSendMessage(chatId, message?.message_id, balMsg, kb);
      return { handled: true, replyText: balMsg };
    }

    // Auto-Reward Claim
    if (data === 'claim_auto_reward') {
      const claimRes = await db.claimAutoReward(from.id);
      if (!claimRes.success) {
        const cooldownMsg = `⏳ *Aᴜᴛᴏ-Rᴇᴡᴀʀᴅ Cᴏᴏʟᴅᴏᴡɴ:*\n\n${claimRes.error}\n\nPlease come back later!`;
        const kb: TelegramInlineKeyboardMarkup = {
          inline_keyboard: [[{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Bᴀʟᴀɴᴄᴇ', callback_data: 'menu_my_balance' }]]
        };
        await this.editOrSendMessage(chatId, message?.message_id, cooldownMsg, kb);
        return { handled: true, replyText: cooldownMsg };
      }

      const rewardMsg =
        `🎁 *Rᴇᴡᴀʀᴅ Cʟᴀɪᴍᴇᴅ!*\n\n` +
        `Received: *+${claimRes.rewardStars} Stars* ⭐\n` +
        `New Balance: *${claimRes.newBalance} Stars* ⭐\n\n` +
        `_You can claim another reward in 8 hours!_`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🎬 Bᴜʏ Vɪᴅᴇᴏs', callback_data: 'menu_buy_videos' }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      await this.editOrSendMessage(chatId, message?.message_id, rewardMsg, kb);
      return { handled: true, replyText: rewardMsg };
    }

    // 7. Menu: Buy Stars
    if (data === 'menu_buy_stars') {
      const pkgs = db.getRaw().star_packages.filter(p => p.is_active);
      const rows: TelegramInlineKeyboardButton[][] = pkgs.map(p => [
        {
          text: `⭐ ${p.name} (${p.stars_amount} Stars) — $${p.price_usd}`,
          url: p.payment_url || 'https://t.me/Abood'
        }
      ]);
      rows.push([{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

      const msg =
        `⭐ *Bᴜʏ Sᴛᴀʀs Pᴀᴄᴋᴀɢᴇs*\n\n` +
        `Stars allow you to purchase high-res video packages and secret archive files.\n` +
        `Select a package below for instant top-up:`;

      await this.editOrSendMessage(chatId, message?.message_id, msg, { inline_keyboard: rows });
      return { handled: true, replyText: msg };
    }

    // 8. Menu: Channels
    if (data === 'menu_channels') {
      const channels = db.getRaw().channels.filter(c => c.is_active);
      const rows: TelegramInlineKeyboardButton[][] = channels.map(c => [
        {
          text: `📺 ${c.name} ${c.required_stars > 0 ? `(${c.required_stars} ⭐)` : '(Free)'}`,
          url: c.url
        }
      ]);
      rows.push([{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

      const msg = `📺 *Oғғɪᴄɪᴀʟ & VIP Cʜᴀɴɴᴇʟs*\n\nJoin our official broadcast channels for direct video updates and perks:`;
      await this.editOrSendMessage(chatId, message?.message_id, msg, { inline_keyboard: rows });
      return { handled: true, replyText: msg };
    }

    // 9. Menu: Files
    if (data === 'menu_files') {
      const files = db.getRaw().files.filter(f => f.is_active);
      const rows: TelegramInlineKeyboardButton[][] = files.map(f => [
        {
          text: `📁 ${f.file_name} — ${f.price_stars} ⭐`,
          callback_data: `file_buy_${f.id}`
        }
      ]);
      rows.push([{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]);

      const msg =
        `📁 *Pʀᴇᴍɪᴜᴍ Aʀᴄʜɪᴠᴇ Fɪʟᴇs*\n\n` +
        `⭐ *Yᴏᴜʀ Bᴀʟᴀɴᴄᴇ:* \`${user.balance}\` Stars\n\n` +
        `Select an archive file to purchase and receive instant download links & password:`;

      await this.editOrSendMessage(chatId, message?.message_id, msg, { inline_keyboard: rows });
      return { handled: true, replyText: msg };
    }

    // File Buy
    if (data.startsWith('file_buy_')) {
      const fileId = data.replace('file_buy_', '');
      const buyRes = await db.executeFilePurchase(from.id, fileId);

      if (!buyRes.success) {
        const errorText = `❌ *Pᴜʀᴄʜᴀsᴇ Fᴀɪʟᴇᴅ:*\n${buyRes.error}`;
        await this.editOrSendMessage(chatId, message?.message_id, errorText, {
          inline_keyboard: [[{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Fɪʟᴇs', callback_data: 'menu_files' }]]
        });
        return { handled: true, replyText: errorText };
      }

      const file = buyRes.file!;
      const msg =
        `🎉 *Fɪʟᴇ Pᴜʀᴄʜᴀsᴇ Sᴜᴄᴄᴇssғᴜʟ!*\n\n` +
        `📁 *File:* ${file.file_name}\n` +
        `⭐ *Stars Paid:* ${file.price_stars}\n` +
        `💳 *Remaining Balance:* ${buyRes.remainingBalance} Stars\n\n` +
        `🔑 *Unlock Code:* \`${file.file_code}\`\n` +
        (file.zip_password ? `🔐 *ZIP Password:* \`${file.zip_password}\`\n` : '') +
        `🔗 [Click here to Download](${file.download_url})\n\n` +
        `⏳ _This message will self-destruct in 10 minutes._`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '📥 Dᴏᴡɴʟᴏᴀᴅ Fɪʟᴇ', url: file.download_url }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Fɪʟᴇs', callback_data: 'menu_files' }]
        ]
      };

      const sent = await this.sendMessage(chatId, msg, kb);
      if (sent?.result?.message_id) {
        await db.scheduleMessageDeletion(chatId, sent.result.message_id, 10 * 60 * 1000);
      }
      return { handled: true, replyText: msg };
    }

    // 10. Menu: Referral
    if (data === 'menu_refer_earn') {
      const botUsername = this.botInfo?.username || 'EteboxBot';
      const refLink = `https://t.me/${botUsername}?start=${user.telegram_user_id}`;
      const msg =
        `👥 *Rᴇғᴇʀʀᴀʟ & Eᴀʀɴ Pʀᴏɢʀᴀᴍ*\n\n` +
        `Invite friends to ETEBOX and earn *+5 Stars ⭐* for each verified referral!\n\n` +
        `📊 *Yᴏᴜʀ Sᴛᴀᴛs:*\n` +
        `• Friends Invited: *${user.referral_count}*\n` +
        `• Total Earned from Referrals: *${user.referral_count * 5} Stars*\n\n` +
        `🔗 *Yᴏᴜʀ Pᴇʀsᴏɴᴀʟ Rᴇғᴇʀʀᴀʟ Lɪɴᴋ:*\n\`${refLink}\``;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '📤 Sʜᴀʀᴇ Lɪɴᴋ', url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join ETEBOX Vault and get 10 Free Stars!')}` }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      await this.editOrSendMessage(chatId, message?.message_id, msg, kb);
      return { handled: true, replyText: msg };
    }

    // 11. Menu: Games
    if (data === 'menu_games') {
      const msg =
        `🎮 *Sᴛᴀʀs Mɪɴɪ Gᴀᴍᴇs*\n\n` +
        `Test your luck and double your Stars! Bet 5 Stars to roll the Lucky Dice.\n\n` +
        `⭐ *Yᴏᴜʀ Bᴀʟᴀɴᴄᴇ:* \`${user.balance}\` Stars`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🎲 Rᴏʟʟ Lᴜᴄᴋʏ Dɪᴄᴇ (Bᴇᴛ 5 ⭐)', callback_data: 'play_dice' }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      await this.editOrSendMessage(chatId, message?.message_id, msg, kb);
      return { handled: true, replyText: msg };
    }

    // Play Dice
    if (data === 'play_dice') {
      if (user.balance < 5) {
        await this.sendMessage(chatId, `⚠️ Insufficient balance! You need at least 5 Stars to play.`);
        return { handled: true };
      }

      const roll = Math.floor(Math.random() * 6) + 1;
      const won = roll >= 4;
      const reward = won ? 10 : 0;

      await db.atomic(data => {
        const u = data.users.find(x => x.telegram_user_id === from.id || x.id === String(from.id));
        if (u) {
          const old = u.balance;
          if (won) {
            u.balance += 5; // bet 5, won 10 -> net +5
            u.total_earned += 5;
          } else {
            u.balance -= 5;
            u.total_spent += 5;
          }
          data.star_transactions.unshift({
            id: `game_${Date.now()}`,
            user_id: String(from.id),
            amount: won ? 5 : -5,
            balance_before: old,
            balance_after: u.balance,
            type: 'game',
            description: won ? `🎲 Won Dice Roll (${roll}) +5 Stars` : `🎲 Lost Dice Roll (${roll}) -5 Stars`,
            timestamp: new Date().toISOString()
          });
        }
      });

      const updatedUser = db.getRaw().users.find(u => u.telegram_user_id === from.id);
      const resMsg = won
        ? `🎲 *Yᴏᴜ Rᴏʟʟᴇᴅ ᴀ ${roll}!* 🎉\n\n*Yᴏᴜ Wᴏɴ +10 Sᴛᴀʀs!*\nNew Balance: *${updatedUser?.balance} Stars* ⭐`
        : `🎲 *Yᴏᴜ Rᴏʟʟᴇᴅ ᴀ ${roll}* 😢\n\nBetter luck next time!\nNew Balance: *${updatedUser?.balance} Stars* ⭐`;

      const kb: TelegramInlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🎲 Pʟᴀʏ Aɢᴀɪɴ (5 ⭐)', callback_data: 'play_dice' }],
          [{ text: '⬅️ Bᴀᴄᴋ ᴛᴏ Mᴇɴᴜ', callback_data: 'nav_main_menu' }]
        ]
      };
      await this.editOrSendMessage(chatId, message?.message_id, resMsg, kb);
      return { handled: true, replyText: resMsg };
    }

    return { handled: false };
  }

  public async sendMessage(chatId: number, text: string, replyMarkup?: TelegramInlineKeyboardMarkup): Promise<any> {
    if (!this.isConfigured) return null;
    try {
      return await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    } catch (err: any) {
      console.warn('[Bot] sendMessage notice:', err.message);
      return null;
    }
  }

  public async editOrSendMessage(
    chatId: number,
    messageId: number | undefined,
    text: string,
    replyMarkup?: TelegramInlineKeyboardMarkup
  ): Promise<any> {
    if (!this.isConfigured) return null;
    if (messageId) {
      try {
        const res = await this.callApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });
        if (res.ok) return res;
      } catch {
        // fallback to sendMessage
      }
    }
    return await this.sendMessage(chatId, text, replyMarkup);
  }

  public async answerCallback(queryId: string, text?: string): Promise<any> {
    if (!this.isConfigured) return null;
    try {
      return await this.callApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text
      });
    } catch {
      return null;
    }
  }

  /**
   * Deletion worker: deletes scheduled messages older than delete_at (10-minute timer)
   */
  private startDeletionWorker(): void {
    if (this.deletionInterval) clearInterval(this.deletionInterval);

    this.deletionInterval = setInterval(async () => {
      const now = new Date().toISOString();
      const raw = db.getRaw();
      const expired = raw.scheduled_deletions.filter(s => s.delete_at <= now);

      if (expired.length === 0) return;

      for (const item of expired) {
        if (this.isConfigured) {
          try {
            await this.callApi('deleteMessage', {
              chat_id: item.chat_id,
              message_id: item.message_id
            });
          } catch {
            // ignore if already deleted
          }
        }
      }

      await db.atomic(data => {
        data.scheduled_deletions = data.scheduled_deletions.filter(s => s.delete_at > now);
      });
    }, 15000);
  }
}

export const telegramBot = new TelegramBotService();
