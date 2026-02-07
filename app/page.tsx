import { Dashboard } from '@/components/dashboard/dashboard';


/**
 * PROTECTED HOMEPAGE
 * 
 * Wrapped in strict AuthGuard to preventing dashboard access
 * without a verified Web3 wallet connection.
 */
export default function HomePage() {
    return (
        <Dashboard />
    );
}
