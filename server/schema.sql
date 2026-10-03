-- =============================================================================
-- ETEBOX TELEGRAM BOT & STORE - SUPABASE POSTGRESQL SCHEMA
-- Project ID: vwgsxbraktgmlibmgils
-- Single Source of Truth for Persistent Bot Data
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Telegram User ID is the stable external identity.
CREATE TABLE IF NOT EXISTS users (
    telegram_user_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reward_at TIMESTAMPTZ,
    verification_status TEXT NOT NULL DEFAULT 'verified',
    failed_verification_attempts INTEGER NOT NULL DEFAULT 0,
    referral_count INTEGER NOT NULL DEFAULT 0,
    referred_by BIGINT,
    ban_status BOOLEAN NOT NULL DEFAULT FALSE,
    banned_reason TEXT,
    unlocked_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe additive columns if table already existed
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- 2. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '["all"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default admin if not exists
INSERT INTO admins (username, password_hash, permissions, status)
VALUES ('Abood', '321325', '["all"]'::jsonb, 'active')
ON CONFLICT (username) DO NOTHING;

-- 3. BOT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS bot_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    bot_token TEXT,
    store_url TEXT NOT NULL DEFAULT 'https://etebox.com/store',
    backup_bot_url TEXT NOT NULL DEFAULT 'https://t.me/EteboxBackupBot',
    auto_notify_free_content BOOLEAN NOT NULL DEFAULT TRUE,
    reward_stars INTEGER NOT NULL DEFAULT 3,
    reward_hours INTEGER NOT NULL DEFAULT 8,
    webhook_url TEXT,
    webhook_secret TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bot_settings (id, store_url, backup_bot_url, auto_notify_free_content, reward_stars, reward_hours)
VALUES ('current', 'https://etebox.com/store', 'https://t.me/EteboxBackupBot', TRUE, 3, 8)
ON CONFLICT (id) DO NOTHING;

-- 4. STAR TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS star_transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id BIGINT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_star_tx_user ON star_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_star_tx_created ON star_transactions(created_at DESC);

-- 5. STAR PACKAGES TABLE
CREATE TABLE IF NOT EXISTS star_packages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    stars_amount INTEGER NOT NULL CHECK (stars_amount > 0),
    price_usd NUMERIC(10, 2) NOT NULL CHECK (price_usd >= 0),
    payment_url TEXT,
    payment_info TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. STAR CODES TABLE (Redeemable Codes)
CREATE TABLE IF NOT EXISTS star_codes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code TEXT UNIQUE NOT NULL,
    stars_amount INTEGER NOT NULL CHECK (stars_amount > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_by_user_id BIGINT REFERENCES users(telegram_user_id),
    used_by_username TEXT,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_star_codes_code ON star_codes(code);

-- 7. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    referrer_user_id BIGINT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    referred_user_id BIGINT UNIQUE NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    reward_amount INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- 8. FREE VIDEOS TABLE
CREATE TABLE IF NOT EXISTS free_videos (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    delivery_type TEXT NOT NULL DEFAULT 'DIRECT_VIDEO',
    direct_video_url TEXT,
    file_size_mb NUMERIC(10, 2),
    telegram_message_url TEXT,
    download_url TEXT,
    download_code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. FILES TABLE (Paid Files)
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    file_name TEXT NOT NULL,
    sample_url TEXT,
    download_url TEXT NOT NULL,
    file_code TEXT NOT NULL,
    zip_password TEXT,
    price_stars INTEGER NOT NULL CHECK (price_stars >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. FILE PURCHASES TABLE
CREATE TABLE IF NOT EXISTS file_purchases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id BIGINT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    price_paid INTEGER NOT NULL CHECK (price_paid >= 0),
    file_code TEXT NOT NULL,
    zip_password TEXT,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_purchases_user ON file_purchases(user_id);

-- 11. CHANNELS TABLE
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    required_stars INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. CHANNEL UNLOCKS TABLE
CREATE TABLE IF NOT EXISTS channel_unlocks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id BIGINT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- 13. VIDEO PACKAGES TABLE (Buy Videos)
CREATE TABLE IF NOT EXISTS video_packages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    package_name TEXT NOT NULL,
    number_of_videos INTEGER NOT NULL CHECK (number_of_videos > 0),
    stars_price INTEGER NOT NULL CHECK (stars_price >= 0),
    video_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. VIDEO PACKAGE PURCHASES TABLE
CREATE TABLE IF NOT EXISTS video_package_purchases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id BIGINT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES video_packages(id) ON DELETE CASCADE,
    package_name TEXT NOT NULL,
    price_paid INTEGER NOT NULL CHECK (price_paid >= 0),
    video_count INTEGER NOT NULL,
    video_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_purchases_user ON video_package_purchases(user_id);

-- 15. HUMAN VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS human_verifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    telegram_user_id BIGINT NOT NULL,
    expected_answer TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. GAME RECORDS TABLE
CREATE TABLE IF NOT EXISTS game_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id BIGINT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    stars_bet INTEGER NOT NULL DEFAULT 0,
    stars_won INTEGER NOT NULL DEFAULT 0,
    result TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. BROADCASTS TABLE
CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    text TEXT NOT NULL,
    image_url TEXT,
    button_text TEXT,
    button_url TEXT,
    total_users INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    blocked_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. SCHEDULED DELETIONS TABLE (10-minute message auto-deletion)
CREATE TABLE IF NOT EXISTS scheduled_deletions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    chat_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    delete_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_del_time ON scheduled_deletions(delete_at);

-- 19. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ATOMIC STORED PROCEDURES (RPCs) FOR HIGH CONCURRENCY SAFETY
-- =============================================================================

-- Atomic Video Package Purchase
CREATE OR REPLACE FUNCTION purchase_video_package(
    p_user_id BIGINT,
    p_package_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_pkg RECORD;
    v_user RECORD;
    v_new_balance INTEGER;
    v_purchase_id TEXT;
BEGIN
    -- 1. Lock and fetch package
    SELECT * INTO v_pkg FROM video_packages WHERE id = p_package_id AND active = TRUE FOR SHARE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Package not found or inactive');
    END IF;

    -- 2. Lock and fetch user balance
    SELECT * INTO v_user FROM users WHERE telegram_user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_user.ban_status = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is banned');
    END IF;

    -- 3. Check balance
    IF v_user.balance < v_pkg.stars_price THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient Stars',
            'required', v_pkg.stars_price,
            'current', v_user.balance
        );
    END IF;

    -- 4. Deduct balance
    v_new_balance := v_user.balance - v_pkg.stars_price;
    UPDATE users
    SET balance = v_new_balance,
        total_spent = total_spent + v_pkg.stars_price,
        last_activity = NOW()
    WHERE telegram_user_id = p_user_id;

    -- 5. Record purchase
    v_purchase_id := uuid_generate_v4()::text;
    INSERT INTO video_package_purchases (
        id, user_id, package_id, package_name, price_paid, video_count, video_urls, purchased_at
    ) VALUES (
        v_purchase_id, p_user_id, p_package_id, v_pkg.package_name, v_pkg.stars_price, v_pkg.number_of_videos, v_pkg.video_urls, NOW()
    );

    -- 6. Record transaction
    INSERT INTO star_transactions (
        user_id, amount, balance_before, balance_after, transaction_type, description, reference_id
    ) VALUES (
        p_user_id, -v_pkg.stars_price, v_user.balance, v_new_balance, 'video_purchase',
        'Purchased video package: ' || v_pkg.package_name, v_purchase_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'package_name', v_pkg.package_name,
        'video_count', v_pkg.number_of_videos,
        'video_urls', v_pkg.video_urls,
        'stars_paid', v_pkg.stars_price,
        'remaining_balance', v_new_balance
    );
END;
$$;

-- Atomic Auto-Reward Claim (+3 Stars every 8 hours)
CREATE OR REPLACE FUNCTION claim_auto_reward(
    p_user_id BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_user RECORD;
    v_settings RECORD;
    v_reward_hours INTEGER;
    v_reward_stars INTEGER;
    v_hours_passed DOUBLE PRECISION;
    v_new_balance INTEGER;
BEGIN
    SELECT * INTO v_settings FROM bot_settings WHERE id = 'current';
    v_reward_hours := COALESCE(v_settings.reward_hours, 8);
    v_reward_stars := COALESCE(v_settings.reward_stars, 3);

    SELECT * INTO v_user FROM users WHERE telegram_user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_user.last_reward_at IS NOT NULL THEN
        v_hours_passed := EXTRACT(EPOCH FROM (NOW() - v_user.last_reward_at)) / 3600.0;
        IF v_hours_passed < v_reward_hours THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Reward on cooldown',
                'hours_remaining', ROUND((v_reward_hours - v_hours_passed)::numeric, 1)
            );
        END IF;
    END IF;

    v_new_balance := v_user.balance + v_reward_stars;
    UPDATE users
    SET balance = v_new_balance,
        total_earned = total_earned + v_reward_stars,
        last_reward_at = NOW(),
        last_activity = NOW()
    WHERE telegram_user_id = p_user_id;

    INSERT INTO star_transactions (
        user_id, amount, balance_before, balance_after, transaction_type, description
    ) VALUES (
        p_user_id, v_reward_stars, v_user.balance, v_new_balance, 'reward',
        'Claimed auto-reward +' || v_reward_stars || ' Stars'
    );

    RETURN jsonb_build_object(
        'success', true,
        'reward_stars', v_reward_stars,
        'new_balance', v_new_balance
    );
END;
$$;
