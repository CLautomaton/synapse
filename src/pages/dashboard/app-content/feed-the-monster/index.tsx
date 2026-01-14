import { GetServerSideProps } from "next";
import { getSession, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
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
  ChevronRight,
  ArrowRightLeft,
  Shield,
  RotateCcw,
  Folder,
  File,
  ArrowLeft,
  Check,
  X
} from "lucide-react";
import getVersion from "@/utils/get-version";
import { adminDB } from "@/config/firebaseAdmin";

interface Props {
  readonly version: string;
  readonly userRoleID: string | null;
}

interface LevelGenSheet {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  modifiedTime: string;
  canOpen: boolean;
}

interface DriveItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  mimeType: string;
  modifiedTime: string;
  size?: string;
  canOpen: boolean;
}

interface DirectoryNavigationItem {
  id: string;
  name: string;
}

interface SelectedDirectory {
  id: string;
  name: string;
  fullPath: string;
  pathSegments?: Array<{name: string, id: string | null, isCurrent: boolean}>;
}

export default function FeedTheMonsterPage({ version, userRoleID }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [previewMode, setPreviewMode] = useState<"dev" | "prod">("dev"); // Locked to dev for now
  const [isClContentExpanded, setIsClContentExpanded] = useState(true);
  const [newLanguage, setNewLanguage] = useState<string>(""); // New language text field
  const [previewReloadKey, setPreviewReloadKey] = useState<number>(0); // Key to force iframe reload
  // Level Gen Sheets state
  const [levelGenSheets, setLevelGenSheets] = useState<LevelGenSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [previewLanguage, setPreviewLanguage] = useState<string>(""); // State for the preview language (updated when button is clicked)
  const [roles, setRoles] = useState<any[]>([]);
  
  // Audio directory navigation state
  const [audioDirectories, setAudioDirectories] = useState<DriveItem[]>([]);
  const [currentDirectoryId, setCurrentDirectoryId] = useState<string | null>(null);
  const [currentDirectoryName, setCurrentDirectoryName] = useState<string>("Production Audio");
  const [navigationStack, setNavigationStack] = useState<DirectoryNavigationItem[]>([]);
  const [selectedDirectories, setSelectedDirectories] = useState<SelectedDirectory[]>([]);
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [checkingAudio, setCheckingAudio] = useState(false);
  const [audioCheckResults, setAudioCheckResults] = useState<any>(null);
  const [s3Connected, setS3Connected] = useState<boolean | null>(null);
  const [checkingS3, setCheckingS3] = useState(false);
  const s3TestedRef = useRef(false);
  const [syncingToDev, setSyncingToDev] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncJobStatus, setSyncJobStatus] = useState<any>(null);
  const [checkingFolderExists, setCheckingFolderExists] = useState(false);
  const [folderExistsInfo, setFolderExistsInfo] = useState<any>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const syncPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Prod sync state
  const [syncingToProd, setSyncingToProd] = useState(false);
  const [prodSyncJobId, setProdSyncJobId] = useState<string | null>(null);
  const [prodSyncJobStatus, setProdSyncJobStatus] = useState<any>(null);
  const [checkingProdFolderExists, setCheckingProdFolderExists] = useState(false);
  const [prodFolderExistsInfo, setProdFolderExistsInfo] = useState<any>(null);
  const [showProdConfirmModal, setShowProdConfirmModal] = useState(false);
  const [prodConfirmTimer, setProdConfirmTimer] = useState(5);
  const [prodConfirmInput, setProdConfirmInput] = useState("");
  const prodSyncPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prodTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const testS3Connection = async () => {
    setCheckingS3(true);
    try {
      const response = await fetch('/api/s3/test');
      if (response.ok) {
        const data = await response.json();
        setS3Connected(data.connected === true);
      } else {
        setS3Connected(false);
      }
    } catch (error) {
      console.error('Error testing S3 connection:', error);
      setS3Connected(false);
    } finally {
      setCheckingS3(false);
    }
  };

  // Get Feed The Monster app URLs from apps collection
  const feedTheMonsterApp = apps.find(app => app.name === "Feed The Monster" || app.appID === "2");
  const FEED_THE_MONSTER_URLS = {
    dev: feedTheMonsterApp?.devBaseURL || "https://feedthemonsterdev.curiouscontent.org",
    prod: feedTheMonsterApp?.prodBaseURL || "https://feedthemonster.curiouscontent.org",
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Fetch level gen sheets, apps, audio directories, and roles on page load
    fetchLevelGenSheets();
    fetchApps();
    fetchProductionAudioDirectories();
    fetchRoles();
    
    // Test S3 connection only once on initial load
    if (!s3TestedRef.current) {
      s3TestedRef.current = true;
      testS3Connection();
    }
  }, [status, session]);

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps/get-apps');
      if (response.ok) {
        const data = await response.json();
        setApps(data.apps);
      }
    } catch (error) {
      console.error('Error fetching apps:', error);
    }
  };


  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles/get-roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const getRoleName = (roleID: string | null) => {
    if (!roleID) return 'Unknown';
    const role = roles.find(r => r.roleID === roleID);
    return role?.name || 'Unknown';
  };

  const getRoleColor = (roleID: string | null) => {
    switch (roleID) {
      case "0":
        return "bg-red-100 text-red-800 border-red-300"; // Admin - Red
      case "1":
        return "bg-blue-100 text-blue-800 border-blue-300"; // Content Editor - Blue
      case "2":
        return "bg-green-100 text-green-800 border-green-300"; // Partner Editor - Green
      case "3":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"; // Viewer/Tester - Yellow
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"; // Unknown - Gray
    }
  };

  const fetchLevelGenSheets = async () => {
    setLoadingLanguages(true);
    try {
      const response = await fetch("/api/level-gen-sheets");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sheets) {
          setLevelGenSheets(data.sheets);
        } else {
          console.error("Failed to fetch level gen sheets");
        }
      } else {
        console.error("Failed to fetch level gen sheets");
      }
    } catch (error) {
      console.error("Error fetching level gen sheets:", error);
    } finally {
      setLoadingLanguages(false);
    }
  };

  const fetchProductionAudioDirectories = async () => {
    setLoadingDirectories(true);
    try {
      const response = await fetch("/api/drive/audio/production");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items) {
          setAudioDirectories(data.items);
          setCurrentDirectoryId(data.folder_id || null);
          setCurrentDirectoryName("Production Audio");
          // Reset navigation stack when going back to root
          setNavigationStack([]);
        } else {
          console.error("Failed to fetch production audio directories");
        }
      } else {
        console.error("Failed to fetch production audio directories");
      }
    } catch (error) {
      console.error("Error fetching production audio directories:", error);
    } finally {
      setLoadingDirectories(false);
    }
  };

  const navigateToDirectory = async (directoryId: string, directoryName: string) => {
    // Check if we're already in this directory - don't add to stack if so
    if (currentDirectoryId === directoryId) {
      return;
    }

    // Check if this directory is already in the stack - if so, navigate back to it instead
    const existingIndex = navigationStack.findIndex(item => item.id === directoryId);
    if (existingIndex !== -1) {
      // Navigate back to this directory by truncating the stack
      const newStack = navigationStack.slice(0, existingIndex + 1);
      setLoadingDirectories(true);
      try {
        const response = await fetch(`/api/drive/list?folder_id=${encodeURIComponent(directoryId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.items) {
            setAudioDirectories(data.items);
            setCurrentDirectoryId(directoryId);
            setCurrentDirectoryName(directoryName);
            setNavigationStack(newStack);
          }
        }
      } catch (error) {
        console.error("Error fetching directory contents:", error);
      } finally {
        setLoadingDirectories(false);
      }
      return;
    }

    setLoadingDirectories(true);
    try {
      const response = await fetch(`/api/drive/list?folder_id=${encodeURIComponent(directoryId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items) {
          setAudioDirectories(data.items);
          setCurrentDirectoryId(directoryId);
          setCurrentDirectoryName(directoryName);
          // Add to navigation stack only if it's not already there
          setNavigationStack(prev => {
            // Double-check it's not already in the stack
            if (prev.find(item => item.id === directoryId)) {
              return prev;
            }
            return [...prev, { id: directoryId, name: directoryName }];
          });
        } else {
          console.error("Failed to fetch directory contents");
        }
      } else {
        console.error("Failed to fetch directory contents");
      }
    } catch (error) {
      console.error("Error fetching directory contents:", error);
    } finally {
      setLoadingDirectories(false);
    }
  };

  const navigateBack = async () => {
    if (navigationStack.length === 0) {
      // Already at root
      return;
    }

    const newStack = [...navigationStack];
    newStack.pop(); // Remove current directory from stack
    
    if (newStack.length === 0) {
      // Go back to root
      await fetchProductionAudioDirectories();
      setNavigationStack([]);
    } else {
      // Navigate to parent directory (without adding to stack)
      const parentDir = newStack[newStack.length - 1];
      setLoadingDirectories(true);
      try {
        const response = await fetch(`/api/drive/list?folder_id=${encodeURIComponent(parentDir.id)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.items) {
            setAudioDirectories(data.items);
            setCurrentDirectoryId(parentDir.id);
            setCurrentDirectoryName(parentDir.name);
            setNavigationStack(newStack);
          }
        }
      } catch (error) {
        console.error("Error navigating back:", error);
      } finally {
        setLoadingDirectories(false);
      }
    }
  };

  const getFullPath = (directoryId: string, directoryName: string): Array<{name: string, id: string | null, isCurrent: boolean}> => {
    // Build full path array with navigation info
    const pathParts: Array<{name: string, id: string | null, isCurrent: boolean}> = [
      { name: "Production Audio", id: null, isCurrent: false }
    ];
    
    navigationStack.forEach(item => {
      pathParts.push({ name: item.name, id: item.id, isCurrent: false });
    });
    
    // Add the directory only if it's not already the last item in the navigation stack
    const isLastInStack = navigationStack.length > 0 && navigationStack[navigationStack.length - 1].id === directoryId;
    
    if (!isLastInStack) {
      // If it's the current directory, mark it as current
      if (directoryId === currentDirectoryId && directoryName === currentDirectoryName) {
        pathParts.push({ name: currentDirectoryName, id: currentDirectoryId, isCurrent: true });
      } else {
        pathParts.push({ name: directoryName, id: directoryId, isCurrent: false });
      }
    }
    
    return pathParts;
  };

  const navigateToPathSegment = async (segmentIndex: number, directoryId: string | null) => {
    if (directoryId === null) {
      // Navigate to root
      await fetchProductionAudioDirectories();
      setNavigationStack([]);
      return;
    }

    // Find the directory in navigation stack
    const targetIndex = navigationStack.findIndex(item => item.id === directoryId);
    if (targetIndex !== -1) {
      const targetDir = navigationStack[targetIndex];
      // Build the stack up to this point
      const newStack = navigationStack.slice(0, targetIndex + 1);
      
      // Navigate to this directory directly without using navigateToDirectory (which adds to stack)
      setLoadingDirectories(true);
      try {
        const response = await fetch(`/api/drive/list?folder_id=${encodeURIComponent(targetDir.id)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.items) {
            setAudioDirectories(data.items);
            setCurrentDirectoryId(targetDir.id);
            setCurrentDirectoryName(targetDir.name);
            setNavigationStack(newStack);
          }
        }
      } catch (error) {
        console.error("Error navigating to path segment:", error);
      } finally {
        setLoadingDirectories(false);
      }
    }
  };

  const selectCurrentDirectory = () => {
    if (currentDirectoryId) {
      // Check if already selected
      if (!selectedDirectories.find(dir => dir.id === currentDirectoryId)) {
        const fullPathArray = getFullPath(currentDirectoryId, currentDirectoryName);
        const fullPathString = fullPathArray.map(p => p.name).join(" > ");
        setSelectedDirectories(prev => [...prev, { 
          id: currentDirectoryId, 
          name: currentDirectoryName,
          fullPath: fullPathString,
          pathSegments: fullPathArray
        }]);
      }
    }
  };

  const removeSelectedDirectory = (directoryId: string) => {
    setSelectedDirectories(prev => prev.filter(dir => dir.id !== directoryId));
  };

  const toggleDirectorySelection = (directoryId: string, directoryName: string) => {
    setSelectedDirectories(prev => {
      const existing = prev.find(dir => dir.id === directoryId);
      if (existing) {
        return prev.filter(dir => dir.id !== directoryId);
      } else {
        const fullPathArray = getFullPath(directoryId, directoryName);
        const fullPathString = fullPathArray.map(p => p.name).join(" > ");
        return [...prev, { 
          id: directoryId, 
          name: directoryName,
          fullPath: fullPathString,
          pathSegments: fullPathArray
        }];
      }
    });
  };


  // Mock functions for now (will be replaced with Python API calls)
  const handleLoadLanguageContent = () => {
    if (!selectedSheetId) return;
    console.log("Load language content from Google Sheet:", selectedSheetId);
    // TODO: Call Python API to load content from Google Sheet
    // This should use the selectedSheetId to load the content
  };

  const handleUploadAudio = async () => {
    if (!currentDirectoryId) {
      alert("Please navigate to a directory first");
      return;
    }

    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      
      if (!files || files.length === 0) {
        return;
      }

      setUploading(true);
      setUploadProgress(`Uploading ${files.length} file(s)...`);

      try {
        const formData = new FormData();
        formData.append('folder_id', currentDirectoryId);
        
        Array.from(files).forEach(file => {
          formData.append('files', file);
        });

        const response = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();
        
        if (data.success) {
          setUploadProgress(`Successfully uploaded ${data.count} file(s)!`);
          // Refresh the directory contents
          if (navigationStack.length > 0) {
            const currentDir = navigationStack[navigationStack.length - 1];
            await navigateToDirectory(currentDir.id, currentDir.name);
          } else {
            await fetchProductionAudioDirectories();
          }
          
          // Clear progress after 3 seconds
          setTimeout(() => {
            setUploadProgress("");
          }, 3000);
        } else {
          throw new Error('Upload failed');
        }
      } catch (error: any) {
        console.error('Error uploading files:', error);
        setUploadProgress(`Error: ${error.message}`);
        setTimeout(() => {
          setUploadProgress("");
        }, 5000);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  const handleUpdatePreview = () => {
    if (newLanguage.trim()) {
      setPreviewLanguage(newLanguage.trim());
      // Force iframe reload by updating the key
      setPreviewReloadKey(prev => prev + 1);
    }
  };

  const handleReloadPreview = () => {
    // Force iframe reload by updating the key
    setPreviewReloadKey(prev => prev + 1);
  };

  const handleSyncToDev = async () => {
    const languageCode = newLanguage.trim().toLowerCase();
    
    // Step 1: Check if folder exists
    setCheckingFolderExists(true);
    setFolderExistsInfo(null);
    setShowOverwriteConfirm(false);

    try {
      const existsResponse = await fetch('/api/s3/folder/exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_name: languageCode,
          bucket_type: 'dev',
        }),
      });

      if (!existsResponse.ok) {
        throw new Error('Failed to check folder existence');
      }

      const existsData = await existsResponse.json();
      setFolderExistsInfo(existsData);

      // If folder exists, ask for confirmation
      if (existsData.exists) {
        setShowOverwriteConfirm(true);
        setCheckingFolderExists(false);
        return;
      }

      // Folder doesn't exist, proceed with sync
      await startSyncJob(languageCode);
    } catch (error: any) {
      console.error('Error checking folder existence:', error);
      alert(`Error: ${error.message}`);
      setCheckingFolderExists(false);
    }
  };

  const startSyncJob = async (languageCode: string, overwrite: boolean = false) => {
    setSyncingToDev(true);
    setShowOverwriteConfirm(false);
    setCheckingFolderExists(false);
    setSyncJobStatus(null);

    try {
      const folderIds = selectedDirectories.map(dir => dir.id);
      const syncResponse = await fetch('/api/jobs/sync-to-s3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language_code: languageCode,
          sheet_id: selectedSheetId,
          audio_folder_ids: folderIds,
          confirmation_on_overwrite: overwrite ? 1 : 0,
          bucket_type: 'dev',
        }),
      });

      if (!syncResponse.ok) {
        const error = await syncResponse.json();
        throw new Error(error.error || 'Failed to start sync job');
      }

      const syncData = await syncResponse.json();
      setSyncJobId(syncData.job_id);
      
      // Start polling for job status
      startPollingJobStatus(syncData.job_id);
    } catch (error: any) {
      console.error('Error starting sync job:', error);
      alert(`Error: ${error.message}`);
      setSyncingToDev(false);
    }
  };

  const startPollingJobStatus = (jobId: string) => {
    // Clear any existing polling interval
    if (syncPollIntervalRef.current) {
      clearInterval(syncPollIntervalRef.current);
    }

    // Poll immediately first
    pollJobStatus(jobId);

    // Then poll every 3 seconds
    syncPollIntervalRef.current = setInterval(() => {
      pollJobStatus(jobId);
    }, 3000);
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`);
      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const data = await response.json();
      setSyncJobStatus(data.job);

      // Stop polling if job is finished
      if (['completed', 'completed_with_errors', 'failed'].includes(data.job.status)) {
        if (syncPollIntervalRef.current) {
          clearInterval(syncPollIntervalRef.current);
          syncPollIntervalRef.current = null;
        }
        setSyncingToDev(false);
      }
    } catch (error: any) {
      console.error('Error polling job status:', error);
      // Continue polling even on error (might be temporary)
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (syncPollIntervalRef.current) {
        clearInterval(syncPollIntervalRef.current);
      }
      if (prodSyncPollIntervalRef.current) {
        clearInterval(prodSyncPollIntervalRef.current);
      }
      if (prodTimerIntervalRef.current) {
        clearInterval(prodTimerIntervalRef.current);
      }
    };
  }, []);

  // Prod sync functions
  const handleSyncToProd = async () => {
    const languageCode = newLanguage.trim().toLowerCase();
    
    if (!languageCode) {
      alert("Please enter a language name first");
      return;
    }
    
    // Step 1: Check if folder exists in prod
    setCheckingProdFolderExists(true);
    setProdFolderExistsInfo(null);
    setShowProdConfirmModal(false);

    try {
      const existsResponse = await fetch('/api/s3/folder/exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_name: languageCode,
          bucket_type: 'prod',
        }),
      });

      if (!existsResponse.ok) {
        throw new Error('Failed to check folder existence');
      }

      const existsData = await existsResponse.json();
      setProdFolderExistsInfo(existsData);

      // Always show confirmation modal for prod (safety check)
      setCheckingProdFolderExists(false);
      setShowProdConfirmModal(true);
      setProdConfirmTimer(5);
      setProdConfirmInput("");
      
      // Start countdown timer
      if (prodTimerIntervalRef.current) {
        clearInterval(prodTimerIntervalRef.current);
      }
      prodTimerIntervalRef.current = setInterval(() => {
        setProdConfirmTimer((prev) => {
          if (prev <= 1) {
            if (prodTimerIntervalRef.current) {
              clearInterval(prodTimerIntervalRef.current);
              prodTimerIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Error checking folder existence:', error);
      alert(`Error: ${error.message}`);
      setCheckingProdFolderExists(false);
    }
  };

  const startCopyToProdJob = async () => {
    const languageCode = newLanguage.trim().toLowerCase();
    
    setSyncingToProd(true);
    setShowProdConfirmModal(false);
    setCheckingProdFolderExists(false);
    setProdSyncJobStatus(null);
    
    // Clear timer
    if (prodTimerIntervalRef.current) {
      clearInterval(prodTimerIntervalRef.current);
      prodTimerIntervalRef.current = null;
    }

    try {
      const copyResponse = await fetch('/api/jobs/copy-dev-to-prod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language_code: languageCode,
          confirmation_on_overwrite: 1, // User already confirmed in modal
        }),
      });

      if (!copyResponse.ok) {
        const error = await copyResponse.json();
        throw new Error(error.error || 'Failed to start copy job');
      }

      const copyData = await copyResponse.json();
      setProdSyncJobId(copyData.job_id);
      
      // Start polling for job status
      startPollingProdJobStatus(copyData.job_id);
    } catch (error: any) {
      console.error('Error starting copy job:', error);
      alert(`Error: ${error.message}`);
      setSyncingToProd(false);
    }
  };

  const startPollingProdJobStatus = (jobId: string) => {
    // Clear any existing polling interval
    if (prodSyncPollIntervalRef.current) {
      clearInterval(prodSyncPollIntervalRef.current);
    }

    // Poll immediately first
    pollProdJobStatus(jobId);

    // Then poll every 3 seconds
    prodSyncPollIntervalRef.current = setInterval(() => {
      pollProdJobStatus(jobId);
    }, 3000);
  };

  const pollProdJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`);
      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const data = await response.json();
      setProdSyncJobStatus(data.job);

      // Stop polling if job is finished
      if (['completed', 'completed_with_errors', 'failed'].includes(data.job.status)) {
        if (prodSyncPollIntervalRef.current) {
          clearInterval(prodSyncPollIntervalRef.current);
          prodSyncPollIntervalRef.current = null;
        }
        setSyncingToProd(false);
      }
    } catch (error: any) {
      console.error('Error polling job status:', error);
      // Continue polling even on error (might be temporary)
    }
  };

  const logOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/signin");
    } catch (error) {
      console.error("Error logging out:", error);
    }
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

  // Preview language only comes from the new language field (via previewLanguage state)
  const baseURL = FEED_THE_MONSTER_URLS[previewMode];

  const previewURL = previewLanguage
    ? `${baseURL}?cr_lang=${encodeURIComponent(previewLanguage)}`
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
                    {userRoleID && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded border ${getRoleColor(userRoleID)}`}>
                        {getRoleName(userRoleID)}
                      </span>
                    )}
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
        <div className="flex gap-6 px-6 py-4" style={{ height: "calc(100vh - 3rem)" }}>
          {/* Left Side - Content Editing Tools */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white rounded-lg shadow-md p-6 h-full overflow-y-auto">
              <h2 className="text-2xl font-semibold mb-6">Feed The Monster - Content Editor</h2>

              {/* Step 1: Language Name */}
              <div className="mb-6 border-b pb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold mr-3 flex-shrink-0">
                    1
                  </div>
                  <h3 className="text-lg font-semibold">Language Name</h3>
                </div>
                <div>
                  <label htmlFor="new-language" className="block text-sm font-medium text-gray-700 mb-2">
                    Language Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="new-language"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdatePreview();
                        }
                      }}
                      placeholder="e.g., hindi, english, spanish"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button
                      onClick={handleUpdatePreview}
                      disabled={!newLanguage.trim()}
                      className="px-4 whitespace-nowrap"
                    >
                      Update Preview
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the language code and click "Update Preview" to load it in the iframe.
                  </p>
                </div>
              </div>

              {/* Step 2: Level Gen Files */}
              <div className="mb-6 border-b pb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold mr-3 flex-shrink-0">
                    2
                  </div>
                  <FileSpreadsheet size={20} className="mr-2" />
                  <h3 className="text-lg font-semibold">Level Gen Files</h3>
                </div>
                <div>
                  <label htmlFor="level-gen-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Level Gen File
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="level-gen-select"
                      value={selectedSheetId}
                      onChange={(e) => {
                        const sheetId = e.target.value;
                        setSelectedSheetId(sheetId);
                        // Don't update preview language when dropdown changes
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingLanguages}
                    >
                      <option value="">
                        {loadingLanguages ? "Loading level gen files..." : "Select a level gen file..."}
                      </option>
                      {levelGenSheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleLoadLanguageContent}
                      disabled={!selectedSheetId}
                      className="whitespace-nowrap"
                    >
                      Load Content
                    </Button>
                  </div>
                  {levelGenSheets.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Found {levelGenSheets.length} level gen file(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Audio Directories */}
              <div className="mb-6 border-b pb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold mr-3 flex-shrink-0">
                    3
                  </div>
                  <Music size={20} className="mr-2" />
                  <h3 className="text-lg font-semibold">Audio Directories</h3>
                </div>
                <div className="space-y-4">
                  {/* Audio Directory Browser */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Production Audio Directories</h4>
                        <div className="flex gap-2 items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUploadAudio}
                            disabled={!currentDirectoryId || uploading}
                            className="text-xs"
                            title={!currentDirectoryId ? "Navigate to a directory first" : "Upload audio to current directory"}
                          >
                            <Upload size={14} className="mr-1" />
                            {uploading ? "Uploading..." : "Upload Audio"}
                          </Button>
                          {uploadProgress && (
                            <span className="text-xs text-gray-600">{uploadProgress}</span>
                          )}
                          {currentDirectoryId && !selectedDirectories.find(dir => dir.id === currentDirectoryId) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectCurrentDirectory}
                              className="text-xs"
                            >
                              Select Current
                            </Button>
                          )}
                          {navigationStack.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={navigateBack}
                              className="text-xs"
                            >
                              <ArrowLeft size={14} className="mr-1" />
                              Back
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Breadcrumbs */}
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1 flex-wrap">
                        <button
                          onClick={async () => {
                            await fetchProductionAudioDirectories();
                            setNavigationStack([]);
                          }}
                          className="hover:text-gray-700 hover:underline cursor-pointer"
                        >
                          Production Audio
                        </button>
                        {navigationStack.map((item, index) => (
                          <span key={item.id} className="flex items-center">
                            <ChevronRight size={12} className="inline mx-1" />
                            <button
                              onClick={async () => {
                                // Navigate to this directory by rebuilding stack up to this point
                                const newStack = navigationStack.slice(0, index + 1);
                                if (newStack.length > 0) {
                                  const targetDir = newStack[newStack.length - 1];
                                  await navigateToDirectory(targetDir.id, targetDir.name);
                                  // Set stack to the truncated version
                                  setNavigationStack(newStack.slice(0, -1)); // Remove last item since navigateToDirectory adds it
                                }
                              }}
                              className="hover:text-gray-700 hover:underline cursor-pointer"
                            >
                              {item.name}
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {loadingDirectories ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="ml-2 text-sm text-gray-500">Loading directories...</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {/* Directories */}
                        {audioDirectories
                          .filter(item => item.type === 'directory')
                          .map((directory) => (
                            <div
                              key={directory.id}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50"
                            >
                              <div 
                                className="flex items-center flex-1 cursor-pointer"
                                onClick={() => navigateToDirectory(directory.id, directory.name)}
                              >
                                <Folder size={16} className="mr-2 text-blue-500" />
                                <span className="text-sm text-gray-700">{directory.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedDirectories.find(dir => dir.id === directory.id) && (
                                  <Check size={16} className="text-green-600" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDirectorySelection(directory.id, directory.name);
                                  }}
                                  className="h-6 px-2 text-xs"
                                  title={selectedDirectories.find(dir => dir.id === directory.id) ? "Deselect directory" : "Select directory"}
                                >
                                  {selectedDirectories.find(dir => dir.id === directory.id) ? "Selected" : "Select"}
                                </Button>
                                <ChevronRight size={16} className="text-gray-400 cursor-pointer" onClick={() => navigateToDirectory(directory.id, directory.name)} />
                              </div>
                            </div>
                          ))}
                        
                        {/* Audio Files */}
                        {audioDirectories
                          .filter(item => item.type === 'file' && item.mimeType?.startsWith('audio/'))
                          .map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50"
                            >
                              <div className="flex items-center flex-1">
                                <File size={16} className="mr-2 text-purple-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                {file.size && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({(parseInt(file.size) / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        
                        {/* Other Files */}
                        {audioDirectories
                          .filter(item => item.type === 'file' && !item.mimeType?.startsWith('audio/'))
                          .map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50"
                            >
                              <div className="flex items-center flex-1">
                                <File size={16} className="mr-2 text-gray-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                {file.size && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({(parseInt(file.size) / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        
                        {audioDirectories.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No items found
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Directory Summary */}
                    {!loadingDirectories && audioDirectories.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-4">
                            <span>
                              <Folder size={12} className="inline mr-1 text-blue-500" />
                              {audioDirectories.filter(item => item.type === 'directory').length} {audioDirectories.filter(item => item.type === 'directory').length === 1 ? 'directory' : 'directories'}
                            </span>
                            <span>
                              <File size={12} className="inline mr-1 text-purple-500" />
                              {audioDirectories.filter(item => item.type === 'file' && item.mimeType?.startsWith('audio/')).length} audio {audioDirectories.filter(item => item.type === 'file' && item.mimeType?.startsWith('audio/')).length === 1 ? 'file' : 'files'}
                            </span>
                            {audioDirectories.filter(item => item.type === 'file' && !item.mimeType?.startsWith('audio/')).length > 0 && (
                              <span>
                                <File size={12} className="inline mr-1 text-gray-500" />
                                {audioDirectories.filter(item => item.type === 'file' && !item.mimeType?.startsWith('audio/')).length} other {audioDirectories.filter(item => item.type === 'file' && !item.mimeType?.startsWith('audio/')).length === 1 ? 'file' : 'files'}
                              </span>
                            )}
                          </div>
                          <span className="font-medium">
                            Total: {audioDirectories.length} {audioDirectories.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Selected Directories */}
                    {selectedDirectories.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          Selected Directories ({selectedDirectories.length}):
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedDirectories.map((dir) => {
                            const pathSegments = dir.pathSegments || [];
                            return (
                              <div
                                key={dir.id}
                                className="flex items-start justify-between p-2 bg-white rounded text-xs border border-gray-200 hover:bg-gray-50"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center mb-1">
                                    <Folder size={12} className="mr-1 text-blue-500 flex-shrink-0" />
                                    <span className="text-gray-700 font-medium">{dir.name}</span>
                                  </div>
                                  <div className="text-gray-500 text-[10px] ml-4 flex items-center gap-1 flex-wrap">
                                    {pathSegments.map((segment, index) => (
                                      <span key={index} className="flex items-center">
                                        {segment.id !== null || index === 0 ? (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (segment.id === null) {
                                                await fetchProductionAudioDirectories();
                                                setNavigationStack([]);
                                              } else {
                                                await navigateToPathSegment(index, segment.id);
                                              }
                                            }}
                                            className="hover:text-gray-700 hover:underline cursor-pointer"
                                          >
                                            {segment.name}
                                          </button>
                                        ) : (
                                          <span>{segment.name}</span>
                                        )}
                                        {index < pathSegments.length - 1 && (
                                          <ChevronRight size={8} className="inline mx-0.5 text-gray-400" />
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeSelectedDirectory(dir.id);
                                  }}
                                  className="h-6 w-6 p-0 text-xs hover:bg-red-50 hover:text-red-600 flex-shrink-0 ml-2"
                                  title="Remove selection"
                                >
                                  ×
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Audio Check Results - Above Actions */}
              {audioCheckResults && (
                <div className={`mb-6 border rounded-lg p-4 ${audioCheckResults.missing_count === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-lg font-semibold ${audioCheckResults.missing_count === 0 ? 'text-green-800' : 'text-red-800'}`}>
                        Audio Check Results
                      </h3>
                      {audioCheckResults.missing_count === 0 ? (
                        <span className="text-green-700 font-medium">✓ All Audio Files Found</span>
                      ) : (
                        <span className="text-red-700 font-medium">✗ Missing Files Detected</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAudioCheckResults(null)}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                      title="Close results"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Total Targets:</span>
                        <span className="ml-2">{audioCheckResults.total_targets}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Available:</span>
                        <span className={`ml-2 font-semibold ${audioCheckResults.missing_count === 0 ? 'text-green-700' : 'text-green-600'}`}>
                          {audioCheckResults.available_count}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Missing:</span>
                        <span className={`ml-2 font-semibold ${audioCheckResults.missing_count > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                          {audioCheckResults.missing_count}
                        </span>
                      </div>
                      {audioCheckResults.langname && (
                        <div>
                          <span className="font-medium text-gray-700">Language:</span>
                          <span className="ml-2 capitalize">{audioCheckResults.langname}</span>
                        </div>
                      )}
                    </div>

                    {audioCheckResults.missing_count > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-red-800 mb-2">Missing Audio Files:</h4>
                        <div className="bg-white rounded border border-red-200 p-3 max-h-48 overflow-y-auto">
                          <div className="flex flex-wrap gap-2">
                            {audioCheckResults.missing.map((target: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium"
                              >
                                {target}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {audioCheckResults.checked_folders && audioCheckResults.checked_folders.length > 0 && (
                      <div className="mt-3 text-xs text-gray-600">
                        <span className="font-medium">Checked folders:</span> {audioCheckResults.checked_folders.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Job Status */}
              {syncJobStatus && (
                <div className={`mb-6 border rounded-lg p-4 ${
                  syncJobStatus.status === 'completed' ? 'bg-green-50 border-green-200' :
                  syncJobStatus.status === 'failed' ? 'bg-red-50 border-red-200' :
                  syncJobStatus.status === 'completed_with_errors' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-semibold ${
                      syncJobStatus.status === 'completed' ? 'text-green-800' :
                      syncJobStatus.status === 'failed' ? 'text-red-800' :
                      syncJobStatus.status === 'completed_with_errors' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      Sync Job Status
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSyncJobStatus(null);
                        setSyncJobId(null);
                        if (syncPollIntervalRef.current) {
                          clearInterval(syncPollIntervalRef.current);
                          syncPollIntervalRef.current = null;
                        }
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                      title="Close status"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`font-semibold ${
                        syncJobStatus.status === 'completed' ? 'text-green-700' :
                        syncJobStatus.status === 'failed' ? 'text-red-700' :
                        syncJobStatus.status === 'completed_with_errors' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {syncJobStatus.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Progress:</span>
                      <span className="font-semibold">{syncJobStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          syncJobStatus.status === 'completed' ? 'bg-green-500' :
                          syncJobStatus.status === 'failed' ? 'bg-red-500' :
                          syncJobStatus.status === 'completed_with_errors' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${syncJobStatus.progress}%` }}
                      ></div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Step:</span>
                      <span className="ml-2">{syncJobStatus.step}</span>
                    </div>
                    {syncJobStatus.error && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                        <strong>Error:</strong> {syncJobStatus.error}
                      </div>
                    )}
                    {syncJobStatus.result && syncJobStatus.status === 'completed' && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Audio Files Uploaded:</span>
                            <span className="ml-2 text-green-700 font-semibold">
                              {syncJobStatus.result.audio_files_uploaded || 0}
                            </span>
                          </div>
                          {syncJobStatus.result.audio_files_failed > 0 && (
                            <div>
                              <span className="font-medium">Failed:</span>
                              <span className="ml-2 text-red-700 font-semibold">
                                {syncJobStatus.result.audio_files_failed}
                              </span>
                            </div>
                          )}
                          {syncJobStatus.result.json_s3_key && (
                            <div className="col-span-2">
                              <span className="font-medium">JSON Key:</span>
                              <span className="ml-2 font-mono text-xs">{syncJobStatus.result.json_s3_key}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Checking Folder Exists */}
              {checkingFolderExists && (
                <div className="mb-6 border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-blue-600" size={16} />
                    <span className="text-sm text-blue-700">Checking if folder exists in S3...</span>
                  </div>
                </div>
              )}

              {/* Overwrite Confirmation Modal */}
              {showOverwriteConfirm && folderExistsInfo && (
                <div className="mb-6 border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Folder Already Exists</h3>
                      <p className="text-sm text-yellow-700 mb-2">
                        The folder <strong>{folderExistsInfo.folder_path}</strong> already exists in the S3 bucket.
                      </p>
                      {folderExistsInfo.object_count > 0 && (
                        <p className="text-xs text-yellow-600">
                          Contains {folderExistsInfo.object_count} object(s).
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowOverwriteConfirm(false);
                        setFolderExistsInfo(null);
                        setCheckingFolderExists(false);
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startSyncJob(newLanguage.trim().toLowerCase(), true)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      disabled={syncingToDev}
                    >
                      Overwrite and Continue
                    </Button>
                    <Button
                      onClick={() => {
                        setShowOverwriteConfirm(false);
                        setFolderExistsInfo(null);
                        setCheckingFolderExists(false);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Checking Prod Folder Exists */}
              {checkingProdFolderExists && (
                <div className="mb-6 border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-blue-600" size={16} />
                    <span className="text-sm text-blue-700">Checking if folder exists in production S3...</span>
                  </div>
                </div>
              )}

              {/* Production Confirmation Modal */}
              {showProdConfirmModal && (
                <div className="mb-6 border-2 border-red-400 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <Shield className="text-red-600" size={20} />
                        Production Deployment Warning
                      </h3>
                      <p className="text-sm text-red-700 mb-3">
                        <strong>WARNING:</strong> You are about to make changes to the language code folder <strong>{newLanguage.trim().toLowerCase()}</strong> on the <strong>production</strong> Feed The Monster bucket.
                      </p>
                      {prodFolderExistsInfo && prodFolderExistsInfo.exists && (
                        <p className="text-sm text-red-600 mb-3">
                          This folder already exists in production and will be overwritten.
                        </p>
                      )}
                      <p className="text-xs text-red-600 mb-4 font-semibold">
                        Please review this action carefully. Production changes affect live users.
                      </p>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-red-800 mb-2">
                          Type the language code to confirm: <strong>{newLanguage.trim().toLowerCase()}</strong>
                        </label>
                        <Input
                          type="text"
                          value={prodConfirmInput}
                          onChange={(e) => setProdConfirmInput(e.target.value)}
                          placeholder="Enter language code"
                          className="max-w-xs"
                          disabled={prodConfirmTimer > 0}
                        />
                      </div>
                      {prodConfirmTimer > 0 && (
                        <p className="text-sm text-red-600 mb-2">
                          Please wait <strong>{prodConfirmTimer}</strong> second{prodConfirmTimer !== 1 ? 's' : ''} before confirming...
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowProdConfirmModal(false);
                        setProdFolderExistsInfo(null);
                        setCheckingProdFolderExists(false);
                        setProdConfirmInput("");
                        if (prodTimerIntervalRef.current) {
                          clearInterval(prodTimerIntervalRef.current);
                          prodTimerIntervalRef.current = null;
                        }
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        startCopyToProdJob();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={
                        syncingToProd ||
                        prodConfirmTimer > 0 ||
                        prodConfirmInput.trim().toLowerCase() !== newLanguage.trim().toLowerCase()
                      }
                    >
                      Confirm and Copy to Production
                    </Button>
                    <Button
                      onClick={() => {
                        setShowProdConfirmModal(false);
                        setProdFolderExistsInfo(null);
                        setCheckingProdFolderExists(false);
                        setProdConfirmInput("");
                        if (prodTimerIntervalRef.current) {
                          clearInterval(prodTimerIntervalRef.current);
                          prodTimerIntervalRef.current = null;
                        }
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Prod Sync Job Status */}
              {prodSyncJobStatus && (
                <div className={`mb-6 border rounded-lg p-4 ${
                  prodSyncJobStatus.status === 'completed' ? 'bg-green-50 border-green-200' :
                  prodSyncJobStatus.status === 'failed' ? 'bg-red-50 border-red-200' :
                  prodSyncJobStatus.status === 'completed_with_errors' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-semibold ${
                      prodSyncJobStatus.status === 'completed' ? 'text-green-800' :
                      prodSyncJobStatus.status === 'failed' ? 'text-red-800' :
                      prodSyncJobStatus.status === 'completed_with_errors' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      Production Copy Job Status
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setProdSyncJobStatus(null);
                        setProdSyncJobId(null);
                        if (prodSyncPollIntervalRef.current) {
                          clearInterval(prodSyncPollIntervalRef.current);
                          prodSyncPollIntervalRef.current = null;
                        }
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                      title="Close status"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`font-semibold ${
                        prodSyncJobStatus.status === 'completed' ? 'text-green-700' :
                        prodSyncJobStatus.status === 'failed' ? 'text-red-700' :
                        prodSyncJobStatus.status === 'completed_with_errors' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {prodSyncJobStatus.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Progress:</span>
                      <span className="font-semibold">{prodSyncJobStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          prodSyncJobStatus.status === 'completed' ? 'bg-green-500' :
                          prodSyncJobStatus.status === 'failed' ? 'bg-red-500' :
                          prodSyncJobStatus.status === 'completed_with_errors' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${prodSyncJobStatus.progress}%` }}
                      ></div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Step:</span>
                      <span className="ml-2">{prodSyncJobStatus.step}</span>
                    </div>
                    {prodSyncJobStatus.error && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                        <strong>Error:</strong> {prodSyncJobStatus.error}
                      </div>
                    )}
                    {prodSyncJobStatus.result && prodSyncJobStatus.status === 'completed' && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Files Copied:</span>
                            <span className="ml-2 text-green-700 font-semibold">
                              {prodSyncJobStatus.result.copied_count || 0}
                            </span>
                          </div>
                          {prodSyncJobStatus.result.failed_count > 0 && (
                            <div>
                              <span className="font-medium">Failed:</span>
                              <span className="ml-2 text-red-700 font-semibold">
                                {prodSyncJobStatus.result.failed_count}
                              </span>
                            </div>
                          )}
                          {prodSyncJobStatus.result.total_files && (
                            <div>
                              <span className="font-medium">Total Files:</span>
                              <span className="ml-2 font-semibold">
                                {prodSyncJobStatus.result.total_files}
                              </span>
                            </div>
                          )}
                          {prodSyncJobStatus.result.folder_path && (
                            <div className="col-span-2">
                              <span className="font-medium">Folder Path:</span>
                              <span className="ml-2 font-mono text-xs">{prodSyncJobStatus.result.folder_path}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Actions</h3>
                  {/* S3 Connection Status */}
                  <div className="flex items-center gap-2">
                    {checkingS3 ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 className="animate-spin" size={14} />
                        <span>Checking S3...</span>
                      </div>
                    ) : s3Connected === true ? (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <div className="relative">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <span className="font-medium">S3 Connected</span>
                      </div>
                    ) : s3Connected === false ? (
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="font-medium">S3 Disconnected</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={async () => {
                      if (!selectedSheetId) {
                        alert("Please select a level gen file first");
                        return;
                      }
                      if (selectedDirectories.length === 0) {
                        alert("Please select at least one audio directory");
                        return;
                      }

                      setCheckingAudio(true);
                      setAudioCheckResults(null);

                      try {
                        const folderIds = selectedDirectories.map(dir => dir.id);
                        const response = await fetch('/api/audio/check', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            sheet_id: selectedSheetId,
                            audio_folder_ids: folderIds.length === 1 ? folderIds[0] : folderIds,
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Check failed');
                        }

                        const data = await response.json();
                        setAudioCheckResults(data);
                      } catch (error: any) {
                        console.error('Error checking audio:', error);
                        alert(`Error: ${error.message}`);
                      } finally {
                        setCheckingAudio(false);
                      }
                    }}
                    className="w-full"
                    disabled={!selectedSheetId || selectedDirectories.length === 0 || checkingAudio}
                  >
                    {checkingAudio ? "Checking Audio..." : "Check Audio"}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!newLanguage.trim()) {
                          alert("Please enter a language name first");
                          return;
                        }
                        if (!selectedSheetId) {
                          alert("Please select a level gen file first");
                          return;
                        }
                        if (selectedDirectories.length === 0) {
                          alert("Please select at least one audio directory");
                          return;
                        }

                        await handleSyncToDev();
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={!selectedSheetId || selectedDirectories.length === 0 || !s3Connected || syncingToDev || !newLanguage.trim()}
                      title={!s3Connected ? "S3 not connected" : !newLanguage.trim() ? "Please enter a language name" : ""}
                    >
                      {syncingToDev ? "Syncing..." : "Sync to Dev"}
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!newLanguage.trim()) {
                          alert("Please enter a language name first");
                          return;
                        }
                        await handleSyncToProd();
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!s3Connected || syncingToProd || !newLanguage.trim() || checkingProdFolderExists}
                      title={!s3Connected ? "S3 not connected" : !newLanguage.trim() ? "Please enter a language name" : ""}
                    >
                      {syncingToProd ? "Syncing..." : "Sync to Prod"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: "600px" }}>
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReloadPreview}
                    title="Reload preview"
                  >
                    <RotateCcw size={16} />
                  </Button>
                </div>
              </div>
              
              {/* Current Preview URL Display */}
              <div className="mb-3 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Preview URL:</label>
                <input
                  type="text"
                  value={previewURL}
                  readOnly
                  className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Phone-like container - expands to fill available space */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="border-8 border-gray-800 rounded-[2.5rem] p-2 bg-gray-800 shadow-2xl h-full flex items-center justify-center" style={{ width: "480px", maxWidth: "100%" }}>
                  <div className="bg-white rounded-[2rem] overflow-hidden w-full" style={{ height: "calc(100% - 16px)" }}>
                    {previewURL ? (
                      <iframe
                        key={previewReloadKey}
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
