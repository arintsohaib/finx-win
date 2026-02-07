# Task Checklist

## Phase 1: Security Hardening & Cleanup [COMPLETED]
- [x] **Secure/Hide Administrative Routes**
    - [x] Verify current `admin` route vulnerability on new server.
    - [x] Rename/Obscure `admin` routes (e.g., to `/console-hidden-xyz`).
    - [x] Implement IP whitelisting or additional application-level auth for admin routes.
- [x] **System Cleanup**
    - [x] Remove unused/suspicious Docker containers (`agitated_blackburn`, `confident_hertz`, etc.) on the old server (if we still have access/need).
    - [x] Verify no unauthorized background processes are running.
- [x] **SMTP Configuration**
    - [x] Locate SMTP credentials in code/env.
    - [x] Test SMTP connectivity.
    - [x] Configure for reliable delivery (if needed).

## Phase 2: Database & Data [COMPLETED]
- [x] **Analyze Current Data State**
    - [x] Check data integrity on `web3coin` database.
    - [x] Check `web3coin_new` for divergent data.
- [x] **Consolidate Data**
    - [x] Merge any missing records from `web3coin_new` to `web3coin`.
    - [x] Ensure `web3coin` is the single source of truth.

## Phase 3: Final Migration & Domain Setup [ACTIVE]
- [x] **Server Environment Setup**
    - [x] Ensure Node, PM2, Nginx are correctly configured on new server.
    - [x] Verify environment variables (`.env`).
- [x] **Deploy Application**
    - [x] Pull latest code from repo/local to new server.
    - [x] Install dependencies (`npm install`).
    - [x] Build and Start (`npm run build`, `pm2 start`).
- [x] **Domain Configuration (Multi-domain)**
    - [x] Configure Nginx for `net3coin.com` (Primary).
    - [x] Configure Nginx mirrors: `net3coin.net`, `net3coin.org`, `net3coin.one`.
    - [x] **Fix Uploads & Images:** Ensure `/uploads` are served correctly and uncached across all domains.
- [x] **Add New Domain: `web3coins.life`**
    - [x] Verify DNS propagation for `web3coins.life` (A and AAAA).
    - [x] Update Nginx config to include `web3coins.life` and `www.web3coins.life`.
    - [x] Request SSL Certificate (Let's Encrypt) for new domain.
    - [x] Verify HTTPS access.
- [/] **DNS Switch (Final)**
    - [ ] Update A records for all domains to point to new server IP `78.47.43.8` (User action).
    - [ ] Verify propagation.

## Phase 4: Feature Enhancements (KYC) [COMPLETED]
- [x] **Data Model Updates**
    - [x] Add `phone` and `documentUrl` to `KYCSubmission` in Prisma schema.
    - [x] Apply schema changes (`prisma db push` or similar).
- [x] **Frontend Updates (Initial)**
    - [x] Add `Phone` input field (Mandatory).
    - [x] Add `Document Upload` field (Optional).
    - [x] Implement "Upload Later" functionality for documents.
- [x] **Backend Updates**
    - [x] Update `/api/kyc/submit` to handle new fields.
    - [x] Ensure validation logic respects optional document but mandatory phone.

## Phase 4.1: KYC Refinements (Current Issues) [ACTIVE]
- [x] **Admin UI Fixes**
    - [x] Display `Phone` field in Admin KYC tab.
    - [x] Display `Document` image/link in Admin KYC tab.
- [x] **User UI Refinements**
    - [x] Disable "Submit" button when status is `pending`.
    - [x] Show "Under Review" state to prevent duplicate clicks.
    - [x] Allow document upload via separate action if missing.
- [x] **Admin UI Enhancements (Lightbox)**
    - [x] Implement `ImageLightbox` in KYC tab.
    - [x] Use thumbnail styling matching Deposits tab.
- [x] **User UI & Logic Refinements (Enterprise Grade)**
    - [x] Fix broken image preview and implement Thumbnail + Lightbox.
    - [x] Strictly lock all inputs and buttons when status is `pending` or `approved`.
    - [x] Ensure "Submit" button disables immediately upon click.
    - [x] Fix "broken image" pathing (URL prefixing).

## Phase 4.2: Trade Limit Control (Remaining Trades Model) [COMPLETED]
- [x] **Data Model & Backups**
    - [x] Add `tradeLimit` (Int, default 50) to `User` model.
    - [x] Create full remote backups (DB + Files) before logic change.
- [x] **Backend: Countdown Logic**
    - [x] Implement relative countdown in `POST /api/trades`.
    - [x] Auto-decrement `tradeLimit` on every successful trade.
    - [x] Use generic error "Failed to place trade" for user privacy.
- [x] **Admin: Control UI**
    - [x] Update Admin UI with "Trades Remaining" label.
    - [x] Show clear status: "X trades left" or "Trading blocked".
    - [x] Enable instant updates via numeric input.

## Phase 5: Verification & Handover [DONE]
- [x] **Full Functional Testing**
    - [x] Verify `tradeLimit: 0` blocks trades (Verified via code and log check).
    - [x] Verify `tradeLimit: N` allows N trades (Verified via code logic).
    - [x] Verify `tradeLimit: -1` allows unlimited trades (Verified via code logic).
- [x] **Final Check**
    - [x] Deploy to production environment.
    - [x] Fix database port discrepancy on remote server.
    - [x] Verify Admin UI allows updating limits.
    - [x] Monitor PM2 logs for stable application start.
- [x] **Handover**
    - [x] Create final walkthrough for User.

## Phase 6: Web3 Wallet Connection Debugging [DONE]
- [x] **Preparation**
    - [x] Create full backups of DB and Files (Manual rsync + pg_dump)
- [x] **Analysis & Fix**
    - [x] Identify Middleware redirect (Auto-connect blocker)
    - [x] Upgrade provider detection logic (Polling + Multi-provider support)
    - [x] Implement Auto-Redirect Return for improved UX
- [x] **Verification**
    - [x] Unified build and deployment
    - [x] Verification of logic for mirror domain registration
