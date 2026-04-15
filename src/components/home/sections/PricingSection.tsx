import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { pricingTiers } from "./constants";

interface PricingSectionProps {
  onStartLauncher: () => void;
}

export function PricingSection({ onStartLauncher }: PricingSectionProps) {
  return (
    <section id="pricing" className="bg-[#0d0d18] py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white">Simple <span className="text-lime-400 drop-shadow-[0_0_20px_rgba(132,204,22,0.5)]">pricing</span></h2>
          <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Start free. Upgrade when you grow.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {pricingTiers.map((tier, i) => {
            const colors = ['lime', 'cyan', 'fuchsia'];
            const color = colors[i % colors.length];
            return (
            <Card 
              key={i} 
              className={cn(
                "relative border-2 bg-[#12121e] transition-all duration-200",
                tier.popular && "sm:scale-105 ring-1 ring-cyan-500/20",
                color === 'lime' && "border-lime-500/30",
                color === 'cyan' && "border-cyan-500/50 shadow-[0_0_25px_rgba(0,255,255,0.2)]",
                color === 'fuchsia' && "border-fuchsia-500/30"
              )}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)] text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl sm:text-2xl text-white">{tier.name}</CardTitle>
                <div className="mt-3 sm:mt-4">
                  <span className={cn(
                    "text-3xl sm:text-4xl font-bold",
                    color === 'lime' && "text-lime-400",
                    color === 'cyan' && "text-cyan-400",
                    color === 'fuchsia' && "text-fuchsia-400"
                  )}>{tier.price}</span>
                  <span className="text-gray-400 text-sm sm:text-base">{tier.period}</span>
                </div>
                <CardDescription className="mt-2 text-gray-400 text-sm">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4">
                <ul className="space-y-2.5 sm:space-y-3">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5",
                        color === 'lime' && "text-lime-400",
                        color === 'cyan' && "text-cyan-400",
                        color === 'fuchsia' && "text-fuchsia-400"
                      )} />
                      <span className="text-xs sm:text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className={cn(
                    "w-full font-bold transition-all duration-200 h-11 sm:h-10",
                    color === 'lime' && "bg-lime-500 text-black hover:bg-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.3)]",
                    color === 'cyan' && "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.3)]",
                    color === 'fuchsia' && "bg-fuchsia-500 text-black hover:bg-fuchsia-400 shadow-[0_0_15px_rgba(255,0,255,0.3)]"
                  )}
                  onClick={onStartLauncher}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
