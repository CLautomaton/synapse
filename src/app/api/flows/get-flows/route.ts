import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";

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

    const docRef = adminDB.collection('ContentMover').doc('appFlowsDoc');
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      const data = docSnapshot.data();
      const appFlows = data?.appFlows || [];

      return NextResponse.json({ flows: appFlows });
    } else {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching flows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}