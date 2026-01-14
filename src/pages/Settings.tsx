import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/supabase-db";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Download, Cloud, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Link } from "react-router-dom";

const Settings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected, isLoading: driveLoading, isConfigured, user: driveUser, connect, disconnect } = useGoogleDrive();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: roleData } = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();
        setUserRole(roleData?.role || null);
      } else {
        navigate("/");
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      navigate("/");
    }
  };

  const handleConnectDrive = () => {
    connect();
    toast({
      title: "Connecting to Google Drive",
      description: "Please sign in with your Google account",
    });
  };

  const handleDisconnectDrive = () => {
    disconnect();
    toast({
      title: "Disconnected",
      description: "Google Drive has been disconnected",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account</p>
        </div>

        {/* User Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant={userRole === "owner" ? "default" : "secondary"}>
                {userRole === "owner" ? "Owner" : userRole === "viewer" ? "Viewer" : "No Role"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>What you can do in SnapTab</CardDescription>
          </CardHeader>
          <CardContent>
            {userRole === "owner" ? (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Capture and upload receipts
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Edit receipt details
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Delete receipts
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Export and download receipts
                </li>
              </ul>
            ) : userRole === "viewer" ? (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  View all receipts
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Download receipt images
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Mark receipts as reconciled
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Export to CSV
                </li>
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No role assigned. Contact the owner to get access.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Google Drive Backup Section */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Google Drive Backup
            </CardTitle>
            <CardDescription>
              {isConnected
                ? "Connected – You can save receipts to your Drive"
                : "Connect to backup receipts to your Google Drive"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isConnected && driveUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  {driveUser.picture && (
                    <img
                      src={driveUser.picture}
                      alt={driveUser.name}
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{driveUser.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {driveUser.email}
                    </p>
                  </div>
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDisconnectDrive}
                >
                  Disconnect Google Drive
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleConnectDrive}
                disabled={driveLoading || !isConfigured}
              >
                {driveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                {isConfigured ? "Connect Google Drive" : "Google Drive (Coming Soon)"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Receipts are saved to a "SnapTab Receipts" folder in your Drive
            </p>
          </CardContent>
        </Card>

        {/* App Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              App
            </CardTitle>
            <CardDescription>Install SnapTab on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/install">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Download className="h-4 w-4" />
                Install SnapTab on your device
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
