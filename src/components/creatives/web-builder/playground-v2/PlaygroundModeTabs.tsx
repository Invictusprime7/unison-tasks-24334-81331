/**
 * Mode tabs: Page Setup · Funnel Flow · Business Systems
 */

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlaygroundV2Mode } from "./types";

interface PlaygroundModeTabsProps {
  mode: PlaygroundV2Mode;
  onModeChange: (mode: PlaygroundV2Mode) => void;
}

export function PlaygroundModeTabs({ mode, onModeChange }: PlaygroundModeTabsProps) {
  return (
    <Tabs value={mode} onValueChange={(v) => onModeChange(v as PlaygroundV2Mode)}>
      <TabsList>
        <TabsTrigger value="page-setup">Page Setup</TabsTrigger>
        <TabsTrigger value="funnel-flow">Funnel Flow</TabsTrigger>
        <TabsTrigger value="systems">Business Systems</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
