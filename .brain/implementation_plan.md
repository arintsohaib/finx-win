# Implementation Plan - Update Trade Limit Defaults

## Goal Description
Change the trade limit logic as per user request:
- Every user (existing and new) should have a default limit of **50 trades**.
- Remove the special case of `-1` for 'Unlimited'.
- Admins can still manually set the limit to `0` to block trading or any other value (e.g., `100`, `1000`) to increase the limit.

## Proposed Changes

### Database
#### [MODIFY] [schema.prisma](file:///Users/arint/Documents/AGentWork/web3coin.trade/prisma/schema.prisma)
- Change `tradeLimit` default from `-1` to `50`.
```prisma
tradeLimit Int @default(50) @map("trade_limit")
```

### Backend APIs
#### [MODIFY] [app/api/trades/route.ts](file:///Users/arint/Documents/AGentWork/web3coin.trade/app/api/trades/route.ts)
- Remove the check for `user.tradeLimit !== -1`.
- Simplified check: `if (user._count.trades >= user.tradeLimit)`.

#### [MODIFY] [app/api/admin/users/[uid]/trade-status/route.ts](file:///Users/arint/Documents/AGentWork/web3coin.trade/app/api/admin/users/[uid]/trade-status/route.ts)
- No significant changes needed as it already accepts numeric `tradeLimit`, but I'll ensure no `-1` logic exists.

### Admin Frontend
#### [MODIFY] [components/admin/users-tab.tsx](file:///Users/arint/Documents/AGentWork/web3coin.trade/components/admin/users-tab.tsx)
- Remove text explaining `-1 = unlimited`.
- Update helper messages to reflect the new 50 default and remove 'Unlimited' status.

### Data Migration (Remote)
- Run a manual update on the production server to change all users with `tradeLimit = -1` to `tradeLimit = 50`.

## Verification Plan
### Automated Tests
- Check Prism schema sync.

### Manual Verification
1. **New Users**: Verify newly registered users have `limit = 50`.
2. **Admin Edit**: Set a user limit to `5`. Place 5 trades. Verify 6th is blocked.
3. **Block Test**: Set limit to `0`. Verify user is blocked immediately.
4. **Large Limit**: Set limit to `1000`. Verify user can trade up to that amount.
