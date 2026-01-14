import { GoogleOAuthProvider } from "@react-oauth/google";
import { ReactNode } from "react";

interface GoogleDriveProviderProps {
  children: ReactNode;
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function GoogleDriveProvider({ children }: GoogleDriveProviderProps) {
  if (!clientId) {
    // If no client ID is configured, just render children without the provider
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
