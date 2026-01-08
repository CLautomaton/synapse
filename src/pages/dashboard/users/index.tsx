import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Link from "next/link";
import SideBarLayout from "@/components/sidebar-layout";
import { useState, useEffect } from "react";
import { User } from '@/types/user';
import { Role, RolesList } from '@/types/role';
import { App, AppsList } from '@/types/app';
import { Loader2, Shield, ArrowRightLeft, Boxes, Edit, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminDB } from "@/config/firebaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import getVersion from "@/utils/get-version";
import Modal from "react-modal";

// Set the app element for React Modal
if (typeof window !== 'undefined') {
  Modal.setAppElement('#__next');
}

interface Props {
  userRoleID: string | null;
  version: string;
}

export default function UsersManagement({ userRoleID, version }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RolesList>([]);
  const [apps, setApps] = useState<AppsList>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isProjectAccessModalOpen, setIsProjectAccessModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempProjectAccess, setTempProjectAccess] = useState<Record<string, string[]>>({});
  const [newLanguages, setNewLanguages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "authenticated" && userRoleID === "0") {
      fetchUsers();
      fetchRoles();
      fetchApps();
    }
  }, [status, userRoleID]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/get-users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
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

  const handleRoleChange = async (userId: string, newRoleID: string) => {
    // Don't update if it's the same role
    const currentUser = users.find(u => u.uid === userId);
    if (currentUser?.roleID === newRoleID) return;

    setUpdatingUserId(userId);
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          roleID: newRoleID,
        }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.uid === userId ? { ...user, roleID: newRoleID } : user
          )
        );
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update role');
        // Revert the change on error
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.uid === userId ? { ...user, roleID: currentUser?.roleID || '' } : user
          )
        );
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
      // Revert the change on error
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.uid === userId ? { ...user, roleID: currentUser?.roleID || '' } : user
        )
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleName = (roleID: string) => {
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

  const getAppName = (appID: string) => {
    const app = apps.find(a => a.appID === appID);
    return app?.name || appID;
  };

  const handleEditProjectAccess = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    if (user) {
      setEditingUserId(userId);
      setTempProjectAccess({ ...user.projectAccessIDs });
      setNewLanguages({});
      setIsProjectAccessModalOpen(true);
    }
  };

  const handleCloseProjectAccessModal = () => {
    setIsProjectAccessModalOpen(false);
    setEditingUserId(null);
    setTempProjectAccess({});
    setNewLanguages({});
  };

  const handleSaveProjectAccess = async (userId: string) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch('/api/users/update-project-access', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          projectAccessIDs: tempProjectAccess,
        }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.uid === userId ? { ...user, projectAccessIDs: tempProjectAccess } : user
          )
        );
        handleCloseProjectAccessModal();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update project access');
      }
    } catch (error) {
      console.error('Error updating project access:', error);
      alert('Failed to update project access');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleAccessTypeChange = (appID: string, type: 'unrestricted' | 'languages') => {
    setTempProjectAccess(prev => ({
      ...prev,
      [appID]: type === 'unrestricted' ? ['unrestricted'] : [],
    }));
  };

  const handleLanguageAdd = (appID: string, language: string) => {
    if (!language.trim()) return;
    setTempProjectAccess(prev => {
      const current = prev[appID] || [];
      if (current.includes(language.trim())) return prev;
      return {
        ...prev,
        [appID]: [...current.filter(l => l !== 'unrestricted'), language.trim()],
      };
    });
  };

  const handleLanguageRemove = (appID: string, language: string) => {
    setTempProjectAccess(prev => ({
      ...prev,
      [appID]: (prev[appID] || []).filter(l => l !== language),
    }));
  };

  const isUnrestricted = (appID: string) => {
    return tempProjectAccess[appID]?.includes('unrestricted') || false;
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp with toDate method
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString();
    }
    
    // Handle Date object
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    
    // Handle ISO string
    if (typeof date === 'string') {
      try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleString();
        }
      } catch (e) {
        // Invalid date string
      }
    }
    
    // Handle Firestore Timestamp serialized format (has _seconds property)
    if (date._seconds) {
      const dateObj = new Date(date._seconds * 1000);
      return dateObj.toLocaleString();
    }
    
    // Handle timestamp number
    if (typeof date === 'number') {
      const dateObj = new Date(date);
      return dateObj.toLocaleString();
    }
    
    return 'N/A';
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
    return <p>Loading...</p>;
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  // Check if user is unassigned (roleID "4" or null)
  if (!userRoleID || userRoleID === "4") {
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
          <div className="flex items-center justify-center h-screen">
            <div className="text-center max-w-md mx-auto p-8">
              <Shield className="mx-auto h-16 w-16 text-gray-400 mb-6" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">Role Assignment Required</h2>
              <p className="text-gray-600 mb-2">
                Your account does not have a role assigned yet.
              </p>
              <p className="text-gray-600">
                Please reach out to a Content Editor or Admin to assign you a role and permissions.
              </p>
            </div>
          </div>
        }
      />
    );
  }

  if (userRoleID !== "0") {
    return (
      <SideBarLayout
        sidebar={<div></div>}
        main={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Access Denied</h2>
              <p className="text-gray-500">You need admin privileges to access this page.</p>
            </div>
          </div>
        }
      />
    );
  }

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
                  className={`block py-2 mb-2 px-3 rounded ${
                    router.pathname === "/dashboard" ? "bg-gray-500" : "bg-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <ArrowRightLeft size={20} className="mr-2" />
                    <span className="text-sm">App Flows</span>
                  </div>
                </Link>
              )}
              <Link
                href="/dashboard"
                className={`block py-2 mb-2 px-3 rounded ${
                  router.pathname === "/dashboard" ? "bg-gray-500" : "bg-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <Boxes size={20} className="mr-2" />
                  <span className="text-sm">CL Content</span>
                </div>
              </Link>
              {userRoleID === "0" && (
                <Link
                  href="/dashboard/users"
                  className={`block py-2 mb-2 px-3 rounded ${
                    router.pathname === "/dashboard/users" ? "bg-gray-500" : "bg-gray-700"
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">Roles & Permissions</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Surname
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Access IDs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => {
                      const isUpdating = updatingUserId === user.uid;

                      return (
                        <tr key={user.uid}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.surname}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <select
                                value={user.roleID}
                                onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                                disabled={isUpdating}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {roles.map((role) => (
                                  <option key={role.roleID} value={role.roleID}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs">
                              {Object.keys(user.projectAccessIDs || {}).length > 0 ? (
                                <div className="space-y-1">
                                  {Object.entries(user.projectAccessIDs || {}).map(([appID, values]) => {
                                    const appName = getAppName(appID);
                                    const isUnrestricted = values.includes('unrestricted');
                                    const languages = values.filter(v => v !== 'unrestricted');
                                    
                                    return (
                                      <div key={appID} className="flex items-start gap-2">
                                        <span className="font-medium text-xs">{appName}:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {isUnrestricted ? (
                                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                              Unrestricted
                                            </span>
                                          ) : (
                                            languages.map((lang) => (
                                              <span
                                                key={lang}
                                                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                              >
                                                {lang}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400">None</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProjectAccess(user.uid)}
                                className="mt-2"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createDate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal for editing project access */}
          <Modal
            isOpen={isProjectAccessModalOpen}
            onRequestClose={handleCloseProjectAccessModal}
            style={{
              content: {
                position: "absolute",
                top: "50%",
                left: "50%",
                right: "auto",
                bottom: "auto",
                transform: "translate(-50%, -50%)",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "80vh",
                height: "auto",
                borderRadius: "10px",
                padding: "20px",
                backgroundColor: "#fff",
                overflowY: "auto",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              },
              overlay: {
                backgroundColor: "rgba(0, 0, 0, 0.6)",
              },
            }}
            contentLabel="Edit Project Access"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Edit Project Access</h2>
                <button
                  onClick={handleCloseProjectAccessModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {editingUserId && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    User: {users.find(u => u.uid === editingUserId)?.name} {users.find(u => u.uid === editingUserId)?.surname}
                  </p>
                  <p className="text-xs text-gray-500">
                    {users.find(u => u.uid === editingUserId)?.email}
                  </p>
                </div>
              )}

              <div className="space-y-4 flex-1 overflow-y-auto">
                {apps.map((app) => {
                  const access = tempProjectAccess[app.appID] || [];
                  const unrestricted = access.includes('unrestricted');
                  const languages = access.filter(l => l !== 'unrestricted');
                  const newLanguage = newLanguages[app.appID] || '';

                  return (
                    <div key={app.appID} className="border p-4 rounded-lg">
                      <div className="font-medium text-base mb-3">{app.name}</div>
                      <div className="space-y-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            checked={unrestricted}
                            onChange={() => handleAccessTypeChange(app.appID, 'unrestricted')}
                            className="mr-2"
                          />
                          <span className="text-sm">Unrestricted</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            checked={!unrestricted}
                            onChange={() => handleAccessTypeChange(app.appID, 'languages')}
                            className="mr-2"
                          />
                          <span className="text-sm">Languages</span>
                        </label>
                        {!unrestricted && (
                          <div className="ml-6 space-y-2 mt-2">
                            {languages.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {languages.map((lang) => (
                                  <div key={lang} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    <span className="text-sm">{lang}</span>
                                    <button
                                      onClick={() => handleLanguageRemove(app.appID, lang)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="Add language"
                                value={newLanguage}
                                onChange={(e) => setNewLanguages(prev => ({ ...prev, [app.appID]: e.target.value }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleLanguageAdd(app.appID, newLanguage);
                                    setNewLanguages(prev => {
                                      const updated = { ...prev };
                                      delete updated[app.appID];
                                      return updated;
                                    });
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  handleLanguageAdd(app.appID, newLanguage);
                                  setNewLanguages(prev => {
                                    const updated = { ...prev };
                                    delete updated[app.appID];
                                    return updated;
                                  });
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  onClick={() => editingUserId && handleSaveProjectAccess(editingUserId)}
                  disabled={!editingUserId || updatingUserId === editingUserId}
                  className="flex-1"
                >
                  {updatingUserId === editingUserId ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseProjectAccessModal}
                  disabled={updatingUserId === editingUserId}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      }
    />
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  // Get user's role
  const userId = session.user?.id;
  let userRoleID: string | null = null;

  if (userId) {
    try {
      const userDoc = await adminDB.collection('users').doc(userId).get();
      userRoleID = userDoc.data()?.roleID || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  }

  const version = getVersion();

  return {
    props: {
      userRoleID,
      version,
    },
  };
};

