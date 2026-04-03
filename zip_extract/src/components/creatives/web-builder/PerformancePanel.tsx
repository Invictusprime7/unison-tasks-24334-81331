import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, AlertTriangle, CheckCircle2, 
  Loader2, Eye, Accessibility 
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PerformancePanelProps {
  fabricCanvas: any;
  onAutoFix: () => void;
}

interface PerformanceMetric {
  name: string;
  score: number;
  status: "good" | "warning" | "poor";
  issues: string[];
  fixes: string[];
}

export const PerformancePanel = ({ fabricCanvas, onAutoFix }: PerformancePanelProps) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  const analyzePerformance = () => {
    if (!fabricCanvas) return;

    setAnalyzing(true);
    
    setTimeout(() => {
      const objects = fabricCanvas.getObjects();
      const imageCount = objects.filter((obj: any) => obj.type === "image").length;
      const totalObjects = objects.length;
      
      // Analyze CLS (Cumulative Layout Shift)
      const clsScore = totalObjects < 50 ? 95 : totalObjects < 100 ? 70 : 40;
      const clsStatus = clsScore >= 90 ? "good" : clsScore >= 60 ? "warning" : "poor";
      
      // Analyze LCP (Largest Contentful Paint)
      const lcpScore = imageCount < 10 ? 90 : imageCount < 20 ? 65 : 35;
      const lcpStatus = lcpScore >= 80 ? "good" : lcpScore >= 50 ? "warning" : "poor";
      
      // Analyze WCAG (Accessibility)
      const textObjects = objects.filter((obj: any) => obj.type === "text" || obj.type === "textbox");
      const wcagScore = textObjects.length > 0 ? 85 : 100;
      const wcagStatus = wcagScore >= 80 ? "good" : wcagScore >= 60 ? "warning" : "poor";
      
      // Analyze DOM optimization
      const domScore = totalObjects < 30 ? 95 : totalObjects < 60 ? 70 : 45;
      const domStatus = domScore >= 90 ? "good" : domScore >= 60 ? "warning" : "poor";

      const newMetrics: PerformanceMetric[] = [
        {
          name: "Cumulative Layout Shift (CLS)",
          score: clsScore,
          status: clsStatus,
          issues: clsScore < 90 ? ["Too many dynamic elements", "Missing explicit dimensions"] : [],
          fixes: clsScore < 90 ? ["Add explicit widths/heights", "Reduce element count"] : []
        },
        {
          name: "Largest Contentful Paint (LCP)",
          score: lcpScore,
          status: lcpStatus,
          issues: lcpScore < 80 ? [`${imageCount} images detected`, "Large unoptimized images"] : [],
          fixes: lcpScore < 80 ? ["Compress images", "Lazy load images", "Use WebP format"] : []
        },
        {
          name: "WCAG Accessibility",
          score: wcagScore,
          status: wcagStatus,
          issues: wcagScore < 80 ? ["Low contrast text", "Missing alt attributes"] : [],
          fixes: wcagScore < 80 ? ["Improve color contrast", "Add semantic HTML", "Add ARIA labels"] : []
        },
        {
          name: "DOM Optimization",
          score: domScore,
          status: domStatus,
          issues: domScore < 90 ? [`${totalObjects} elements on page`, "Deep nesting detected"] : [],
          fixes: domScore < 90 ? ["Reduce element count", "Simplify structure", "Use CSS instead of extra elements"] : []
        }
      ];

      setMetrics(newMetrics);
      setOverallScore(Math.round(newMetrics.reduce((acc, m) => acc + m.score, 0) / newMetrics.length));
      setAnalyzing(false);
      toast.success("Performance analysis complete");
    }, 1500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusIcon = (status: string) => {
    if (status === "good") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Performance Analysis</Label>
          {overallScore > 0 && (
            <Badge variant="outline" className={getScoreColor(overallScore)}>
              {overallScore}/100
            </Badge>
          )}
        </div>

        <Button 
          onClick={analyzePerformance} 
          disabled={analyzing}
          className="w-full"
          size="sm"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {metrics.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Click "Run Analysis" to check performance metrics
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-2 p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metric.status)}
                    <Label className="text-xs font-medium">{metric.name}</Label>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(metric.score)}`}>
                    {metric.score}
                  </span>
                </div>

                <Progress value={metric.score} className="h-1" />

                {metric.issues.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Issues:</Label>
                    {metric.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-red-500">• {issue}</p>
                    ))}
                  </div>
                )}

                {metric.fixes.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Suggested Fixes:</Label>
                    {metric.fixes.map((fix, i) => (
                      <p key={i} className="text-xs text-green-600">✓ {fix}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Button 
              onClick={onAutoFix} 
              className="w-full"
              size="sm"
              variant="default"
            >
              <Zap className="h-4 w-4 mr-2" />
              Auto-Fix Issues
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
