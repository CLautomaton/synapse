import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { flowId } = await request.json();

    if (!flowId) {
      return NextResponse.json(
        { error: "Flow ID is required" },
        { status: 400 }
      );
    }

    const docRef = adminDB.collection('ContentMover').doc('appFlowsDoc');
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const data = docSnapshot.data();
    const appFlows = data?.appFlows || [];
    const flowIndex = appFlows.findIndex((flow: any) => flow.id === flowId);

    if (flowIndex === -1) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }

    appFlows.splice(flowIndex, 1);

    await docRef.update({
      appFlows: appFlows
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return NextResponse.json(
      { error: 'Failed to delete flow' },
      { status: 500 }
    );
  }
}