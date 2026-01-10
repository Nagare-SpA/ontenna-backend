import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, TrendingUp, UserCheck } from "lucide-react";
import { AdminLayout } from "./AdminLayout";

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersRes, subsRes, plansRes] = await Promise.all([
        supabase.from("profiles").select("id, is_active", { count: "exact" }),
        supabase.from("subscriptions").select("id, status", { count: "exact" }),
        supabase.from("plans").select("id", { count: "exact" }),
      ]);
      
      const activeUsers = usersRes.data?.filter(u => u.is_active).length || 0;
      const activeSubs = subsRes.data?.filter(s => s.status === "active").length || 0;
      
      return {
        totalUsers: usersRes.count || 0,
        activeUsers,
        totalSubscriptions: subsRes.count || 0,
        activeSubscriptions: activeSubs,
        totalPlans: plansRes.count || 0,
      };
    },
  });

  const statCards = [
    { 
      key: "totalUsers", 
      icon: Users, 
      value: stats?.totalUsers || 0,
      description: t("admin.stats.totalUsersDesc"),
      color: "text-blue-500"
    },
    { 
      key: "activeUsers", 
      icon: UserCheck, 
      value: stats?.activeUsers || 0,
      description: t("admin.stats.activeUsersDesc"),
      color: "text-green-500"
    },
    { 
      key: "activeSubscriptions", 
      icon: TrendingUp, 
      value: stats?.activeSubscriptions || 0,
      description: t("admin.stats.activeSubsDesc"),
      color: "text-purple-500"
    },
    { 
      key: "totalPlans", 
      icon: CreditCard, 
      value: stats?.totalPlans || 0,
      description: t("admin.stats.totalPlansDesc"),
      color: "text-orange-500"
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.dashboard.title")}</h2>
          <p className="text-muted-foreground">{t("admin.dashboard.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.key}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t(`admin.stats.${stat.key}`)}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
