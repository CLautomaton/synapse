import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth.config";
import { checkS3FolderExists } from '@/lib/clDataApi';

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
    const { folder_name, bucket_type } = body;

    if (!folder_name) {
      return NextResponse.json(
        { error: "folder_name is required" },
        { status: 400 }
      );
    }

    const data = await checkS3FolderExists(folder_name, bucket_type || 'dev');
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error checking S3 folder existence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check S3 folder existence' },
      { status: 500 }
    );
  }
}

