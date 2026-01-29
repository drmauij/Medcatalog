import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Stethoscope, ChevronDown, Plus } from "lucide-react";
import type { UserRole, Supplier, Clinic } from "@shared/schema";

interface EnrichedRole {
  role: UserRole;
  supplier: Supplier | null;
  clinic: Clinic | null;
}

interface RoleSwitcherProps {
  currentRole: "supplier" | "clinic";
  currentEntityId: string;
  currentEntityName: string;
}

export function RoleSwitcher({ currentRole, currentEntityId, currentEntityName }: RoleSwitcherProps) {
  const [, setLocation] = useLocation();

  const { data: roles } = useQuery<EnrichedRole[]>({
    queryKey: ["/api/user/roles"],
  });

  const handleRoleSwitch = (role: EnrichedRole) => {
    if (role.role.role === "supplier" && role.supplier) {
      setLocation(`/supplier/${role.supplier.id}`);
    } else if (role.role.role === "clinic" && role.clinic) {
      setLocation(`/clinic/${role.clinic.id}`);
    }
  };

  const handleAddRole = () => {
    setLocation("/add-role");
  };

  const canAddSupplier = !roles?.some(r => r.role.role === "supplier");
  const canAddClinic = !roles?.some(r => r.role.role === "clinic");
  const canAddNewRole = canAddSupplier || canAddClinic;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-role-switcher">
          {currentRole === "supplier" ? (
            <Building2 className="h-4 w-4" />
          ) : (
            <Stethoscope className="h-4 w-4" />
          )}
          <span className="max-w-[150px] truncate">{currentEntityName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Konten wechseln</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles?.map((role) => {
          const isCurrentRole = role.role.entityId === currentEntityId;
          const name = role.supplier?.name || role.clinic?.name || "Unbekannt";
          const Icon = role.role.role === "supplier" ? Building2 : Stethoscope;
          
          return (
            <DropdownMenuItem
              key={role.role.id}
              onClick={() => !isCurrentRole && handleRoleSwitch(role)}
              className={isCurrentRole ? "bg-accent" : "cursor-pointer"}
              data-testid={`menu-item-role-${role.role.id}`}
            >
              <Icon className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {role.role.role === "supplier" ? "Lieferant" : "Klinik"}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
        {canAddNewRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleAddRole} className="cursor-pointer" data-testid="menu-item-add-role">
              <Plus className="h-4 w-4 mr-2" />
              <span>
                {canAddSupplier && canAddClinic
                  ? "Weiteres Konto hinzufügen"
                  : canAddSupplier
                    ? "Lieferanten-Konto hinzufügen"
                    : "Klinik-Konto hinzufügen"}
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
