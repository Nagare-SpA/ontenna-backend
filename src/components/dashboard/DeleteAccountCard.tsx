import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";

// Permanent, self-service account deletion (required by the App Store, and the
// same endpoint the iOS app uses). The confirmation asks the user to type their
// own email because the action cannot be undone.
export function DeleteAccountCard() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const email = user?.email ?? "";
  const canDelete = confirmText.trim().toLowerCase() === email.toLowerCase() && !!email;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("account.delete.noSession", "Your session expired. Please sign in again."));

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("account.delete.failed", "Could not delete your account."));
      }

      toast({
        title: t("account.delete.doneTitle", "Account deleted"),
        description: t("account.delete.doneBody", "Your account and all its data have been permanently removed."),
      });
      await signOut();
      navigate("/");
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            {t("account.delete.title", "Delete account")}
          </CardTitle>
          <CardDescription>
            {t("account.delete.description", "Permanently delete your account and all of your data. This cannot be undone.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => { setConfirmText(""); setOpen(true); }}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t("account.delete.button", "Delete my account")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!isDeleting) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t("account.delete.confirmTitle", "This cannot be undone")}
            </DialogTitle>
            <DialogDescription>
              {t("account.delete.confirmBody", "Your profile, subscription and all your data will be permanently deleted. An active subscription will be canceled.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              {t("account.delete.typeEmail", "Type your email to confirm:")}{" "}
              <span className="font-medium text-foreground">{email}</span>
            </Label>
            <Input
              id="confirm-email"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || isDeleting}>
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("account.delete.deleting", "Deleting…")}</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />{t("account.delete.confirmButton", "Permanently delete")}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
