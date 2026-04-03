import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CopyRewritePanelProps {
  selectedObject: any;
  onUpdate: (newText: string) => void;
}

export const CopyRewritePanel = ({ selectedObject, onUpdate }: CopyRewritePanelProps) => {
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<"professional" | "casual" | "persuasive" | "friendly" | "urgent">("professional");
  const [purpose, setPurpose] = useState<"seo" | "cta" | "general">("general");
  const [rewrittenText, setRewrittenText] = useState("");

  const isTextObject = selectedObject && (selectedObject.type === "text" || selectedObject.type === "textbox");
  const originalText = isTextObject ? selectedObject.text : "";

  const handleRewrite = async () => {
    if (!originalText) {
      toast.error("No text to rewrite");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("copy-rewrite", {
        body: { 
          text: originalText,
          tone,
          purpose
        }
      });

      if (error) throw error;

      setRewrittenText(data.rewrittenText);
      toast.success("Text rewritten successfully");
    } catch (error: any) {
      console.error("Copy rewrite error:", error);
      toast.error(error.message || "Failed to rewrite text");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (rewrittenText) {
      onUpdate(rewrittenText);
      toast.success("Applied rewritten text");
      setRewrittenText("");
    }
  };

  if (!isTextObject) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a text element to rewrite copy
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Original Text</Label>
        <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
          {originalText}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Tone</Label>
        <Select value={tone} onValueChange={(v: any) => setTone(v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="persuasive">Persuasive</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Purpose</Label>
        <Select value={purpose} onValueChange={(v: any) => setPurpose(v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="seo">SEO Optimized</SelectItem>
            <SelectItem value="cta">Call-to-Action</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={handleRewrite} 
        disabled={loading}
        className="w-full"
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Rewriting...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Rewrite Copy
          </>
        )}
      </Button>

      {rewrittenText && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Rewritten Text</Label>
          <Textarea
            value={rewrittenText}
            onChange={(e) => setRewrittenText(e.target.value)}
            className="min-h-[100px] text-sm"
          />
          <Button onClick={handleApply} className="w-full" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      )}
    </div>
  );
};
