# Investigative Report: Post-Migration Issues & Resolutions

**Date:** January 18, 2026
**System:** Web3Coin Trading Platform (`net3coin.com` constellation)
**Server:** Hetzner VPS (`78.47.43.8`)

This document details the critical technical issues encountered after the migration from the old server (`49.13...`) to the new production environment, including the root cause analysis and definitive resolutions.

---

## 1. 🔴 Critical: Admin Panel "No Users Found" (Schema Drift)

**Symptom:**
After restoring the database, the Admin Panel showed 0 users, despite `SELECT COUNT(*) FROM users` returning 145 records. PM2 logs revealed `PrismaClientKnownRequestError: P2022: The column users.is_suspended does not exist`.

**Investigation:**
-   We compared the running application code (Prisma Client) with the restored database schema.
-   **Finding:** The application code expected a newer schema version (containing `is_suspended` and `suspension_reason`) than what was present in the source database dump. The source database was "behind" the application code version.

**Resolution:**
-   Generated a SQL migration script using `npx prisma migrate diff`.
-   Applied schema patches:
    ```sql
    ALTER TABLE "users" ADD COLUMN "is_suspended" BOOLEAN DEFAULT false;
    ALTER TABLE "users" ADD COLUMN "suspension_reason" TEXT;
    -- + Added missing indexes and dropped obsolete 'trading_configs' table
    ```
-   **Result:** Admin Panel immediately populated with all 145 users.

---

## 2. 🟠 High: SMTP Email Failure

**Symptom:**
The system failed to send emails (OTP, Welcome emails). Logs showed connection timeouts/failures.

**Investigation:**
-   Checked `.env` on the new server. `SMTP_USER` and `SMTP_PASS` were missing.
-   Checked the old server; these values were defined in the *system environment* (PM2) but not the `.env` file, meaning they were lost during file transfer.

**Resolution:**
-   Acquired correct ProtonMail credentials (`support@net3coin.com`) from the user.
-   Updated `.env` and restarted the application.
-   **Verification:** Sent a test email to a properly configured external address successfully.

---

## 3. 🔴 Critical: Image Uploads "Not Authenticated"

**Symptom:**
Admins trying to upload images (e.g., in Admin Chat) received a `401 Not Authenticated` error, even though they were logged in.

**Investigation:**
-   Analyzed `app/api/upload/route.ts`.
-   **Root Cause:** The authentication logic **only** checked for `auth-token` (User Token). It did NOT check for `admin_token` (Admin Token).
-   Admins use a completely different JWT mechanism (`admin_token` cookie) than regular users. The code was hardcoded to only accept User Tokens.

**Resolution:**
-   Patched `app/api/upload/route.ts` and `app/api/chat/upload/route.ts`.
-   Added logic to check for `admin_token` if `auth-token` is missing.
-   Implemented dynamic import of admin verification logic to handle the different JWT secrets.
-   **Result:** Both Users (Deposit Proofs) and Admins (Chat Attachments) can now upload files.

---

## 4. 🔴 Critical: Broken Images (404) & Caching

**Symptom:**
After a successful upload, the image would appear as "broken" in the chat or admin panel. `curl` returned `404 Not Found`.

**Investigation:**
-   **Root Cause:** Next.js (in Production Mode) caches the filesystem state at startup. It does not natively serve files added to `public/` *at runtime* unless a rebuild happens or a specific configuration is used.
-   Additionally, Browser and Cloudflare caching were masking the new files.

**Resolution:**
-   **Nginx Bypass:** Configured Nginx to serve the `/uploads/` directory **directly**, bypassing the Next.js Node.js server entirely.
    ```nginx
    location /uploads/ {
        alias /var/www/web3coin/public/uploads/;
        autoindex off;
        expires -1; # Disable caching
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    ```
-   **Cache Disabling:** Added strict `no-store` headers to force browsers to fetch the latest file versions constantly.
-   **Result:** Images load instantly after upload without requiring a server restart.

---

## 5. 🟡 High: Multi-Domain Consistency

**Symptom:**
The user required the site to work identically across 4 domains (`.com`, `.net`, `.org`, `.one`). Initial setup had some redirect loops or certificate warnings.

**Investigation:**
-   Typical Nginx setups redirect all aliases to a "Primary" domain.
-   **Requirement:** User wanted "Mirror Mode" (the site stays on `.net` if you visit `.net`).

**Resolution:**
-   Deployed a "Mirror Mode" Nginx configuration using a Unified SSL Certificate (SANs) covering all 4 domains.
-   Configured Cross-Origin Resource Sharing (CORS) handling in the verification tests to ensure API calls (Uploads) work regardless of the `Host` header.
-   **Result:** Users can login, trade, and chat seamlessly on any of the 4 domains.

---

## Summary of Stability
The system is now **stable**. The root causes for all reported issues were configuration drifts (Database/Env) or logic gaps (Auth/Caching) that have been permanently fixed in the code and server configuration.
