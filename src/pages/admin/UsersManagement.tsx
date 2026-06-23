import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Search, MoreHorizontal, UserCog, Gift, Percent, Trash2, XCircle, UserPlus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type Plan = Database["public"]["Tables"]["plans"]["Row"];

interface UserWithSubscription extends Profile {
  subscription?: Subscription & { plan?: Plan };
}

export default function UsersManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [dialogType, setDialogType] = useState<"edit" | "free" | "discount" | "delete" | "cancelSub" | "create" | null>(null);

  // Form states
  const [freeMonths, setFreeMonths] = useState("1");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [adminNotes, setAdminNotes] = useState("");

  // New-user form
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [grantFreeOnCreate, setGrantFreeOnCreate] = useState(false);
  const [createFreeMonths, setCreateFreeMonths] = useState("12");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch subscriptions for all users
      const userIds = profiles.map(p => p.id);
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .in("user_id", userIds);
      
      // Merge subscriptions with profiles
      return profiles.map(profile => ({
        ...profile,
        subscription: subscriptions?.find(s => s.user_id === profile.id),
      })) as UserWithSubscription[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("admin.users.statusUpdated") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const grantFreeSubscription = useMutation({
    mutationFn: async ({ userId, months, planId }: { userId: string; months: number; planId: string }) => {
      const freeUntil = new Date();
      freeUntil.setMonth(freeUntil.getMonth() + months);
      
      // Check if user has a subscription
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (existingSub) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            status: "active",
            free_until: freeUntil.toISOString(),
            admin_notes: adminNotes || null,
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + months);
        
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            free_until: freeUntil.toISOString(),
            current_period_end: periodEnd.toISOString(),
            admin_notes: adminNotes || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("admin.users.freeGranted") });
      setDialogType(null);
      setSelectedUser(null);
      setAdminNotes("");
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const applyDiscount = useMutation({
    mutationFn: async ({ userId, percent }: { userId: string; percent: number }) => {
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (!existingSub) {
        throw new Error("No subscription found");
      }
      
      const { error } = await supabase
        .from("subscriptions")
        .update({
          discount_percent: percent,
          admin_notes: adminNotes || null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("admin.users.discountApplied") });
      setDialogType(null);
      setSelectedUser(null);
      setAdminNotes("");
    },
    onError: (error) => {
      toast({ 
        title: t("common.error"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("admin.users.deleted") });
      setDialogType(null);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({ 
        title: t("common.error"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (user: UserWithSubscription, type: "edit" | "free" | "discount" | "delete" | "cancelSub") => {
    setSelectedUser(user);
    setDialogType(type);
    setAdminNotes("");
  };

  const cancelSubscription = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("admin.users.subscriptionCanceled") });
      setDialogType(null);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({ 
        title: t("common.error"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            first_name: newFirst,
            last_name: newLast,
            free_months: grantFreeOnCreate ? parseInt(createFreeMonths) : 0,
            plan_id: grantFreeOnCreate ? plans?.[0]?.id ?? null : null,
            admin_notes: adminNotes || null,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || "Failed to create user");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("admin.users.created", "User created") });
      setDialogType(null);
      setNewFirst(""); setNewLast(""); setNewEmail(""); setNewPassword("");
      setGrantFreeOnCreate(false); setCreateFreeMonths("12"); setAdminNotes("");
    },
    onError: (error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t("admin.users.title")}</h2>
            <p className="text-muted-foreground">{t("admin.users.subtitle")}</p>
          </div>
          <Button onClick={() => { setAdminNotes(""); setDialogType("create"); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t("admin.users.createUser", "Create user")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.users.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.users.name")}</TableHead>
                  <TableHead>{t("admin.users.email")}</TableHead>
                  <TableHead>{t("admin.users.status")}</TableHead>
                  <TableHead>{t("admin.users.plan")}</TableHead>
                  <TableHead>{t("admin.users.subscription")}</TableHead>
                  <TableHead className="text-right">{t("admin.users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t("admin.users.noUsers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? t("admin.users.active") : t("admin.users.disabled")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.subscription?.plan?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={user.subscription?.status === "active" ? "default" : "outline"}
                          >
                            {user.subscription?.status || t("admin.users.noSub")}
                          </Badge>
                          {user.subscription?.discount_percent ? (
                            <Badge variant="secondary" className="text-xs">
                              {user.subscription.discount_percent}% {t("admin.users.discount")}
                            </Badge>
                          ) : null}
                          {user.subscription?.free_until && new Date(user.subscription.free_until) > new Date() ? (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                              {t("admin.users.freeUntil")} {new Date(user.subscription.free_until).toLocaleDateString()}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t("admin.users.actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleUserStatus.mutate({ 
                                userId: user.id, 
                                isActive: !user.is_active 
                              })}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              {user.is_active ? t("admin.users.disable") : t("admin.users.enable")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(user, "free")}>
                              <Gift className="h-4 w-4 mr-2" />
                              {t("admin.users.grantFree")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDialog(user, "discount")}
                              disabled={!user.subscription}
                            >
                              <Percent className="h-4 w-4 mr-2" />
                              {t("admin.users.applyDiscount")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDialog(user, "cancelSub")}
                              disabled={!user.subscription}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("admin.users.cancelSubscription")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDialog(user, "delete")}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("admin.users.deleteUser")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Grant Free Subscription Dialog */}
        <Dialog open={dialogType === "free"} onOpenChange={() => setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.grantFreeTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.grantFreeDesc", { email: selectedUser?.email })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.users.selectPlan")}</Label>
                <Select defaultValue={plans?.[0]?.id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${(plan.price_monthly / 100).toFixed(2)}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.users.duration")}</Label>
                <Select value={freeMonths} onValueChange={setFreeMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 {t("admin.users.month")}</SelectItem>
                    <SelectItem value="3">3 {t("admin.users.months")}</SelectItem>
                    <SelectItem value="6">6 {t("admin.users.months")}</SelectItem>
                    <SelectItem value="9">9 {t("admin.users.months")}</SelectItem>
                    <SelectItem value="12">1 {t("admin.users.year")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.users.notes")}</Label>
                <Textarea 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("admin.users.notesPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={() => {
                  if (selectedUser && plans?.[0]) {
                    grantFreeSubscription.mutate({
                      userId: selectedUser.id,
                      months: parseInt(freeMonths),
                      planId: plans[0].id,
                    });
                  }
                }}
                disabled={grantFreeSubscription.isPending}
              >
                {t("admin.users.grant")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apply Discount Dialog */}
        <Dialog open={dialogType === "discount"} onOpenChange={() => setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.applyDiscountTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.applyDiscountDesc", { email: selectedUser?.email })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.users.discountPercent")}</Label>
                <Select value={discountPercent} onValueChange={setDiscountPercent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="100">100% ({t("admin.users.free")})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.users.notes")}</Label>
                <Textarea 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("admin.users.notesPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={() => {
                  if (selectedUser) {
                    applyDiscount.mutate({
                      userId: selectedUser.id,
                      percent: parseInt(discountPercent),
                    });
                  }
                }}
                disabled={applyDiscount.isPending}
              >
                {t("admin.users.apply")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={dialogType === "delete"} onOpenChange={() => setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.deleteDesc", { email: selectedUser?.email })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                {t("common.cancel")}
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (selectedUser) {
                    deleteUser.mutate(selectedUser.id);
                  }
                }}
                disabled={deleteUser.isPending}
              >
                {t("admin.users.confirmDelete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Subscription Dialog */}
        <Dialog open={dialogType === "cancelSub"} onOpenChange={() => setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.cancelSubscriptionTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.cancelSubscriptionDesc", { email: selectedUser?.email })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                {t("common.cancel")}
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (selectedUser) {
                    cancelSubscription.mutate(selectedUser.id);
                  }
                }}
                disabled={cancelSubscription.isPending}
              >
                {t("admin.users.confirmCancelSubscription")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={dialogType === "create"} onOpenChange={() => setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.createUser", "Create user")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.createDesc", "Creates a confirmed Ontenna account (no email verification needed).")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("auth.signup.firstName")}</Label>
                  <Input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.signup.lastName")}</Label>
                  <Input value={newLast} onChange={(e) => setNewLast(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.signup.email")}</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.signup.password")}</Label>
                <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("auth.signup.req8chars", "At least 8 characters")} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="font-medium">{t("admin.users.grantFreeOnCreate", "Grant free subscription")}</Label>
                  <p className="text-xs text-muted-foreground">{plans?.[0]?.name}</p>
                </div>
                <Switch checked={grantFreeOnCreate} onCheckedChange={setGrantFreeOnCreate} />
              </div>
              {grantFreeOnCreate && (
                <div className="space-y-2">
                  <Label>{t("admin.users.duration")}</Label>
                  <Select value={createFreeMonths} onValueChange={setCreateFreeMonths}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 {t("admin.users.month")}</SelectItem>
                      <SelectItem value="3">3 {t("admin.users.months")}</SelectItem>
                      <SelectItem value="6">6 {t("admin.users.months")}</SelectItem>
                      <SelectItem value="12">1 {t("admin.users.year")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("admin.users.notes")}</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={t("admin.users.notesPlaceholder")} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>{t("common.cancel")}</Button>
              <Button
                onClick={() => createUser.mutate()}
                disabled={createUser.isPending || !newEmail || newPassword.length < 8 || !newFirst}
              >
                {createUser.isPending ? t("auth.signup.submitting") : t("admin.users.createUser", "Create user")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
