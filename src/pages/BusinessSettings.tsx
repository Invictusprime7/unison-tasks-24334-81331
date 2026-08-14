import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

type BusinessRow = {
  id: string;
  name: string;
  notification_email: string | null;
  notification_phone: string | null;
};

type BusinessHoursRow = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  is_active: boolean;
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function defaultHours(): BusinessHoursRow[] {
  return DAY_LABELS.map((_, day_of_week) => ({
    day_of_week,
    opens_at: "09:00",
    closes_at: "17:00",
    is_closed: day_of_week === 0 || day_of_week === 6,
  }));
}

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

  // ── Business hours ───────────────────────────────────────────────────────
  const [hours, setHours] = useState<BusinessHoursRow[]>(defaultHours());
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);

  useEffect(() => {
    if (!selectedBusinessId) return;
    let cancelled = false;
    setHoursLoading(true);
    supabase
      .from("business_hours" as any)
      .select("day_of_week,opens_at,closes_at,is_closed")
      .eq("business_id", selectedBusinessId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[BusinessSettings] load hours failed", error);
          setHours(defaultHours());
        } else {
          const byDay = new Map((data as BusinessHoursRow[] | null ?? []).map((row) => [row.day_of_week, row]));
          setHours(defaultHours().map((fallback) => byDay.get(fallback.day_of_week) ?? fallback));
        }
        setHoursLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBusinessId]);

  function updateHoursRow(day_of_week: number, patch: Partial<BusinessHoursRow>) {
    setHours((prev) => prev.map((row) => (row.day_of_week === day_of_week ? { ...row, ...patch } : row)));
  }

  async function handleSaveHours() {
    if (!selectedBusinessId) return;
    setHoursSaving(true);
    try {
      const { error } = await supabase
        .from("business_hours" as any)
        .upsert(
          hours.map((row) => ({ ...row, business_id: selectedBusinessId })),
          { onConflict: "business_id,day_of_week" },
        );
      if (error) throw error;
      toast.success("Business hours saved");
    } catch (e) {
      console.error("[BusinessSettings] save hours failed", e);
      toast.error("Failed to save business hours");
    } finally {
      setHoursSaving(false);
    }
  }

  // ── Staff ────────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "" });
  const [addingStaff, setAddingStaff] = useState(false);

  useEffect(() => {
    if (!selectedBusinessId) return;
    let cancelled = false;
    setStaffLoading(true);
    supabase
      .from("staff" as any)
      .select("id,name,email,role,is_active")
      .eq("business_id", selectedBusinessId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[BusinessSettings] load staff failed", error);
          setStaff([]);
        } else {
          setStaff((data as StaffRow[] | null) ?? []);
        }
        setStaffLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBusinessId]);

  async function handleAddStaff() {
    if (!selectedBusinessId || !newStaff.name.trim()) return;
    setAddingStaff(true);
    try {
      const { data, error } = await supabase
        .from("staff" as any)
        .insert({
          business_id: selectedBusinessId,
          name: newStaff.name.trim(),
          email: newStaff.email.trim() || null,
          role: newStaff.role.trim() || null,
          is_active: true,
        })
        .select("id,name,email,role,is_active")
        .single();
      if (error) throw error;
      setStaff((prev) => [...prev, data as StaffRow]);
      setNewStaff({ name: "", email: "", role: "" });
      toast.success("Staff member added");
    } catch (e) {
      console.error("[BusinessSettings] add staff failed", e);
      toast.error("Failed to add staff member");
    } finally {
      setAddingStaff(false);
    }
  }

  async function handleToggleStaffActive(row: StaffRow) {
    try {
      const { error } = await supabase
        .from("staff" as any)
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
      setStaff((prev) => prev.map((s) => (s.id === row.id ? { ...s, is_active: !s.is_active } : s)));
    } catch (e) {
      console.error("[BusinessSettings] toggle staff failed", e);
      toast.error("Failed to update staff member");
    }
  }

  async function handleDeleteStaff(row: StaffRow) {
    try {
      const { error } = await supabase.from("staff" as any).delete().eq("id", row.id);
      if (error) throw error;
      setStaff((prev) => prev.filter((s) => s.id !== row.id));
      toast.success("Staff member removed");
    } catch (e) {
      console.error("[BusinessSettings] delete staff failed", e);
      toast.error("Failed to remove staff member");
    }
  }

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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Business hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drives the availability generated for booking — visitors see these
              hours before booking, and closed days never produce time slots.
            </p>
            {hoursLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-3">
                {hours.map((row) => (
                  <div key={row.day_of_week} className="flex flex-wrap items-center gap-3">
                    <span className="w-24 shrink-0 text-sm font-medium">{DAY_LABELS[row.day_of_week]}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!row.is_closed}
                        onCheckedChange={(checked) => updateHoursRow(row.day_of_week, { is_closed: !checked })}
                      />
                      <span className="text-sm text-muted-foreground">{row.is_closed ? "Closed" : "Open"}</span>
                    </div>
                    {!row.is_closed && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          className="w-32"
                          value={row.opens_at}
                          onChange={(e) => updateHoursRow(row.day_of_week, { opens_at: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="time"
                          className="w-32"
                          value={row.closes_at}
                          onChange={(e) => updateHoursRow(row.day_of_week, { closes_at: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end">
              <Button onClick={handleSaveHours} disabled={!selectedBusinessId || hoursSaving}>
                {hoursSaving ? "Saving…" : "Save hours"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Team members who can be assigned to bookings.
            </p>
            {staffLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff added yet.</p>
            ) : (
              <div className="space-y-2">
                {staff.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      {(row.email || row.role) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {[row.role, row.email].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={row.is_active} onCheckedChange={() => handleToggleStaffActive(row)} />
                      <span className="text-xs text-muted-foreground">{row.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStaff(row)} aria-label={`Remove ${row.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Name"
                value={newStaff.name}
                onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Email (optional)"
                value={newStaff.email}
                onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
                inputMode="email"
              />
              <Input
                placeholder="Role (optional)"
                value={newStaff.role}
                onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))}
              />
              <Button
                onClick={handleAddStaff}
                disabled={!selectedBusinessId || !newStaff.name.trim() || addingStaff}
              >
                {addingStaff ? "Adding…" : "Add staff"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
