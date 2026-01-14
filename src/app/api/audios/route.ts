import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/auth.config";

export const dynamic = "force-dynamic";

/**
 * GET /api/audios?sheetId=<sheet_id>
 * Proxies to Python API /audios endpoint
 * Returns list of audio files for a given language (sheetId)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get sheetId from query parameters
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");

    if (!sheetId) {
      return NextResponse.json(
        { error: "sheetId query parameter is required" },
        { status: 400 }
      );
    }

    // Get Python API URL from environment variable
    // TODO: Set PYTHON_API_URL in your .env.local file
    const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const pythonEndpoint = `${pythonApiUrl}/audios?sheetId=${encodeURIComponent(sheetId)}`;

    // Proxy request to Python API
    const response = await fetch(pythonEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Python API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch audios from Python API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching audios:", error);
    return NextResponse.json(
      { error: "Failed to fetch audios" },
      { status: 500 }
    );
  }
}
