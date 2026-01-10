import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Mail, Shield, CheckCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { PlansDialog } from "@/components/billing/PlansDialog";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plansDialogOpen, setPlansDialogOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast({ title: t("account.logoutSuccess"), description: t("account.logoutMessage") });
    navigate("/login");
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    return user?.email?.[0].toUpperCase() || "U";
  };

  const getFullName = () => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
    return t("dashboard.welcomeGeneric").replace("!", "");
  };

  const isSuperAdmin = roles.some((r) => r.role === "super_admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t("dashboard.title")}</h1>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="h-4 w-4 mr-2" />{t("nav.admin")}
            </Button>
            )}
            <LanguageSelector />
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />{t("account.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">{profile?.first_name ? t("dashboard.welcome", { name: profile.first_name }) : t("dashboard.welcomeGeneric")}</h2>
          <p className="text-muted-foreground">{t("dashboard.overview")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{getFullName()}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user?.email}</span>
                </div>
                {/* Verification Status */}
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span>{t("verification.title")}:</span>
                  {profile?.is_verified ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">{t("verification.verified")}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-500">{t("verification.pending")}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <SubscriptionCard onManageClick={() => setPlansDialogOpen(true)} />

          {/* Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />{t("reporting.activity")}</CardTitle>
              <CardDescription>{t("reporting.activityDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("reporting.comingSoon")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Plans Dialog */}
        <PlansDialog open={plansDialogOpen} onOpenChange={setPlansDialogOpen} />
      </main>
    </div>
  );
}
