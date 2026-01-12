import { NextResponse } from 'next/server';
import { getAdminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { AppsList, App } from '@/types/app';

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

    // Fetch all apps
    const adminDB = getAdminDB();
    const appsSnapshot = await adminDB.collection('apps').get();
    const apps: AppsList = appsSnapshot.docs.map(doc => ({
      appID: doc.id,
      ...doc.data() as Omit<App, 'appID'>,
    }));

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    );
  }
}

