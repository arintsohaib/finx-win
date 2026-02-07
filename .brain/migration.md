# Server Migration & Database Merge: Post-Mortem & Guide

## Overview
This document outlines the successful migration workflow for `web3coin.trade` / `net3coin.one`, specifically focusing on merging a legacy database from a Dockerized environment into a new standard environment.

## Critical Issues & Resolutions

### 1. The "Auth Mismatch" (Login Failure)
**Issue**: After restoring the database, neither Admins nor Users could log in.
**Cause**: The application code (from Server A) had different `NEXTAUTH_SECRET` and `JWT_SECRET` values than what the database (from Server B) was encrypted/hashed with.
**Resolution**:
- **Always** sync `.env` secrets from the **Database Source** server, not the Code Source server.
- **Command**:
  ```bash
  # On Source DB Server
  grep -E 'NEXTAUTH_SECRET|JWT_SECRET|ADMIN_JWT_SECRET' .env
  # Update New Server .env with these values
  ```

### 2. Database Restore Conflicts ("Relation Exists")
**Issue**: `pg_restore` failed or merged messily because the target database wasn't empty.
**Cause**: `DROP DATABASE` command failed silently because the App (PM2) was still connected to it.
**Resolution**:
- **Force Kill**: Stop the app AND terminate all postgres backend connections before dropping.
  ```sql
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'net3coin_db' AND pid <> pg_backend_pid();
  DROP DATABASE net3coin_db;
  ```

### 3. Docker Data Extraction
**Issue**: Source database was inside a Docker container, requiring a specific dump command without volume mounting.
**Resolution**:
- **Command**:
  ```bash
  docker exec <container_name> pg_dump -U <user> -d <db> -F c > /path/to/dump
  ```

### 4. Schema Drift (Hidden Missing Columns)
**Issue**: After restore, login failed with `P2022: Column users.is_suspended does not exist`.
**Cause**: The legacy database *thought* it was up-to-date (migration history table existed), but actual columns were missing because the old code didn't use them.
**Resolution**:
- **Generate Repair Script**:
  ```bash
  cd /var/www/web3coin
  npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel prisma/schema.prisma \
    --script > /tmp/fix_schema.sql
  ```
- **Apply Repair**:
  ```bash
  sudo -u postgres psql -d net3coin_db -f /tmp/fix_schema.sql
  ```

---

## ⚡️ Final Cutover Runbook (Fast Track)

**Execute these exact steps for the final migration:**

1.  **Preparation (New Server)**:
    - Stop App: `pm2 stop web3coin`
    - Kill Connections: `sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'net3coin_db' AND pid <> pg_backend_pid();"`

2.  **Ingest (Source Server)**:
    - Dump DB: `docker exec web3coin_postgres pg_dump -U web3coin_user -d web3coin_db -F c > /root/final.dump`
    - **VERIFY SECRETS**: Ensure you have the `NEXTAUTH_SECRET` from source `.env`.

3.  **Restore (New Server)**:
    - Transfer: `scp ... /root/final.dump ...`
    - Flush: `DROP DATABASE net3coin_db; CREATE DATABASE net3coin_db ...;`
    - Restore: `sudo -u postgres pg_restore -d net3coin_db ... /root/final.dump`

4.  **Fix & Upgrade (New Server)**:
    - **Sync Secrets**: Update `.env` with source auth secrets.
    - **Heal Schema**: Run `npx prisma migrate diff ... --script > fix.sql` then apply `psql ... -f fix.sql`.
    - **Restart**: `pm2 restart web3coin`.
