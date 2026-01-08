import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { User } from '@/types/user';

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

    // Fetch all users
    const usersSnapshot = await adminDB.collection('users').get();
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp to ISO string for JSON serialization
      const createDate = data.createDate?.toDate ? data.createDate.toDate().toISOString() : data.createDate;
      
      return {
        uid: doc.id,
        email: data.email,
        name: data.name,
        surname: data.surname,
        roleID: data.roleID,
        projectAccessIDs: data.projectAccessIDs || {},
        createDate: createDate,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

