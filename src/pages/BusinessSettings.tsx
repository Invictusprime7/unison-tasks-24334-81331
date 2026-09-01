import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type BusinessRow = {
  id: string;
  name: string;
  notification_email: string | null;
  notification_phone: string | null;
};

export default function BusinessSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    notification_email: "",
    notification_phone: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error("Please sign in to manage business settings");
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("businesses" as any)
          .select("id,name,notification_email,notification_phone")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const list = (data || []) as BusinessRow[];
        if (cancelled) return;
        setBusinesses(list);
        const first = list[0];
        setSelectedBusinessId(first?.id ?? null);
      } catch (e) {
        console.error("[BusinessSettings] load failed", e);
        toast.error("Failed to load businesses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId]
  );

  useEffect(() => {
    if (!selectedBusiness) return;
    setForm({
      name: selectedBusiness.name ?? "",
      notification_email: selectedBusiness.notification_email ?? "",
      notification_phone: selectedBusiness.notification_phone ?? "",
    });
  }, [selectedBusiness?.id]);

  async function handleSave() {
    if (!selectedBusinessId) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || "New Business",
        notification_email: form.notification_email.trim() || null,
        notification_phone: form.notification_phone.trim() || null,
      };

      const { error } = await supabase
        .from("businesses" as any)
        .update(payload)
        .eq("id", selectedBusinessId);

      if (error) throw error;

      setBusinesses((prev) =>
        prev.map((b) => (b.id === selectedBusinessId ? { ...b, ...payload } as BusinessRow : b))
      );
      toast.success("Business settings saved");
    } catch (e) {
      console.error("[BusinessSettings] save failed", e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Business Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Business</Label>
              <Select
                value={selectedBusinessId ?? undefined}
                onValueChange={(v) => setSelectedBusinessId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="biz_name">Business name</Label>
                <Input
                  id="biz_name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Acme Co"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notify_email">Notification email</Label>
                <Input
                  id="notify_email"
                  value={form.notification_email}
                  onChange={(e) => setForm((p) => ({ ...p, notification_email: e.target.value }))}
                  placeholder="bookings@yourdomain.com"
                  inputMode="email"
                />
                <p className="text-sm text-muted-foreground">
                  Internal alerts for new leads and bookings will be sent here.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notify_phone">Notification phone (optional)</Label>
                <Input
                  id="notify_phone"
                  value={form.notification_phone}
                  onChange={(e) => setForm((p) => ({ ...p, notification_phone: e.target.value }))}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button onClick={handleSave} disabled={!selectedBusinessId || saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
