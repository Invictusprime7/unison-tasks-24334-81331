import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import type { Timeline as TimelineType, Track, Clip } from "@/types/document";

interface TimelineProps {
  timeline: TimelineType;
  onTimelineChange: (timeline: TimelineType) => void;
  currentTime: number;
  onTimeChange: (time: number) => void;
}

export const Timeline = ({
  timeline,
  onTimelineChange,
  currentTime,
  onTimeChange,
}: TimelineProps) => {
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        const newTime = currentTime + (1 / timeline.fps);
        if (newTime >= timeline.duration) {
          setPlaying(false);
          onTimeChange(0);
        } else {
          onTimeChange(newTime);
        }
      }, 1000 / timeline.fps);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [playing, timeline.fps, timeline.duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * timeline.fps);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  };

  const pixelsPerSecond = 100 * zoom;
  const totalWidth = timeline.duration * pixelsPerSecond;

  return (
    <div className="flex flex-col h-full bg-card border-t">
      {/* Playback controls */}
      <div className="h-12 border-b flex items-center gap-2 px-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTimeChange(0)}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTimeChange(timeline.duration)}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <div className="text-sm font-mono ml-4">
          {formatTime(currentTime)} / {formatTime(timeline.duration)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Zoom:</span>
          <Slider
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            min={0.5}
            max={4}
            step={0.1}
            className="w-32"
          />
        </div>
      </div>

      {/* Timeline tracks */}
      <ScrollArea className="flex-1">
        <div className="relative" style={{ width: totalWidth }}>
          {/* Time ruler */}
          <div className="h-8 border-b bg-muted/30 relative">
            {Array.from({ length: Math.ceil(timeline.duration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-border"
                style={{ left: i * pixelsPerSecond }}
              >
                <span className="text-xs text-muted-foreground ml-1">{i}s</span>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{ left: currentTime * pixelsPerSecond }}
          />

          {/* Tracks */}
          {timeline.tracks.map((track) => (
            <div key={track.id} className="h-16 border-b relative">
              <div className="absolute left-0 w-32 h-full bg-muted/50 border-r flex items-center px-2">
                <span className="text-sm font-medium capitalize">{track.type}</span>
              </div>
              <div className="ml-32 h-full relative">
                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="absolute h-12 top-2 bg-primary/20 border border-primary rounded cursor-move"
                    style={{
                      left: clip.start * pixelsPerSecond,
                      width: (clip.out - clip.in) * pixelsPerSecond,
                    }}
                  >
                    <div className="px-2 py-1 text-xs truncate">
                      {clip.src.split("/").pop()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
