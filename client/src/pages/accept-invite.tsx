import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";
import type { SupplierInvitation, Supplier } from "@shared/schema";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<{ invitation: SupplierInvitation; supplier: Supplier }>({
    queryKey: ["/api/invitations/token", token],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/token/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Einladung nicht gefunden");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invitations/accept/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Annehmen der Einladung");
      }
      return response.json();
    },
    onSuccess: () => {
      setAccepted(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleAccept = () => {
    if (!user) {
      window.location.href = `/api/login?returnTo=/invite/${token}`;
      return;
    }
    acceptMutation.mutate();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Einladung wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Einladung ungültig</h2>
            <p className="text-muted-foreground mb-6">
              Diese Einladung ist nicht mehr gültig oder wurde bereits verwendet.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Zur Startseite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Einladung angenommen!</h2>
            <p className="text-muted-foreground">
              Sie sind jetzt Teil von {data.supplier.name}. Sie werden weitergeleitet...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Einladung zu MedCatalog</CardTitle>
          <CardDescription>
            Sie wurden eingeladen, dem Team von <strong>{data.supplier.name}</strong> beizutreten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Angemeldet als:</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <Button 
                className="w-full" 
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                data-testid="button-accept-invite"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird verarbeitet...
                  </>
                ) : (
                  "Einladung annehmen"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Melden Sie sich an, um die Einladung anzunehmen.
              </p>
              <Button 
                className="w-full" 
                onClick={handleAccept}
                data-testid="button-login-to-accept"
              >
                Anmelden und Einladung annehmen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
