import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth.config";
import { getProductionAudioDirectories } from '@/lib/clDataApi';

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

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    const data = await getProductionAudioDirectories();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching production audio directories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch production audio directories' },
      { status: 500 }
    );
  }
}

