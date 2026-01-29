import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Stethoscope, Package } from "lucide-react";

interface RoleSelectionProps {
  onComplete: () => void;
}

export default function RoleSelection({ onComplete }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<"supplier" | "clinic" | null>(null);
  const [entityName, setEntityName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRoleMutation = useMutation({
    mutationFn: async (data: { role: string; name: string }) => {
      return apiRequest("POST", "/api/user/role", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      toast({
        title: "Konto erstellt",
        description: `Ihr ${selectedRole === "supplier" ? "Lieferanten" : "Klinik"}-Konto wurde erfolgreich eingerichtet.`,
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Konto konnte nicht erstellt werden",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedRole || !entityName.trim()) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte wählen Sie eine Rolle und geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }
    createRoleMutation.mutate({ role: selectedRole, name: entityName.trim() });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg">MedCatalog</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-3xl font-bold">Willkommen bei MedCatalog</h1>
            <p className="text-muted-foreground">
              Wählen Sie, wie Sie die Plattform nutzen möchten
            </p>
          </div>

          {/* Role Selection */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all hover-elevate ${
                selectedRole === "supplier"
                  ? "ring-2 ring-primary bg-primary/5"
                  : ""
              }`}
              onClick={() => setSelectedRole("supplier")}
              data-testid="card-role-supplier"
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Lieferant</CardTitle>
                <CardDescription>
                  Verwalten Sie Ihren Produktkatalog und beantworten Sie Offertanfragen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Produktkategorien erstellen und verwalten</li>
                  <li>Produkte hinzufügen und bearbeiten</li>
                  <li>Standard- und individuelle Preise festlegen</li>
                  <li>Offerten prüfen und beantworten</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover-elevate ${
                selectedRole === "clinic"
                  ? "ring-2 ring-primary bg-primary/5"
                  : ""
              }`}
              onClick={() => setSelectedRole("clinic")}
              data-testid="card-role-clinic"
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <Stethoscope className="h-8 w-8 text-accent" />
                </div>
                <CardTitle>Klinik</CardTitle>
                <CardDescription>
                  Durchsuchen Sie Kataloge und fordern Sie Offerten von Lieferanten an
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Lieferantenkataloge durchsuchen</li>
                  <li>Preisofferten anfordern</li>
                  <li>Bestellungen aufgeben</li>
                  <li>Bestellhistorie verfolgen</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Entity Name Input */}
          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedRole === "supplier" ? "Firmenname" : "Klinikname"}
                </CardTitle>
                <CardDescription>
                  Geben Sie den Namen Ihrer {selectedRole === "supplier" ? "Firma" : "Klinik"} ein
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="entityName">
                    {selectedRole === "supplier" ? "Firmenname" : "Klinikname"}
                  </Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder={
                      selectedRole === "supplier"
                        ? "z.B. Anandic Medical Supplies"
                        : "z.B. Städtisches Krankenhaus"
                    }
                    data-testid="input-entity-name"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!entityName.trim() || createRoleMutation.isPending}
                  data-testid="button-create-account"
                >
                  {createRoleMutation.isPending ? "Wird erstellt..." : "Konto erstellen"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
