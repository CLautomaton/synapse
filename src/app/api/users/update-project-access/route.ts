import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user's data to check role
    const currentUserId = session.user?.id;
    if (!currentUserId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    const currentUserDoc = await adminDB.collection('users').doc(currentUserId).get();
    const currentUserData = currentUserDoc.data();

    // Check if user is admin (roleID "0")
    if (currentUserData?.roleID !== "0") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { userId, projectAccessIDs } = await request.json();

    if (!userId || !projectAccessIDs) {
      return NextResponse.json(
        { error: "userId and projectAccessIDs are required" },
        { status: 400 }
      );
    }

    // Validate projectAccessIDs structure
    if (typeof projectAccessIDs !== 'object' || Array.isArray(projectAccessIDs)) {
      return NextResponse.json(
        { error: "projectAccessIDs must be an object" },
        { status: 400 }
      );
    }

    // Update user's projectAccessIDs
    await adminDB.collection('users').doc(userId).update({
      projectAccessIDs: projectAccessIDs,
    });

    return NextResponse.json({ success: true, message: 'Project access updated successfully' });
  } catch (error) {
    console.error('Error updating project access:', error);
    return NextResponse.json(
      { error: 'Failed to update project access' },
      { status: 500 }
    );
  }
}

