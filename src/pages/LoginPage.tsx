import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Chrome } from "lucide-react";

export default function LoginPage() {
  const { user, isAdmin, loading, signIn } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
          <CardDescription>
            MyHappyFam — Family Management Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : user && !isAdmin ? (
            <div className="text-center space-y-3">
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                <p className="font-medium">Access Denied</p>
                <p className="text-xs mt-1">{user.email} is not an admin</p>
              </div>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Different Account
              </Button>
            </div>
          ) : (
            <Button onClick={signIn} className="w-full" size="lg">
              <Chrome className="h-5 w-5 mr-2" />
              Sign in with Google
            </Button>
          )}
          <p className="text-xs text-center text-muted-foreground">
            Only authorized administrators can access this panel
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
