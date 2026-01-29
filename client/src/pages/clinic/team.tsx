import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import type { ClinicInvitation } from "@shared/schema";

interface ClinicTeamPageProps {
  clinicId: string;
}

export default function ClinicTeamPage({ clinicId }: ClinicTeamPageProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const { data: invitations, isLoading } = useQuery<ClinicInvitation[]>({
    queryKey: ["/api/clinic-invitations/clinic", clinicId],
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/clinic-invitations", { clinicId, email });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-invitations/clinic", clinicId] });
      setIsInviteOpen(false);
      setEmail("");
      toast({ title: "Einladung gesendet", description: "Die Einladungs-E-Mail wurde versendet." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clinic-invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-invitations/clinic", clinicId] });
      toast({ title: "Einladung zurückgezogen" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleInvite = () => {
    if (!email.trim()) {
      toast({ title: "Bitte E-Mail-Adresse eingeben", variant: "destructive" });
      return;
    }
    if (!email.includes("@")) {
      toast({ title: "Bitte gültige E-Mail-Adresse eingeben", variant: "destructive" });
      return;
    }
    inviteMutation.mutate(email);
  };

  const getStatusBadge = (status: string, expiresAt: Date | string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === "accepted") {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Angenommen</Badge>;
    }
    if (status === "expired" || isExpired) {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Abgelaufen</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Zurückgezogen</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Ausstehend</Badge>;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingInvitations = invitations?.filter(i => i.status === "pending" && new Date(i.expiresAt) >= new Date()) || [];
  const otherInvitations = invitations?.filter(i => i.status !== "pending" || new Date(i.expiresAt) < new Date()) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Team</h2>
          <p className="text-muted-foreground">Laden Sie Mitarbeiter ein, um gemeinsam zu arbeiten</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-clinic-coworker">
              <UserPlus className="h-4 w-4 mr-2" />
              Mitarbeiter einladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mitarbeiter einladen</DialogTitle>
              <DialogDescription>
                Geben Sie die E-Mail-Adresse des Mitarbeiters ein, den Sie einladen möchten.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kollege@klinik.ch"
                  data-testid="input-clinic-invite-email"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Der Mitarbeiter erhält eine E-Mail mit einem Einladungslink, der 7 Tage gültig ist.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsInviteOpen(false); setEmail(""); }}>
                Abbrechen
              </Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending} data-testid="button-send-clinic-invite">
                {inviteMutation.isPending ? "Wird gesendet..." : "Einladung senden"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ausstehende Einladungen</CardTitle>
            <CardDescription>Diese Einladungen warten auf Bestätigung</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Gesendet am</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                    <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.expiresAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelMutation.mutate(invitation.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`button-cancel-clinic-invite-${invitation.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {otherInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Einladungsverlauf</CardTitle>
            <CardDescription>Frühere Einladungen</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Gesendet am</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.expiresAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">Wird geladen...</div>
      )}

      {!isLoading && invitations?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Noch keine Einladungen</h3>
            <p className="text-muted-foreground mb-4">
              Laden Sie Mitarbeiter ein, um gemeinsam an Ihrem Klinikkonto zu arbeiten.
            </p>
            <Button onClick={() => setIsInviteOpen(true)} data-testid="button-first-clinic-invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Ersten Mitarbeiter einladen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
