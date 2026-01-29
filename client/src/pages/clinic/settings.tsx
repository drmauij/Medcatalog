import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Building2, Mail, Phone, Save } from "lucide-react";
import type { Clinic } from "@shared/schema";

interface ClinicSettingsPageProps {
  clinic: Clinic;
}

export default function ClinicSettingsPage({ clinic }: ClinicSettingsPageProps) {
  const [name, setName] = useState(clinic.name);
  const [email, setEmail] = useState(clinic.email || "");
  const [phone, setPhone] = useState(clinic.phone || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(clinic.name);
    setEmail(clinic.email || "");
    setPhone(clinic.phone || "");
  }, [clinic]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const response = await apiRequest("PATCH", `/api/clinics/${clinic.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinics", clinic.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/roles"] });
      toast({ title: "Änderungen gespeichert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Fehler", description: "Name ist erforderlich", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  const hasChanges = name !== clinic.name || email !== (clinic.email || "") || phone !== (clinic.phone || "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Einstellungen</h2>
        <p className="text-muted-foreground">Klinikdaten verwalten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Klinikprofil
          </CardTitle>
          <CardDescription>
            Bearbeiten Sie die Kontaktinformationen Ihrer Klinik
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Klinikname
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name der Klinik"
              data-testid="input-clinic-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              E-Mail-Adresse
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kontakt@klinik.ch"
              data-testid="input-clinic-email"
            />
            <p className="text-xs text-muted-foreground">
              Diese E-Mail wird für Benachrichtigungen und Korrespondenz verwendet
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Telefonnummer
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 XX XXX XX XX"
              data-testid="input-clinic-phone"
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Wird gespeichert..." : "Änderungen speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
