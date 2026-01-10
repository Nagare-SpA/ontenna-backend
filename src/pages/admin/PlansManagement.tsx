import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type PlanTier = Database["public"]["Enums"]["plan_tier"];

interface PlanFormData {
  name: string;
  tier: PlanTier;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  is_active: boolean;
}

const defaultFormData: PlanFormData = {
  name: "",
  tier: "basic",
  price_monthly: 0,
  price_yearly: 0,
  features: [],
  stripe_price_id_monthly: "",
  stripe_price_id_yearly: "",
  is_active: true,
};

export default function PlansManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [featuresText, setFeaturesText] = useState("");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price_monthly", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const savePlan = useMutation({
    mutationFn: async (data: PlanFormData & { id?: string }) => {
      const planData = {
        name: data.name,
        tier: data.tier,
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly,
        features: data.features,
        stripe_price_id_monthly: data.stripe_price_id_monthly || null,
        stripe_price_id_yearly: data.stripe_price_id_yearly || null,
        is_active: data.is_active,
      };

      if (data.id) {
        const { error } = await supabase
          .from("plans")
          .update(planData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: selectedPlan ? t("admin.plans.updated") : t("admin.plans.created") });
      closeDialog();
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: t("admin.plans.deleted") });
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const togglePlanStatus = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("plans")
        .update({ is_active: isActive })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: t("admin.plans.statusUpdated") });
    },
  });

  const openCreateDialog = () => {
    setSelectedPlan(null);
    setFormData(defaultFormData);
    setFeaturesText("");
    setDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    const features = Array.isArray(plan.features) ? plan.features : [];
    setFormData({
      name: plan.name,
      tier: plan.tier,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: features as string[],
      stripe_price_id_monthly: plan.stripe_price_id_monthly || "",
      stripe_price_id_yearly: plan.stripe_price_id_yearly || "",
      is_active: plan.is_active,
    });
    setFeaturesText(features.join("\n"));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedPlan(null);
    setFormData(defaultFormData);
    setFeaturesText("");
  };

  const handleSubmit = () => {
    const features = featuresText.split("\n").filter(f => f.trim());
    savePlan.mutate({
      ...formData,
      features,
      id: selectedPlan?.id,
    });
  };

  const tierColors: Record<PlanTier, string> = {
    free: "bg-gray-500",
    basic: "bg-blue-500",
    pro: "bg-purple-500",
    enterprise: "bg-orange-500",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t("admin.plans.title")}</h2>
            <p className="text-muted-foreground">{t("admin.plans.subtitle")}</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("admin.plans.create")}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.plans.name")}</TableHead>
                  <TableHead>{t("admin.plans.tier")}</TableHead>
                  <TableHead>{t("admin.plans.priceMonthly")}</TableHead>
                  <TableHead>{t("admin.plans.priceYearly")}</TableHead>
                  <TableHead>{t("admin.plans.status")}</TableHead>
                  <TableHead>{t("admin.plans.stripeIds")}</TableHead>
                  <TableHead className="text-right">{t("admin.users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : plans?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("admin.plans.noPlans")}
                    </TableCell>
                  </TableRow>
                ) : (
                  plans?.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <Badge className={tierColors[plan.tier]}>
                          {plan.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>${plan.price_monthly}</TableCell>
                      <TableCell>${plan.price_yearly}</TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={(checked) => 
                            togglePlanStatus.mutate({ planId: plan.id, isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {plan.stripe_price_id_monthly ? (
                            <span className="text-green-600">✓ Monthly</span>
                          ) : (
                            <span>✗ Monthly</span>
                          )}
                          {" / "}
                          {plan.stripe_price_id_yearly ? (
                            <span className="text-green-600">✓ Yearly</span>
                          ) : (
                            <span>✗ Yearly</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Plan Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedPlan ? t("admin.plans.edit") : t("admin.plans.create")}
              </DialogTitle>
              <DialogDescription>
                {selectedPlan ? t("admin.plans.editDesc") : t("admin.plans.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.plans.name")}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Pro Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.plans.tier")}</Label>
                  <Select 
                    value={formData.tier} 
                    onValueChange={(v) => setFormData({ ...formData, tier: v as PlanTier })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.plans.priceMonthly")} ($)</Label>
                  <Input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.plans.priceYearly")} ($)</Label>
                  <Input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.plans.features")}</Label>
                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={t("admin.plans.featuresPlaceholder")}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{t("admin.plans.featuresHint")}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.plans.stripePriceMonthly")}</Label>
                  <Input
                    value={formData.stripe_price_id_monthly}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
                    placeholder="price_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.plans.stripePriceYearly")}</Label>
                  <Input
                    value={formData.stripe_price_id_yearly}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })}
                    placeholder="price_..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>{t("admin.plans.isActive")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={savePlan.isPending}>
                {selectedPlan ? t("common.save") : t("admin.plans.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Plan Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.plans.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.plans.deleteDesc", { name: selectedPlan?.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                variant="destructive"
                onClick={() => selectedPlan && deletePlan.mutate(selectedPlan.id)}
                disabled={deletePlan.isPending}
              >
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
