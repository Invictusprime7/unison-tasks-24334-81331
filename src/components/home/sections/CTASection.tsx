import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CTASectionProps {
  onStartLauncher: () => void;
}

export function CTASection({ onStartLauncher }: CTASectionProps) {
  return (
    <section className="py-20 bg-[#0a0a12]">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-lime-500/20 border border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ready to <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">launch?</span></h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Pick a business type. We'll handle the rest.
            </p>
            <Button 
              size="lg" 
              onClick={onStartLauncher}
              className={cn(
                "text-lg px-8 h-14 bg-cyan-500 text-black font-bold",
                "shadow-[0_0_25px_rgba(0,255,255,0.5)]",
                "hover:bg-cyan-400 hover:shadow-[0_0_35px_rgba(0,255,255,0.7)]",
                "active:scale-95 transition-all duration-200"
              )}
            >
              <Zap className="mr-2 h-5 w-5" />
              Launch Your System
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
