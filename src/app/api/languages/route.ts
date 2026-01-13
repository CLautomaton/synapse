import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/auth.config";

export const dynamic = "force-dynamic";

/**
 * GET /api/languages
 * Proxies to Python API /languages endpoint
 * Returns list of available languages (Google Sheets)
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

    // Get Python API URL from environment variable
    // TODO: Set PYTHON_API_URL in your .env.local file
    const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const pythonEndpoint = `${pythonApiUrl}/languages`;

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
        { error: "Failed to fetch languages from Python API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching languages:", error);
    return NextResponse.json(
      { error: "Failed to fetch languages" },
      { status: 500 }
    );
  }
}
