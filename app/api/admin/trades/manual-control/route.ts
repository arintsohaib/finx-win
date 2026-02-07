export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminJWTPayload } from "@/lib/admin-auth";
/**
 * POST /api/admin/trades/manual-control
 * Sets a manual outcome preset (WIN/LOSS) for an active trade
 * The trade will continue running and use this preset when the timer expires
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Use cookie-based authentication (same as other admin routes)
    const adminResult = await requireAdmin(req);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const adminData = adminResult as AdminJWTPayload;

    // Only SUPER_ADMIN can use manual control
    if (adminData.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admins can manually control trades" },
        { status: 403 }
      );
    }

    const { tradeId, outcome } = await req.json();

    // Validate input
    if (!tradeId || !outcome) {
      return NextResponse.json(
        { error: "Trade ID and outcome are required" },
        { status: 400 }
      );
    }

    if (outcome !== "WIN" && outcome !== "LOSS") {
      return NextResponse.json(
        { error: "Outcome must be WIN or LOSS" },
        { status: 400 }
      );
    }

    // Find the trade
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        user: {
          include: {
            kycSubmissions: {
              where: { status: 'approved' },
              select: { fullName: true, email: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    // Verify trade is active
    if (trade.status !== "active") {
      return NextResponse.json(
        { error: "Only active trades can have outcome presets" },
        { status: 400 }
      );
    }

    // Verify trade hasn't expired yet
    if (new Date() >= new Date(trade.expiresAt)) {
      return NextResponse.json(
        { error: "Trade has already expired" },
        { status: 400 }
      );
    }

    // Update the trade with manual outcome preset
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        manualOutcomePreset: outcome,
        manualPresetBy: adminData.username,
        manualPresetAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    // Note: We don't log this as a user activity since the trade appears normal to the user
    // The manual preset is stored in the database and will be used when the trade expires
    // Admin action is implicitly logged via manualPresetBy and manualPresetAt fields

    return NextResponse.json({
      success: true,
      message: `Trade outcome preset to ${outcome}. Will apply when timer expires.`,
      trade: {
        id: updatedTrade.id,
        manualOutcomePreset: updatedTrade.manualOutcomePreset,
        manualPresetBy: updatedTrade.manualPresetBy,
        manualPresetAt: updatedTrade.manualPresetAt,
      },
    });
  } catch (error) {
    console.error("Manual control error:", error);
    return NextResponse.json(
      { error: "Failed to set manual outcome preset" },
      { status: 500 }
    );
  }
}
