import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { uploadFiles } from '@/lib/clDataApi';

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

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const folderId = formData.get('folder_id') as string;

    if (!folderId) {
      return NextResponse.json(
        { error: "folder_id is required" },
        { status: 400 }
      );
    }

    // Get files from form data
    const files: File[] = [];
    const fileEntries = formData.getAll('files');
    
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const data = await uploadFiles(folderId, files);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}

