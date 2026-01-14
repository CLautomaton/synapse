import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { copyDevToProd } from '@/lib/clDataApi';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { language_code, confirmation_on_overwrite } = body;

    if (!language_code || confirmation_on_overwrite === undefined) {
      return NextResponse.json(
        { error: "language_code and confirmation_on_overwrite are required" },
        { status: 400 }
      );
    }

    const data = await copyDevToProd({
      language_code,
      confirmation_on_overwrite: confirmation_on_overwrite === 1 ? 1 : 0,
    });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error starting copy dev to prod job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start copy dev to prod job' },
      { status: 500 }
    );
  }
}

