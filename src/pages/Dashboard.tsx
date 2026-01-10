import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Mail, User, Shield, CheckCircle, CreditCard, BarChart3, TrendingUp, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/home")}>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{t("profile.title")}</CardTitle>
              <CardDescription>{t("profile.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user?.email}</span>
                  {profile?.is_verified && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{t("profile.accountType")}:</span>
                  <Badge variant="secondary">{profile?.account_type || "end_user"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t("roles.title")}</CardTitle>
              <CardDescription>{t("roles.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? roles.map((role) => (
                  <Badge key={role.id} variant="outline">{t(`roles.${role.role}` as any, { defaultValue: role.role })}</Badge>
                )) : <p className="text-sm text-muted-foreground">{t("roles.noRoles")}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Verification Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />{t("verification.title")}</CardTitle>
              <CardDescription>{t("verification.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {profile?.is_verified ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-500" /></div>
                    <div><p className="font-medium">{t("verification.verified")}</p><p className="text-sm text-muted-foreground">{t("verification.verifiedMessage")}</p></div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center"><Mail className="h-5 w-5 text-yellow-500" /></div>
                    <div><p className="font-medium">{t("verification.pending")}</p><p className="text-sm text-muted-foreground">{t("verification.pendingMessage")}</p></div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t("subscription.title")}</CardTitle>
              <CardDescription>{t("subscription.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("subscription.noSubscription")}</p>
              <Button variant="outline" className="w-full">{t("subscription.manageSubscription")}</Button>
            </CardContent>
          </Card>

          {/* Reporting Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />{t("reporting.activity")}</CardTitle>
              <CardDescription>{t("reporting.activityDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("reporting.comingSoon")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />{t("reporting.insights")}</CardTitle>
              <CardDescription>{t("reporting.insightsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("reporting.moreAnalyticsDescription")}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
