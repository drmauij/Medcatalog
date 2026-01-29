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
        title: "Account created",
        description: `Your ${selectedRole} account has been set up successfully.`,
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedRole || !entityName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a role and enter a name.",
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
            <h1 className="font-serif text-3xl font-bold">Welcome to MedCatalog</h1>
            <p className="text-muted-foreground">
              Choose how you want to use the platform
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
                <CardTitle>Supplier</CardTitle>
                <CardDescription>
                  Manage your product catalog and respond to quotation requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Create and manage product categories</li>
                  <li>Add and edit products</li>
                  <li>Set default and custom prices</li>
                  <li>Review and respond to quotations</li>
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
                <CardTitle>Clinic</CardTitle>
                <CardDescription>
                  Browse catalogs and request quotations from suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Browse supplier catalogs</li>
                  <li>Request pricing quotations</li>
                  <li>Place orders</li>
                  <li>Track order history</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Entity Name Input */}
          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedRole === "supplier" ? "Company Name" : "Clinic Name"}
                </CardTitle>
                <CardDescription>
                  Enter the name of your {selectedRole === "supplier" ? "company" : "clinic"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="entityName">
                    {selectedRole === "supplier" ? "Company Name" : "Clinic Name"}
                  </Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder={
                      selectedRole === "supplier"
                        ? "e.g., Anandic Medical Supplies"
                        : "e.g., City General Hospital"
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
                  {createRoleMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
