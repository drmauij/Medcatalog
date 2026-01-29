import { useState } from "react";
import { ChevronDown, ChevronUp, User, Mail, Phone, ShoppingCart, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface UserInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface LinkedOrder {
  id: string;
  status: string;
  createdAt?: string | Date | null;
  totalAmount?: string | null;
  createdByUser?: UserInfo | null;
  confirmedByUser?: UserInfo | null;
}

interface ActionHistoryProps {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  createdByUser?: UserInfo | null;
  respondedByUser?: UserInfo | null;
  linkedOrder?: LinkedOrder | null;
  status: string;
  showInline?: boolean;
}

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatUserName = (user: UserInfo | null | undefined) => {
  if (!user) return "Unbekannt";
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email || "Unbekannt";
};

const UserContactBadge = ({ user, label }: { user: UserInfo | null | undefined; label: string }) => {
  if (!user) return null;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{formatUserName(user)}</span>
      {user.email && (
        <a 
          href={`mailto:${user.email}`} 
          className="text-primary hover:underline flex items-center gap-1"
          data-testid={`link-email-${user.id}`}
        >
          <Mail className="h-3 w-3" />
          {user.email}
        </a>
      )}
      {user.phone && (
        <a 
          href={`tel:${user.phone}`} 
          className="text-muted-foreground hover:text-primary flex items-center gap-1"
          data-testid={`link-phone-${user.id}`}
        >
          <Phone className="h-3 w-3" />
          {user.phone}
        </a>
      )}
    </div>
  );
};

const getOrderStatusLabel = (status: string) => {
  switch (status) {
    case "pending": return "Ausstehend";
    case "confirmed": return "Bestätigt";
    case "shipped": return "Versandt";
    case "delivered": return "Geliefert";
    case "cancelled": return "Storniert";
    default: return status;
  }
};

export function ActionHistoryInline({ 
  createdAt, 
  createdByUser, 
  respondedByUser,
  linkedOrder,
  status 
}: ActionHistoryProps) {
  const latestAction = (() => {
    if (linkedOrder?.confirmedByUser) {
      return { 
        action: "Bestellung bestätigt", 
        user: linkedOrder.confirmedByUser, 
        date: linkedOrder.createdAt 
      };
    }
    if (linkedOrder) {
      return { 
        action: "Bestellung erstellt", 
        user: linkedOrder.createdByUser, 
        date: linkedOrder.createdAt 
      };
    }
    if (status === "quoted" && respondedByUser) {
      return { action: "Offerte erstellt", user: respondedByUser, date: null };
    }
    if (status === "rejected") {
      return { action: "Abgelehnt", user: null, date: null };
    }
    return { action: "Anfrage erstellt", user: createdByUser, date: createdAt };
  })();

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{latestAction.action}</span>
      {latestAction.user && (
        <>
          <span>von</span>
          <span className="font-medium text-foreground">{formatUserName(latestAction.user)}</span>
        </>
      )}
      {latestAction.date && (
        <span>am {formatDate(latestAction.date)}</span>
      )}
      {linkedOrder && (
        <Badge variant="outline" className="ml-2 text-xs">
          <ShoppingCart className="h-3 w-3 mr-1" />
          Bestellung #{linkedOrder.id.slice(-6)}
        </Badge>
      )}
    </div>
  );
}

export function ActionHistoryFull({ 
  createdAt, 
  updatedAt,
  createdByUser, 
  respondedByUser,
  linkedOrder,
  status 
}: ActionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const historyItems: { action: string; user: UserInfo | null | undefined; date: string | Date | null | undefined; icon: typeof FileText }[] = [];

  historyItems.push({
    action: "Anfrage erstellt",
    user: createdByUser,
    date: createdAt,
    icon: FileText,
  });

  if (respondedByUser && (status === "quoted" || status === "accepted" || status === "rejected")) {
    historyItems.push({
      action: "Offerte erstellt",
      user: respondedByUser,
      date: updatedAt,
      icon: FileText,
    });
  }

  if (linkedOrder) {
    historyItems.push({
      action: "Bestellung erstellt",
      user: linkedOrder.createdByUser,
      date: linkedOrder.createdAt,
      icon: ShoppingCart,
    });

    if (linkedOrder.confirmedByUser) {
      historyItems.push({
        action: "Bestellung bestätigt",
        user: linkedOrder.confirmedByUser,
        date: linkedOrder.createdAt,
        icon: ShoppingCart,
      });
    }
  }

  if (status === "rejected") {
    historyItems.push({
      action: "Offerte abgelehnt",
      user: null,
      date: updatedAt,
      icon: FileText,
    });
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-t pt-3 mt-3">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between p-0 h-auto font-normal hover:bg-transparent"
            data-testid="button-toggle-history"
          >
            <ActionHistoryInline 
              createdAt={createdAt}
              createdByUser={createdByUser}
              respondedByUser={respondedByUser}
              linkedOrder={linkedOrder}
              status={status}
            />
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          <div className="bg-muted/30 rounded-md p-4 space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aktionsverlauf
            </h4>
            
            <div className="space-y-3">
              {historyItems.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 text-sm border-l-2 border-primary/20 pl-3"
                  data-testid={`history-item-${index}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.action}
                    </div>
                    {item.user && (
                      <UserContactBadge user={item.user} label="Von" />
                    )}
                    {item.date && (
                      <div className="text-muted-foreground text-xs mt-1">
                        {formatDate(item.date)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {linkedOrder && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-medium">Verknüpfte Bestellung:</span>
                  <Badge variant="outline">
                    #{linkedOrder.id.slice(-6)}
                  </Badge>
                  <Badge variant="secondary">
                    {getOrderStatusLabel(linkedOrder.status)}
                  </Badge>
                  {linkedOrder.totalAmount && (
                    <span className="font-medium">
                      CHF {parseFloat(linkedOrder.totalAmount).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
