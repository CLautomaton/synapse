import { useSession, getSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Link from "next/link";
import SideBarLayout from "@/components/sidebar-layout";
import getVersion from "@/utils/get-version";
import fs from "fs";
import path from "path";
import Modal from "react-modal";
import { ArrowRightLeft, Boxes, Edit, ExternalLink, Frame, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminDB } from "@/config/firebaseAdmin";
import { PuffLoader, PulseLoader } from "react-spinners";

interface LayoutProps {
  children: React.ReactNode;
}

export interface AppFlowEntry {
  id: string;
  flow: NextEntry[];
}

export interface NextEntry {
  url: string;
  conditional: number;
  redirect?: boolean;
}

interface Props {
  entries: AppFlowEntry[];
  version: string;
}

const DashboardAppFlows: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">App Flows</h2>
      {children}
    </div>
  );
};

export default function AdminPanel({ version, entries: initialEntries }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<AppFlowEntry | null>(null);
  const [updatedFlow, setUpdatedFlow] = useState<AppFlowEntry | null>(null);
  const [isNewFlow, setIsNewFlow] = useState(false);
  const [entries, setEntries] = useState(initialEntries);
  const [isLoading, setIsLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const isActive = router.pathname === "/dashboard";

  const [currentlyToggledMainContent, setCurrentlyToggledMainContent] = useState<"app-flows" | "cl-content">(
    "app-flows"
  );

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const openModal = (flow: AppFlowEntry | null = null) => {
    setIsNewFlow(!flow); // If there's no flow, we're adding a new one
    setCurrentFlow(flow);
    setUpdatedFlow(flow ? flow : { id: "", flow: [{ url: "", conditional: 0, redirect: false }] });
    setIsModalOpen(true);
  };

  const handleInputChange = (index: number, field: keyof NextEntry, value: string | number | boolean) => {
    if (!updatedFlow) return;
    console.log("Updating flow");
    const updatedFlowEntries = [...updatedFlow.flow];
    updatedFlowEntries[index] = { ...updatedFlowEntries[index], [field]: value };
    setUpdatedFlow({ ...updatedFlow, flow: updatedFlowEntries });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentFlow(null);
  };

  const saveFlow = async () => {
    if (!updatedFlow) return;

    if (updatedFlow.id.trim() === "") {
      alert("Flow ID is required. Please enter a valid ID.");
      return;
    }

    // Check if the flow ID already exists
    if (!isEditing) {
      const existingFlows = await fetch("/api/flows/get-flows");
      if (existingFlows.ok) {
        const existingFlowsData = await existingFlows.json();
        const flowExists = existingFlowsData.flows.some((flow: AppFlowEntry) => flow.id === updatedFlow.id);
        if (flowExists) {
          alert("A flow with this ID already exists. Please choose a different ID.");
          return;
        }
      } else {
        console.error("Failed to fetch existing flows");
        alert("Unable to verify flow ID uniqueness. Please try again later.");
        return;
      }
    }

    // Ensure the flow ID is Firebase-safe
    const sanitizedFlowId = updatedFlow.id.replace(/[^a-zA-Z0-9-_]/g, "");
    if (sanitizedFlowId !== updatedFlow.id) {
      alert(
        "The flow ID has been sanitized to ensure it's Firebase-safe. It now contains only letters, numbers, dashes, and underscores."
      );
      setUpdatedFlow({ ...updatedFlow, id: sanitizedFlowId });
      return;
    }

    // Check if the sanitized ID is empty
    if (sanitizedFlowId.trim() === "") {
      alert("Flow ID is required and must contain at least one valid character (letter, number, dash, or underscore).");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/flows/add-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flow: updatedFlow }),
      });

      if (!response.ok) {
        throw new Error("Failed to save flow");
      }

      const result = await response.json();
      console.log(result.message);

      // Refetch entries after successful save
      const updatedEntriesResponse = await fetch("/api/flows/get-flows");
      if (updatedEntriesResponse.ok) {
        const updatedEntriesData = await updatedEntriesResponse.json();
        setEntries(updatedEntriesData.flows);
      } else {
        console.error("Failed to refetch entries");
      }

      closeModal();
    } catch (error) {
      console.error("Error saving flow:", error);
      // Handle error (e.g., show an error message to the user)
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlowIdChange = (value: string) => {
    if (updatedFlow) {
      const updatedValue = value.replace(/\s+/g, "-");
      setUpdatedFlow({ ...updatedFlow, id: updatedValue });
    }
  };

  const addNewUrlEntry = () => {
    if (updatedFlow) {
      setUpdatedFlow({
        ...updatedFlow,
        flow: [...updatedFlow.flow, { url: "", conditional: 0 }],
      });
    }
  };

  const deleteFlow = async (id: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/flows/delete-flow?flowId=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete flow");
      }

      const result = await response.json();
      console.log(result.message);

      // Update the local state
      setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error("Error deleting flow:", error);
      // Handle error (e.g., show an error message to the user)
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditToggle = (id: string) => {
    const flowToEdit = entries.find((entry) => entry.id === id);
    if (flowToEdit) {
      setUpdatedFlow(flowToEdit);
    } else {
      console.error(`Flow with id ${id} not found`);
    }
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Existing saveFlow function will be used for both adding and editing

  const deleteUrlEntry = (index: number) => {
    // Create a copy of the current flow entries
    const updatedFlowEntries = [...updatedFlow!.flow];

    // Remove the entry at the specified index
    updatedFlowEntries.splice(index, 1);

    // Update the state with the new flow entries
    setUpdatedFlow({
      ...updatedFlow!,
      flow: updatedFlowEntries,
    });
  };

  const logOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/signin");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleMainContent = (content: string) => {
    setCurrentlyToggledMainContent(content as "app-flows" | "cl-content");
  };

  return (
    <SideBarLayout
      sidebar={
        <div className="flex flex-col h-screen justify-center">
          <div className="flex-grow">
            <h1 className="text-md font-bold mb-6">Synapse Dashboard</h1>
            {session && (
              <div className="mb-6 p-2 bg-white shadow-lg rounded-lg border border-gray-200">
                <div className="flex items-center justify-center flex-col">
                  {/* Optional: Include an avatar or profile picture */}
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                    {session.user?.name?.charAt(0)}
                  </div>
                  <div className="m-0 p-0">
                    {/* <p className="text-sm text-gray-500">User:</p> */}
                    <p className="text-md font-semibold text-gray-900">{session.user?.name}</p>
                    <p className="text-[12px] text-gray-600">{session.user?.email}</p>
                  </div>
                </div>
              </div>
            )}
            <nav>
              <Link
                href=""
                onClick={() => {
                  toggleMainContent("app-flows");
                }}
                className={`block py-2 mb-2 px-3 rounded ${
                  currentlyToggledMainContent === "app-flows" ? "bg-gray-500" : "bg-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <ArrowRightLeft size={20} className="mr-2" />
                  <span className="text-sm">App Flows</span>
                </div>
              </Link>
              <Link
                href=""
                onClick={() => {
                  toggleMainContent("cl-content");
                }}
                className={`block py-2 mb-2 px-3 rounded ${
                  currentlyToggledMainContent === "cl-content" ? "bg-gray-500" : "bg-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <Boxes size={20} className="mr-2" />
                  <span className="text-sm">CL Content</span>
                </div>
              </Link>
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
        currentlyToggledMainContent === "app-flows" ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold">App Flows</h2>
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-4">Entries</h3>
              <ul className="space-y-4">
                {entries!.map((entry) => (
                  <li key={entry.id} className="border p-4 rounded-lg relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-gray-100 rounded-lg p-2">
                        <p className="flex-grow">
                          <strong>App Flow:</strong> {entry.id}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${entry.id}`)}
                          className="ml-2 p-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors duration-200"
                          title="Copy App Flow URL"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <ul className="mt-2 space-y-2">
                        {entry.flow.map((nextEntry, index) => (
                          <li key={index} className="border border-gray-300 p-2 rounded-lg shadow-sm">
                            <p>
                              <strong className="text-gray-500">URL</strong>
                            </p>
                            <a
                              href={nextEntry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative inline-flex items-center overflow-hidden rounded-md bg-gradient-to-r from-blue-500 to-purple-600 p-1 text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-700 hover:shadow-lg"
                            >
                              <span className="relative px-3 py-1 text-sm font-medium transition-all duration-300 group-hover:text-white">
                                {new URL(nextEntry.url).hostname}
                              </span>
                              <br />
                              {new URL(nextEntry.url).searchParams.toString() && (
                                <span className="relative px-3 py-1 text-sm font-medium transition-all duration-300 group-hover:text-white">
                                  {Array.from(new URL(nextEntry.url).searchParams.entries()).map(
                                    ([key, value], index) => (
                                      <span key={index} className="mx-1">
                                        {key}={value}
                                      </span>
                                    )
                                  )}
                                </span>
                              )}
                              <span className="relative ml-1 mr-1">
                                {nextEntry.redirect ? (
                                  <ExternalLink
                                    size={14}
                                    className="transition-all duration-300 group-hover:text-white"
                                  />
                                ) : (
                                  <Frame size={14} className="transition-all duration-300 group-hover:text-white" />
                                )}
                              </span>
                            </a>
                            <p className="mt-2">
                              <strong className="text-gray-500">Conditional</strong>
                            </p>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                              {nextEntry.conditional}
                              <ArrowRightLeft className="w-4 h-4 ml-2" />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Edit and Delete buttons */}
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button
                        onClick={() => handleEditToggle(entry.id)}
                        className="p-2 text-yellow-500 border-2 border-yellow-500 rounded-full hover:bg-yellow-500 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transform hover:scale-110"
                        aria-label="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFlow(entry.id)}
                        className="p-2 text-red-500 border-2 border-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transform hover:scale-110"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Button to add a new flow */}
            <div className="mt-4">
              <button onClick={() => openModal(null)} className="p-2 bg-blue-500 text-white rounded flex items-center">
                <Plus className="mr-2" />
                Add New Flow
              </button>
            </div>

            {/* Modal for adding a new flow */}
            <Modal
              isOpen={isModalOpen}
              onRequestClose={closeModal}
              className="max-w-4xl w-full mx-auto mt-20 bg-white rounded-xl shadow-2xl"
              overlayClassName="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">
                    {isEditing ? "Edit" : "New"} App Flow (Entries: {updatedFlow?.flow.length})
                  </h2>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 transition-colors">
                    <X size={28} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label htmlFor="flowId" className="block text-lg font-medium text-gray-700 mb-2">
                      App Flow ID (Unique, used as a <b>/flow</b> route)
                      <span className="text-amber-700 text-sm">*required</span>
                    </label>
                    <input
                      type="text"
                      id="flowId"
                      value={updatedFlow?.id}
                      placeholder="App-Flow-Id"
                      onChange={(e) => handleFlowIdChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto pr-2 space-y-6">
                    {updatedFlow?.flow.map((nextEntry, index) => (
                      <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200 relative">
                        <h3 className="text-xl font-semibold mb-4 text-indigo-600">Entry {index + 1}</h3>
                        <div className="space-y-4">
                          <label htmlFor={`url-${index}`} className="block text-sm font-medium text-gray-700">
                            URL
                          </label>
                          <input
                            type="url"
                            value={nextEntry.url}
                            onChange={(e) => handleInputChange(index, "url", e.target.value)}
                            placeholder="URL"
                            className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                            required
                          />
                          <label htmlFor={`conditional-${index}`} className="block text-sm font-medium text-gray-700">
                            Conditional
                          </label>
                          <input
                            type="number"
                            value={nextEntry.conditional}
                            onChange={(e) => handleInputChange(index, "conditional", parseInt(e.target.value))}
                            placeholder="Conditional"
                            className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                          />
                          <div className="flex items-center space-x-3">
                            <label htmlFor={`redirect-${index}`} className="flex items-center cursor-pointer">
                              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <input
                                  type="checkbox"
                                  id={`redirect-${index}`}
                                  checked={nextEntry.redirect}
                                  onChange={(e) => handleInputChange(index, "redirect", e.target.checked)}
                                  className="sr-only"
                                />
                                <div className="w-12 h-6 bg-gray-300 rounded-full shadow-inner">
                                  <div
                                    className={`absolute left-0 w-6 h-6 rounded-full shadow transform transition-transform duration-300 ease-in-out ${
                                      nextEntry.redirect ? "translate-x-6 bg-indigo-500" : "translate-x-0 bg-white"
                                    }`}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {nextEntry.redirect
                                  ? "Redirect Enabled (Opening this URL in a new tab.)"
                                  : "Redirect Disabled"}
                              </span>
                            </label>
                          </div>
                        </div>
                        <Button
                          onClick={() => deleteUrlEntry(index)}
                          className="absolute top-2 right-2 bg-zinc-200 text-red-400 hover:text-red-500 hover:bg-zinc-300"
                          style={{ padding: "1rem" }}
                        >
                          <Trash2 size={24} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addNewUrlEntry}
                    className="w-full py-3 px-4 flex items-center justify-center text-lg font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                  >
                    <Plus size={24} className="mr-2" />
                    Add New URL Entry
                  </button>
                  <div className="flex space-x-4">
                    <Button
                      disabled={updatedFlow?.flow.length === 0 || isLoading}
                      onClick={saveFlow}
                      className="flex-1 py-3 px-4 flex text-lg items-center justify-center font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300"
                    >
                      {isLoading ? (
                        <PulseLoader color="#ffffff" size={10} />
                      ) : (
                        <>
                          <Save size={24} className="mr-2" />
                          Save Flow
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={closeModal}
                      className="flex-1 py-3 px-4 text-lg font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </Modal>

            {/* Global loading overlay */}
            {isLoading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center text-slate-300 justify-center z-50">
                <p className="text-2xl">Working on it! 🎉</p>
                <br />
                <PuffLoader color="#ffffff" size={100} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold">App Flows</h2>
            <div className="bg-white shadow-md rounded-lg p-6 h-full flex flex-wrap justify-center gap-4 transition-shadow duration-500 ease-in-out">
              <div className="max-w-sm rounded-lg overflow-hidden shadow-lg bg-white m-4 relative hover:shadow-xl transition-shadow duration-500 ease-in-out cursor-pointer" style={{width: '100%', height: 'auto', minHeight: '300px'}} onClick={() => console.log("Curious Reader Web Player")}> {/* Reduced width for better visibility */}
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover absolute">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#ff9a9e" />
                      <stop offset="100%" stop-color="#fecfef" />
                    </linearGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#gradient)" rx="10" />
                </svg>
                <div className="p-6 relative flex flex-col items-start justify-start" style={{height: 'auto', minHeight: '300px'}}> {/* Changed flex direction to column and alignment to start */}
                  <div className="absolute bottom-0 left-0 bg-white bg-opacity-50 p-4 rounded-t-lg w-full flex items-start justify-center" style={{height: 'auto', minHeight: '100px'}}> {/* Changed position to bottom and adjusted styles */}
                    <h2 className="text-base font-medium text-gray-900 text-left">Curious Reader Web Player</h2> {/* Changed text alignment to left */}
                  </div>
                </div>
                <div className="flex justify-center mt-4 mb-4 absolute bottom-0 left-0 w-full">
                  <span className="mr-2 bg-green-200 text-green-600 py-1 px-2 rounded flex items-center justify-center text-xs">
                    dev
                    <span className="ml-1 w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  </span>
                  <span className="mr-2 bg-green-200 text-green-600 py-1 px-2 rounded flex items-center justify-center text-xs">
                    prod
                    <span className="ml-1 w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  </span>
                </div>
              </div>
              <div className="max-w-sm rounded-lg overflow-hidden shadow-lg bg-white m-4 relative hover:shadow-xl transition-shadow duration-500 ease-in-out cursor-pointer" style={{width: '100%', height: 'auto', minHeight: '300px'}} onClick={() => console.log("Assessment")}> {/* Reduced width for better visibility */}
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover absolute">
                  <defs>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#c9e4ca" />
                      <stop offset="100%" stop-color="#e4f0e4" />
                    </linearGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#gradient2)" rx="10" />
                </svg>
                <div className="p-6 relative flex flex-col items-start justify-start" style={{height: 'auto', minHeight: '300px'}}> {/* Changed flex direction to column and alignment to start */}
                  <div className="absolute bottom-0 left-0 bg-white bg-opacity-50 p-4 rounded-t-lg w-full flex items-start justify-center" style={{height: 'auto', minHeight: '100px'}}> {/* Changed position to bottom and adjusted styles */}
                    <h2 className="text-base font-medium text-gray-900 text-left">Assessment</h2> {/* Changed text alignment to left */}
                  </div>
                </div>
                <div className="flex justify-center mt-4 mb-4 absolute bottom-0 left-0 w-full">
                  <span className="mr-2 bg-green-200 text-green-600 py-1 px-2 rounded flex items-center justify-center text-xs">
                    dev
                    <span className="ml-1 w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  </span>
                  <span className="mr-2 bg-green-200 text-green-600 py-1 px-2 rounded flex items-center justify-center text-xs">
                    prod
                    <span className="ml-1 w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  </span>
                </div>
              </div>
              <div className="max-w-sm rounded-lg overflow-hidden shadow-lg bg-white m-4 relative hover:shadow-xl transition-shadow duration-500 ease-in-out cursor-pointer" style={{width: '100%', height: 'auto', minHeight: '300px'}} onClick={() => console.log("Feed The Monster")}> {/* Reduced width for better visibility */}
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover absolute">
                  <defs>
                    <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#87ceeb" />
                      <stop offset="100%" stop-color="#add8e6" />
                    </linearGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#gradient3)" rx="10" />
                </svg>
                <div className="p-6 relative flex flex-col items-start justify-start" style={{height: 'auto', minHeight: '300px'}}> {/* Changed flex direction to column and alignment to start */}
                  <div className="absolute bottom-0 left-0 bg-white bg-opacity-50 p-4 rounded-t-lg w-full flex items-start justify-center" style={{height: 'auto', minHeight: '100px'}}> {/* Changed position to bottom and adjusted styles */}
                    <h2 className="text-base font-medium text-gray-900 text-left">Feed The Monster</h2> {/* Changed text alignment to left */}
                  </div>
                </div>
                <div className="flex justify-center mt-4 mb-4 absolute bottom-0 left-0 w-full">
                  <span className="mr-2 bg-green-200 text-green-600 py-1 px-2 rounded flex items-center justify-center text-xs">
                    dev
                    <span className="ml-1 w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  </span>
                  <span className="mr-2 bg-green-200 text-green-600 py-1 px-2 rounded flex items-center justify-center text-xs">
                    prod
                    <span className="ml-1 w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  </span>
                </div>
              </div>
            </div>
            </div>
        )
      }
    />
  );
}

const customStyles = {
  content: {
    position: "absolute",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    width: "90%",
    maxWidth: "700px",
    minHeight: "50vh", // Ensures the modal has a minimum height of 50% of the viewport height
    maxHeight: "80vh", // Ensures the modal does not exceed viewport height
    height: "auto", // Allow content to dictate height
    borderRadius: "10px",
    padding: "20px",
    backgroundColor: "#fff",
    overflowY: "auto", // Allow vertical scrolling if content exceeds height
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column", // Align children vertically
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
};

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

  try {
    const docRef = adminDB.collection("ContentMover").doc("appFlowsDoc");
    const docSnapshot = await docRef.get();

    let entries: AppFlowEntry[] = [];
    if (docSnapshot.exists) {
      const data = docSnapshot.data();
      entries = data?.appFlows || [];
    } else {
      console.error("No such document!");
    }

    return { props: { session, version, entries } };
  } catch (error) {
    console.error(error);
    return { props: { session, version, entries: [] } };
  }
};
