import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { RolesList, Role } from '@/types/role';

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

    // Fetch all roles
    const rolesSnapshot = await adminDB.collection('roles').get();
    const roles: RolesList = rolesSnapshot.docs.map(doc => ({
      roleID: doc.id,
      ...doc.data() as Omit<Role, 'roleID'>,
    }));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

