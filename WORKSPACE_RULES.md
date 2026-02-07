# FinX.win Workspace Rules (Memory)

This document contains critical project rules and server details to ensure consistent development and deployment. **Always follow these rules.**

## 1. Development Workflow
- **Local First**: Always implement and verify code changes locally within this workspace before deploying.
- **Verification**: Use terminal commands or logs to verify logic.
- **API Changes**: When modifying APIs, ensure you check for breaking changes in the frontend.

## 2. Server Information
- **Server IP**: `91.99.186.43`
- **SSH User**: `root`
- **SSH Port**: `22`
- **Application Path**: `/data/projects/finx.win/`
- **Application Port**: `3001` (Mapped to internal container port 3000)

## 3. Remote Setup (Docker)
- The application runs inside Docker Compose.
- **Containers**:
  - `finx-app`: Next.js application.
  - `finx-postgres`: Database.
- **Deployment Script**: Always use `./scripts/deploy_finx.sh` to update the server.
- **Database**: 
  - Uses Prisma.
  - In case of fresh setup or schema inconsistency, use `npx prisma db push` followed by `npx prisma db seed`.

## 4. Co-existence Rules
- **Grayhawks.com**: This server hosts another PM2-managed app called `grayhawks` in `/var/www/grayhawks`. 
- **CRITICAL**: Never modify files outside of `/data/projects/finx.win/` or run global commands that might impact PM2 or other directories.

## 5. Persistence
- Database data is stored on the host at `/data/projects/finx.win/db_data`.
- Keep the `.env` file consistent with the server's production secrets.
