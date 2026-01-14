import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { listDirectoryContents } from '@/lib/clDataApi';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folder_id');

    if (!folderId) {
      return NextResponse.json(
        { error: "folder_id parameter is required" },
        { status: 400 }
      );
    }

    const data = await listDirectoryContents(folderId);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching directory contents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch directory contents' },
      { status: 500 }
    );
  }
}

