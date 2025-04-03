import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { flow, isEditing } = await request.json();

    if (!flow || !flow.id || !Array.isArray(flow.flow)) {
      return NextResponse.json(
        { error: "Invalid flow data. ID and flow array are required." },
        { status: 400 }
      );
    }

    const docRef = adminDB.collection('ContentMover').doc('appFlowsDoc');
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      // If document doesn't exist, create it with the new flow
      await docRef.set({
        appFlows: [flow]
      });
      return NextResponse.json({ success: true, message: 'Flow added successfully' });
    }

    const data = docSnapshot.data();
    const appFlows = data?.appFlows || [];

    // Check if flow ID already exists (for updates)
    const existingFlowIndex = appFlows.findIndex((f: any) => f.id === flow.id);

    if (existingFlowIndex !== -1) {
      // Flow exists - handle update
      if (isEditing) {
        // If we're editing, update the existing flow
        appFlows[existingFlowIndex] = flow;
        await docRef.update({ appFlows });
        return NextResponse.json({ success: true, message: 'Flow updated successfully' });
      } else {
        // If we're not editing, return error for duplicate ID
        return NextResponse.json(
          { error: "A flow with this ID already exists" },
          { status: 400 }
        );
      }
    }

    // Add new flow
    appFlows.push(flow);
    await docRef.update({
      appFlows: appFlows
    });

    return NextResponse.json({ success: true, message: 'Flow added successfully' });
  } catch (error) {
    console.error('Error adding/updating flow:', error);
    return NextResponse.json(
      { error: 'Failed to add/update flow' },
      { status: 500 }
    );
  }
}
function generateFlowId() {
  return 'flow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
