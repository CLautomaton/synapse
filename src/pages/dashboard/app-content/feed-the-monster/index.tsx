import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import SideBarLayout from "@/components/sidebar-layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Boxes, 
  Upload, 
  Trash2, 
  Send, 
  FileSpreadsheet, 
  Music, 
  Loader2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { App } from "@/types/app";
import getVersion from "@/utils/get-version";
import { adminDB } from "@/config/firebaseAdmin";

interface Props {
  version: string;
  userRoleID: string | null;
}

export default function FeedTheMonsterPage({ version, userRoleID }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [app, setApp] = useState<App | null>(null);
  const [previewMode, setPreviewMode] = useState<"dev" | "prod">("dev");
  const [loading, setLoading] = useState(true);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isClContentExpanded, setIsClContentExpanded] = useState(true);
  const [currentlyToggledMainContent, setCurrentlyToggledMainContent] = useState<"app-flows" | "cl-content">("cl-content");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchFeedTheMonsterApp();
  }, [status, session]);

  const fetchFeedTheMonsterApp = async () => {
    try {
      const response = await fetch("/api/apps/get-apps");
      if (response.ok) {
        const data = await response.json();
        // Find Feed The Monster app (could be by name or specific ID)
        const ftmApp = data.apps.find((a: App) => 
          a.name.toLowerCase().includes("feed the monster") || 
          a.name.toLowerCase().includes("feedthemonster") ||
          a.appID === "0" // Assuming Feed The Monster is app ID 0, adjust as needed
        );
        setApp(ftmApp || null);
      }
    } catch (error) {
      console.error("Error fetching Feed The Monster app:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mock functions for now (will be replaced with Python API calls)
  const handleLoadLanguageContent = () => {
    console.log("Load language content from Google Sheet:", googleSheetUrl);
    // TODO: Call Python API to load content from Google Sheet
  };

  const handleUploadAudio = () => {
    console.log("Upload audio to drive folder");
    // TODO: Call Python API to upload audio
  };

  const handleLoadAudios = () => {
    console.log("Load audios from drive folder");
    // TODO: Call Python API to load audios
  };

  const handleRemoveAudio = (audioId: string) => {
    console.log("Remove audio:", audioId);
    // TODO: Call Python API to remove audio
  };

  const handleSendForApproval = () => {
    console.log("Send for approval - Content Editor");
    // TODO: Call Python API to send for approval
  };

  const toggleMainContent = (content: string) => {
    setCurrentlyToggledMainContent(content as "app-flows" | "cl-content");
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const previewURL = previewMode === "dev" ? app?.devBaseURL : app?.prodBaseURL;

  return (
    <SideBarLayout
      sidebar={
        <div className="flex flex-col h-screen justify-center">
          <div className="flex-grow">
            <h1 className="text-md font-bold mb-6">Synapse Dashboard</h1>
            {session && (
              <div className="mb-6 p-2 bg-white shadow-lg rounded-lg border border-gray-200">
                <div className="flex items-center justify-center flex-col">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                    {session.user?.name?.charAt(0)}
                  </div>
                  <div className="m-0 p-0">
                    <p className="text-md font-semibold text-gray-900">{session.user?.name}</p>
                    <p className="text-[12px] text-gray-600">{session.user?.email}</p>
                  </div>
                </div>
              </div>
            )}
            <nav>
              {userRoleID === "0" && (
                <Link
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleMainContent("app-flows");
                  }}
                  className={`block py-2 mb-2 px-3 rounded ${
                    currentlyToggledMainContent === "app-flows" ? "bg-gray-500" : "bg-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <Boxes size={20} className="mr-2" />
                    <span className="text-sm">App Flows</span>
                  </div>
                </Link>
              )}
              <div>
                <Link
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleMainContent("cl-content");
                    setIsClContentExpanded(!isClContentExpanded);
                  }}
                  className={`block py-2 mb-2 px-3 rounded ${
                    currentlyToggledMainContent === "cl-content" ? "bg-gray-500" : "bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Boxes size={20} className="mr-2" />
                      <span className="text-sm">CL Content</span>
                    </div>
                    {isClContentExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </Link>
                {isClContentExpanded && (userRoleID === "0" || userRoleID === "1") && (
                  <Link
                    href="/dashboard/app-content/feed-the-monster"
                    className={`block py-2 mb-2 px-3 rounded ml-6 ${
                      router.pathname === "/dashboard/app-content/feed-the-monster" ? "bg-gray-500" : "bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-sm">Feed The Monster</span>
                    </div>
                  </Link>
                )}
              </div>
            </nav>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-[10px] mt-4 text-center">Version: {version}</p>
          </div>
        </div>
      }
      main={
        <div className="flex gap-4" style={{ minHeight: "calc(100vh - 3rem)" }}>
          {/* Left Side - Content Editing Tools */}
          <div className="w-1/2 flex flex-col gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">Feed The Monster - Content Editor</h2>
              
              {/* Language Content Section */}
              <div className="mb-6 border-b pb-6">
                <div className="flex items-center mb-4">
                  <FileSpreadsheet size={20} className="mr-2" />
                  <h3 className="text-lg font-semibold">Language Content</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Sheet URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleLoadLanguageContent}>
                        Load Content
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Management Section */}
              <div className="mb-6 border-b pb-6">
                <div className="flex items-center mb-4">
                  <Music size={20} className="mr-2" />
                  <h3 className="text-lg font-semibold">Audio Management</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={handleLoadAudios} variant="outline" className="flex-1">
                      Load Audios
                    </Button>
                    <Button onClick={handleUploadAudio} className="flex-1">
                      <Upload size={16} className="mr-2" />
                      Upload Audio
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 min-h-[100px]">
                    <p className="text-sm text-gray-500">Audio files will appear here</p>
                    {/* TODO: Display audio list when API is ready */}
                  </div>
                </div>
              </div>

              {/* Send for Approval Section */}
              <div className="mb-6">
                <Button
                  onClick={handleSendForApproval}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <Send size={16} className="mr-2" />
                  Send for Approval
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="w-1/2 flex flex-col gap-4">
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col" style={{ height: "calc(100vh - 3rem)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === "dev" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("dev")}
                  >
                    Dev
                  </Button>
                  <Button
                    variant={previewMode === "prod" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("prod")}
                  >
                    Prod
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden flex-1">
                {previewURL ? (
                  <iframe
                    src={previewURL}
                    className="w-full h-full"
                    title={`Feed The Monster ${previewMode} Preview`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p className="mb-2">No preview URL available</p>
                      <p className="text-sm">
                        {app 
                          ? `App config found but ${previewMode} URL is missing`
                          : "Feed The Monster app config not found in Firebase"
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const version = getVersion();

  // Get user's role
  const userId = (session.user as any)?.id;
  let userRoleID: string | null = null;

  if (userId) {
    try {
      const userDoc = await adminDB.collection("users").doc(userId).get();
      userRoleID = userDoc.data()?.roleID || null;
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }

  // Check if user has access (roleID 0 or 1)
  if (userRoleID !== "0" && userRoleID !== "1") {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  return {
    props: {
      version,
      userRoleID,
    },
  };
};
