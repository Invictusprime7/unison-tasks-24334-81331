import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import DocHelper from "./DocHelper";

interface DocHelperPanelProps {
  className?: string;
  triggerClassName?: string;
  side?: "left" | "right";
}

const DocHelperPanel = ({ 
  className, 
  triggerClassName,
  side = "right" 
}: DocHelperPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-0",
            "transition-all duration-300 hover:scale-105 active:scale-95",
            triggerClassName
          )}
        >
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Open documentation</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side={side} 
        className={cn(
          "w-[400px] sm:w-[450px] p-0 overflow-hidden",
          className
        )}
      >
        <DocHelper embedded className="h-full" />
      </SheetContent>
    </Sheet>
  );
};

export default DocHelperPanel;
