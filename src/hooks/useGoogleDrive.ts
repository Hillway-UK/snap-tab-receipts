import { useState, useEffect, useCallback } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { 
  getOrCreateFolder, 
  uploadToDrive, 
  fetchImageAsBlob, 
  getFolderLink,
  shareFolderWithEmail,
  searchFileByName,
  deleteFile 
} from "@/lib/google-drive";

const STORAGE_KEY = "google_drive_token";
const USER_KEY = "google_drive_user";
const FOLDER_ID_KEY = "google_drive_folder_id";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

interface UseGoogleDriveReturn {
  isConnected: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  user: GoogleUser | null;
  connect: () => void;
  disconnect: () => void;
  uploadReceipt: (imageUrl: string, fileName: string) => Promise<string | null>;
  openFolder: () => Promise<void>;
  shareFolder: (email: string, role: "reader" | "writer") => Promise<void>;
  deleteReceipt: (vendor: string | null, receiptDate: string | null) => Promise<void>;
}

// Separate hook that only runs when client ID is configured
function useGoogleDriveInternal(): UseGoogleDriveReturn {
  const [accessToken, setAccessToken] = useState<string | null>(() => 
    localStorage.getItem(STORAGE_KEY)
  );
  const [user, setUser] = useState<GoogleUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [folderId, setFolderId] = useState<string | null>(() =>
    localStorage.getItem(FOLDER_ID_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserInfo = useCallback(async (token: string) => {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(FOLDER_ID_KEY);
        setAccessToken(null);
        setUser(null);
        setFolderId(null);
        return;
      }
      
      const userInfo = await response.json();
      const userData: GoogleUser = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
      
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to fetch user info:", error);
    }
  }, []);

  useEffect(() => {
    if (accessToken && !user) {
      fetchUserInfo(accessToken);
    }
  }, [accessToken, user, fetchUserInfo]);

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      setAccessToken(response.access_token);
      localStorage.setItem(STORAGE_KEY, response.access_token);
      await fetchUserInfo(response.access_token);
    },
    onError: (error) => {
      console.error("Google login failed:", error);
    },
    scope: "https://www.googleapis.com/auth/drive.file",
  });

  const connect = useCallback(() => {
    login();
  }, [login]);

  const disconnect = useCallback(() => {
    googleLogout();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(FOLDER_ID_KEY);
    setAccessToken(null);
    setUser(null);
    setFolderId(null);
  }, []);

  const ensureFolderId = useCallback(async (): Promise<string> => {
    if (!accessToken) throw new Error("Not connected to Google Drive");
    
    if (folderId) return folderId;
    
    const id = await getOrCreateFolder(accessToken);
    setFolderId(id);
    localStorage.setItem(FOLDER_ID_KEY, id);
    return id;
  }, [accessToken, folderId]);

  const uploadReceipt = useCallback(
    async (imageUrl: string, fileName: string): Promise<string | null> => {
      if (!accessToken) return null;

      setIsLoading(true);
      try {
        // Validate token first
        const tokenCheck = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (!tokenCheck.ok) {
          disconnect();
          throw new Error("Session expired. Please reconnect to Google Drive.");
        }

        const currentFolderId = await ensureFolderId();
        const blob = await fetchImageAsBlob(imageUrl);
        const file = await uploadToDrive(accessToken, blob, fileName, currentFolderId);
        return file.webViewLink || file.id;
      } catch (error: any) {
        console.error("Failed to upload to Google Drive:", error);
        if (error.message?.includes("401") || error.message?.includes("Invalid Credentials") || error.message?.includes("unauthorized")) {
          disconnect();
          throw new Error("Session expired. Please reconnect to Google Drive.");
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, disconnect, ensureFolderId]
  );

  const openFolder = useCallback(async () => {
    if (!accessToken) throw new Error("Not connected to Google Drive");

    setIsLoading(true);
    try {
      const currentFolderId = await ensureFolderId();
      const link = await getFolderLink(accessToken, currentFolderId);
      window.open(link, "_blank");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, ensureFolderId]);

  const shareFolder = useCallback(
    async (email: string, role: "reader" | "writer") => {
      if (!accessToken) throw new Error("Not connected to Google Drive");

      setIsLoading(true);
      try {
        const currentFolderId = await ensureFolderId();
        await shareFolderWithEmail(accessToken, currentFolderId, email, role);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, ensureFolderId]
  );

  const deleteReceipt = useCallback(
    async (vendor: string | null, receiptDate: string | null) => {
      if (!accessToken || !folderId) return;

      try {
        // Search for the file using the naming pattern used during upload
        const searchTerm = `receipt_${vendor || "unknown"}_${receiptDate || ""}`;
        const fileId = await searchFileByName(accessToken, searchTerm, folderId);
        
        if (fileId) {
          await deleteFile(accessToken, fileId);
        }
      } catch (error) {
        console.warn("Failed to delete from Google Drive:", error);
        // Don't throw - this is non-blocking
      }
    },
    [accessToken, folderId]
  );

  return {
    isConnected: !!accessToken && !!user,
    isLoading,
    isConfigured: true,
    user,
    connect,
    disconnect,
    uploadReceipt,
    openFolder,
    shareFolder,
    deleteReceipt,
  };
}

// Main hook that checks if Google OAuth is configured
export function useGoogleDrive(): UseGoogleDriveReturn {
  // If no client ID, return a stub that indicates not configured
  if (!CLIENT_ID) {
    return {
      isConnected: false,
      isLoading: false,
      isConfigured: false,
      user: null,
      connect: () => console.warn("Google Drive not configured - missing VITE_GOOGLE_CLIENT_ID"),
      disconnect: () => {},
      uploadReceipt: async () => null,
      openFolder: async () => {},
      shareFolder: async () => {},
      deleteReceipt: async () => {},
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGoogleDriveInternal();
}
