import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload, Scissors, Wand2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
export const VideoEditor = () => {
  const {
    toast
  } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      toast({
        title: "Video uploaded",
        description: file.name
      });
    }
  };
  const handleAIEnhance = async () => {
    if (!videoFile) {
      toast({
        title: "No video uploaded",
        description: "Please upload a video first",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "AI Enhancement Complete",
        description: "Your video has been enhanced with AI"
      });
    } catch (error) {
      toast({
        title: "Enhancement failed",
        description: "Failed to enhance video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  return <Card className="h-full bg-slate-950">
      <CardHeader className="bg-gray-950">
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Video className="h-5 w-5 text-primary" />
          AI Video Editor
        </CardTitle>
        <CardDescription className="text-slate-100">
          Edit videos with AI-powered enhancements and tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 bg-gray-950">
        <div className="space-y-2">
          <label className="font-medium text-sm text-slate-100">Upload Video</label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="video/*" onChange={handleVideoUpload} className="flex-1" />
            <Button variant="outline" size="icon">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {videoFile && <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <Video className="h-10 w-10 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>}

        <div className="space-y-2">
          <label className="font-medium text-sm text-slate-100">AI Enhancement</label>
          <Textarea placeholder="Describe how you want to enhance the video (e.g., improve lighting, add transitions, remove background noise)..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={!videoFile} className="bg-slate-300 hover:bg-slate-200">
            <Scissors className="h-4 w-4 mr-2" />
            Trim Video
          </Button>
          <Button onClick={handleAIEnhance} disabled={!videoFile || isProcessing} className="bg-gray-700 hover:bg-gray-600">
            <Wand2 className="h-4 w-4 mr-2" />
            {isProcessing ? "Processing..." : "AI Enhance"}
          </Button>
        </div>

        {videoFile && <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export Video
          </Button>}
      </CardContent>
    </Card>;
};