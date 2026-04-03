import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, ExternalLink, Workflow } from "lucide-react";
import { toast } from "sonner";

interface FormSubmission {
  id: string;
  form_id: string;
  form_name: string | null;
  data: Record<string, any>;
  source_url: string | null;
  ip_address: string | null;
  workflow_triggered: boolean;
  created_at: string;
}

export function CRMFormSubmissions() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      const { data, error } = await supabase
        .from("crm_form_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as FormSubmission[]);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load form submissions");
    } finally {
      setLoading(false);
    }
  }

  function viewDetails(submission: FormSubmission) {
    setSelectedSubmission(submission);
    setDetailsOpen(true);
  }

  const uniqueForms = [...new Set(submissions.map((s) => s.form_id))];

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.form_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.form_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(s.data).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesForm = formFilter === "all" || s.form_id === formFilter;
    return matchesSearch && matchesForm;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Submissions</p>
          <p className="text-2xl font-bold">{submissions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Unique Forms</p>
          <p className="text-2xl font-bold">{uniqueForms.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Workflows Triggered</p>
          <p className="text-2xl font-bold text-green-600">
            {submissions.filter((s) => s.workflow_triggered).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold">
            {submissions.filter((s) => 
              new Date(s.created_at).toDateString() === new Date().toDateString()
            ).length}
          </p>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={formFilter} onValueChange={setFormFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by form" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            {uniqueForms.map((formId) => (
              <SelectItem key={formId} value={formId}>
                {formId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Data Preview</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No form submissions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{submission.form_name || submission.form_id}</p>
                        {submission.form_name && (
                          <p className="text-xs text-muted-foreground">{submission.form_id}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {submission.data?.email && (
                          <span className="mr-2">{submission.data.email}</span>
                        )}
                        {submission.data?.name && (
                          <span>{submission.data.name}</span>
                        )}
                        {!submission.data?.email && !submission.data?.name && (
                          <span>{Object.keys(submission.data || {}).slice(0, 3).join(", ")}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.source_url ? (
                        <a
                          href={submission.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.workflow_triggered ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Workflow className="h-3 w-3 mr-1" />
                          Triggered
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(submission.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewDetails(submission)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Submission Details: {selectedSubmission?.form_name || selectedSubmission?.form_id}
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Form ID</p>
                  <p className="font-medium">{selectedSubmission.form_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(selectedSubmission.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-medium">{selectedSubmission.ip_address || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Workflow Triggered</p>
                  <p className="font-medium">
                    {selectedSubmission.workflow_triggered ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {selectedSubmission.source_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Source URL</p>
                  <a
                    href={selectedSubmission.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {selectedSubmission.source_url}
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Form Data</p>
                <div className="bg-muted rounded-lg p-4 max-h-[300px] overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(selectedSubmission.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
