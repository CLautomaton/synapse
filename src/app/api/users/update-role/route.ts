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

    const { userId, roleID } = await request.json();

    if (!userId || !roleID) {
      return NextResponse.json(
        { error: "userId and roleID are required" },
        { status: 400 }
      );
    }

    // Verify the role exists
    const roleDoc = await adminDB.collection('roles').doc(roleID).get();
    if (!roleDoc.exists) {
      return NextResponse.json(
        { error: "Invalid role ID" },
        { status: 400 }
      );
    }

    // Update user's role
    await adminDB.collection('users').doc(userId).update({
      roleID: roleID,
    });

    return NextResponse.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}

