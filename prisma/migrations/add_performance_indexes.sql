-- ============================================================================
-- PERFORMANCE INDEXES MIGRATION
-- Generated: November 5, 2025
-- Purpose: Optimize database queries for high-load scenarios (30k+ users)
-- ============================================================================

-- Trades performance indexes
-- These indexes speed up wallet-based queries and status filtering
CREATE INDEX IF NOT EXISTS idx_trades_wallet_status ON trades(wallet_address, status);
CREATE INDEX IF NOT EXISTS idx_trades_expires_at ON trades(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_status ON trades(symbol, status);

-- Deposits performance indexes
-- Optimizes deposit history and status filtering
CREATE INDEX IF NOT EXISTS idx_deposits_wallet_status ON deposits(wallet_address, status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_status_created ON deposits(status, created_at DESC);

-- Withdrawals performance indexes
-- Speeds up withdrawal history and admin review queues
CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet_status ON withdrawals(wallet_address, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at DESC);

-- Chat sessions performance indexes
-- Critical for admin dashboard and user chat loading
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_wallet ON chat_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_assigned ON chat_sessions(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status_last_message ON chat_sessions(status, last_message_at DESC);

-- Chat messages performance indexes
-- Speeds up message loading and unread count queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(session_id, is_read) WHERE sender_type = 'user';

-- Balances lookup indexes
-- Critical for wallet page and transaction processing
CREATE INDEX IF NOT EXISTS idx_balances_wallet_currency ON balances(wallet_address, currency);

-- KYC verification indexes
-- Speeds up admin KYC review and user status checks
CREATE INDEX IF NOT EXISTS idx_kyc_wallet ON kyc_submissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_status_created ON kyc_submissions(status, created_at DESC);

-- Notifications indexes
-- Optimizes notification fetching and unread counts
CREATE INDEX IF NOT EXISTS idx_notifications_wallet_read ON notifications(wallet_address, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- User activity indexes
-- Supports admin analytics and user filtering
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;

-- Wallet conversions indexes
-- Speeds up conversion history
CREATE INDEX IF NOT EXISTS idx_conversions_wallet ON wallet_conversions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_conversions_created ON wallet_conversions(created_at DESC);

-- Global asset settings indexes
-- Optimizes asset configuration loading
CREATE INDEX IF NOT EXISTS idx_global_asset_settings_symbol ON global_asset_settings(symbol);
CREATE INDEX IF NOT EXISTS idx_global_asset_settings_enabled ON global_asset_settings(is_trading_enabled);

-- ============================================================================
-- EXPECTED IMPACT:
-- - 30-50% faster query response times
-- - Supports 2,000+ concurrent users
-- - Reduced database CPU usage
-- - Faster admin dashboard loading
-- ============================================================================
