import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/auth.config";
import { getLevelGenSheets } from '@/lib/clDataApi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has access (roleID 0 or 1)
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    // Note: We could add role checking here if needed
    // For now, any authenticated user can access

    const data = await getLevelGenSheets();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching level gen sheets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch level gen sheets' },
      { status: 500 }
    );
  }
}

