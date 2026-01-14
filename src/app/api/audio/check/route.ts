import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { checkAudioFiles } from '@/lib/clDataApi';

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

    const body = await request.json();
    const { sheet_id, audio_folder_ids } = body;

    if (!sheet_id) {
      return NextResponse.json(
        { error: "sheet_id is required" },
        { status: 400 }
      );
    }

    if (!audio_folder_ids || (Array.isArray(audio_folder_ids) && audio_folder_ids.length === 0)) {
      return NextResponse.json(
        { error: "audio_folder_ids is required" },
        { status: 400 }
      );
    }

    const data = await checkAudioFiles(sheet_id, audio_folder_ids);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error checking audio files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check audio files' },
      { status: 500 }
    );
  }
}

