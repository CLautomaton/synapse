import { GetServerSideProps } from "next";
import { getSession, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import SideBarLayout from "@/components/sidebar-layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Boxes,
  Upload,
  Trash2,
  Send,
  FileSpreadsheet,
  Music,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  Shield
} from "lucide-react";
import getVersion from "@/utils/get-version";
import { adminDB } from "@/config/firebaseAdmin";

interface Props {
  readonly version: string;
  readonly userRoleID: string | null;
}

interface Language {
  id: string;
  name: string;
}

interface Audio {
  id: string;
  name: string;
}

export default function FeedTheMonsterPage({ version, userRoleID }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [previewMode, setPreviewMode] = useState<"dev" | "prod">("dev");
  const [isClContentExpanded, setIsClContentExpanded] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  // Language and Audio state
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [audios, setAudios] = useState<Audio[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [loadingAudios, setLoadingAudios] = useState(false);

  // Feed The Monster preview URLs
  const FEED_THE_MONSTER_URLS = {
    dev: "https://feedthemonsterdev.curiouscontent.org",
    prod: "https://feedthemonster.curiouscontent.org",
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Fetch languages on page load
    fetchLanguages();
  }, [status, session]);

  // Fetch audios when a language is selected
  useEffect(() => {
    if (selectedSheetId) {
      fetchAudios(selectedSheetId);
    } else {
      setAudios([]);
    }
  }, [selectedSheetId]);

  const fetchLanguages = async () => {
    setLoadingLanguages(true);
    try {
      const response = await fetch("/api/languages");
      if (response.ok) {
        const data = await response.json();
        setLanguages(data.languages || []);
      } else {
        console.error("Failed to fetch languages");
      }
    } catch (error) {
      console.error("Error fetching languages:", error);
    } finally {
      setLoadingLanguages(false);
    }
  };

  const fetchAudios = async (sheetId: string) => {
    setLoadingAudios(true);
    try {
      const response = await fetch(`/api/audios?sheetId=${encodeURIComponent(sheetId)}`);
      if (response.ok) {
        const data = await response.json();
        setAudios(data.audios || []);
      } else {
        console.error("Failed to fetch audios");
        setAudios([]);
      }
    } catch (error) {
      console.error("Error fetching audios:", error);
      setAudios([]);
    } finally {
      setLoadingAudios(false);
    }
  };

  // Mock functions for now (will be replaced with Python API calls)
  const handleLoadLanguageContent = () => {
    if (!selectedSheetId) return;
    console.log("Load language content from Google Sheet:", selectedSheetId);
    // TODO: Call Python API to load content from Google Sheet
    // This should use the selectedSheetId to load the content
  };

  const handleUploadAudio = () => {
    if (!selectedSheetId) return;
    console.log("Upload audio to drive folder for sheet:", selectedSheetId);
    // TODO: Call Python API to upload audio
    // After upload, refresh the audio list by calling fetchAudios(selectedSheetId)
  };

  const handleRemoveAudio = (audioId: string) => {
    if (!selectedSheetId) return;
    console.log("Remove audio:", audioId, "from sheet:", selectedSheetId);
    // TODO: Call Python API to remove audio
    // After removal, refresh the audio list by calling fetchAudios(selectedSheetId)
  };

  const handleSendForApproval = () => {
    console.log("Send for approval - Content Editor");
    // TODO: Call Python API to send for approval
  };

  const logOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/signin");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const renderAudioList = () => {
    if (!selectedSheetId) {
      return (
        <p className="text-sm text-gray-500 text-center py-4">
          Please select a language to view audio files
        </p>
      );
    }
    if (loadingAudios) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin" size={20} />
          <span className="ml-2 text-sm text-gray-500">Loading audios...</span>
        </div>
      );
    }
    if (audios.length === 0) {
      return (
        <p className="text-sm text-gray-500 text-center py-4">
          No audio files found for this language
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {audios.map((audio) => (
          <div
            key={audio.id}
            className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">{audio.name}</span>
            <Button
              onClick={() => handleRemoveAudio(audio.id)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={14} className="mr-1" />
              Delete
            </Button>
          </div>
        ))}
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const baseURL =
    previewMode === "dev"
      ? FEED_THE_MONSTER_URLS.dev
      : FEED_THE_MONSTER_URLS.prod;

  const previewURL = selectedLanguage
    ? `${baseURL}?cr_lang=${encodeURIComponent(selectedLanguage)}`
    : baseURL;


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
                  className={`block py-2 mb-2 px-3 rounded ${router.pathname === "/dashboard" ? "bg-gray-500" : "bg-gray-700"
                    }`}
                >
                  <div className="flex items-center">
                    <ArrowRightLeft size={20} className="mr-2" />
                    <span className="text-sm">App Flows</span>
                  </div>
                </Link>
              )}
              <div>
                <Link
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsClContentExpanded(!isClContentExpanded);
                  }}
                  className={`block py-2 mb-2 px-3 rounded ${router.pathname.startsWith("/dashboard/app-content") ? "bg-gray-500" : "bg-gray-700"
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
                    className={`block py-2 mb-2 px-3 rounded ml-6 ${router.pathname === "/dashboard/app-content/feed-the-monster" ? "bg-gray-500" : "bg-gray-700"
                      }`}
                  >
                    <div className="flex items-center">
                      <span className="text-sm">Feed The Monster</span>
                    </div>
                  </Link>
                )}
              </div>
              {userRoleID === "0" && (
                <Link
                  href="/dashboard/users"
                  className={`block py-2 mb-2 px-3 rounded ${router.pathname === "/dashboard/users" ? "bg-gray-500" : "bg-gray-700"
                    }`}
                >
                  <div className="flex items-center">
                    <Shield size={20} className="mr-2" />
                    <span className="text-sm">Roles & Permissions</span>
                  </div>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={() => logOut()}
              className="py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-300"
            >
              Log Out
            </button>
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
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Language
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="language-select"
                        value={selectedSheetId}
                        onChange={(e) => {
                          const sheetId = e.target.value;
                          setSelectedSheetId(sheetId);
                          // Find the language name for the selected sheet ID
                          const selectedLang = languages.find(lang => lang.id === sheetId);
                          setSelectedLanguage(selectedLang?.name || "");
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loadingLanguages}
                      >
                        <option value="">
                          {loadingLanguages ? "Loading languages..." : "Select a language..."}
                        </option>
                        {languages.map((language) => (
                          <option key={language.id} value={language.id}>
                            {language.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={handleLoadLanguageContent}
                        disabled={!selectedSheetId}
                      >
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
                    <Button
                      onClick={handleUploadAudio}
                      className="flex-1"
                      disabled={!selectedSheetId}
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Audio
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 min-h-[100px]">
                    {renderAudioList()}
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
                      <p className="mb-2">Loading preview...</p>
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
