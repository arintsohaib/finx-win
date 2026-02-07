export const PERMISSIONS = {
    MANAGE_USERS: 'MANAGE_USERS',
    MANAGE_DEPOSITS: 'MANAGE_DEPOSITS',
    MANAGE_WITHDRAWALS: 'MANAGE_WITHDRAWALS',
    MANAGE_TRADES: 'MANAGE_TRADES',
    MANAGE_WALLET_SETTINGS: 'MANAGE_WALLET_SETTINGS',
    MANAGE_ADMINS: 'MANAGE_ADMINS',
    MANAGE_TRADE_SETTINGS: 'MANAGE_TRADE_SETTINGS',
    MANAGE_CHAT: 'MANAGE_CHAT',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    EMPLOYEE: 'EMPLOYEE',
} as const;

export type AdminRole = typeof ROLES[keyof typeof ROLES];

// Default permissions for super admin (all permissions)
export const SUPER_ADMIN_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// Default permissions for regular admin (all except wallet settings and manage admins)
export const DEFAULT_ADMIN_PERMISSIONS: Permission[] = [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_DEPOSITS,
    PERMISSIONS.MANAGE_WITHDRAWALS,
    PERMISSIONS.MANAGE_TRADES,
    PERMISSIONS.MANAGE_TRADE_SETTINGS,
    PERMISSIONS.MANAGE_CHAT,
];

// Default permissions for employee (limited to assigned users only)
export const DEFAULT_EMPLOYEE_PERMISSIONS: Permission[] = [
    PERMISSIONS.MANAGE_USERS, // View assigned users' details
    PERMISSIONS.MANAGE_DEPOSITS, // Handle deposits for assigned users
    PERMISSIONS.MANAGE_WITHDRAWALS, // Handle withdrawals for assigned users
    PERMISSIONS.MANAGE_CHAT, // Chat with assigned users
];

// Permission labels for UI
export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
    [PERMISSIONS.MANAGE_USERS]: {
        label: 'Users',
        description: 'View and edit user details, balances, and trade settings',
    },
    [PERMISSIONS.MANAGE_DEPOSITS]: {
        label: 'WalletQ - Deposits',
        description: 'Approve or reject user deposit requests',
    },
    [PERMISSIONS.MANAGE_WITHDRAWALS]: {
        label: 'WalletQ - Withdrawals',
        description: 'Approve or reject user withdrawal requests',
    },
    [PERMISSIONS.MANAGE_TRADES]: {
        label: 'Trade Management',
        description: 'View and manage user trading activity',
    },
    [PERMISSIONS.MANAGE_WALLET_SETTINGS]: {
        label: 'Wallet Settings',
        description: 'Configure admin wallet addresses and wallet system settings',
    },
    [PERMISSIONS.MANAGE_ADMINS]: {
        label: 'Manage Admins',
        description: 'Create, edit, and delete admin accounts (Super Admin only)',
    },
    [PERMISSIONS.MANAGE_TRADE_SETTINGS]: {
        label: 'Trade Ctrl',
        description: 'Configure global trade settings and profit levels',
    },
    [PERMISSIONS.MANAGE_CHAT]: {
        label: 'Chat Support',
        description: 'View and respond to user chat messages and support requests',
    },
};
