import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DifferenceSection() {
  return (
    <section className="bg-[#0d0d18] py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border border-purple-500/30">Why Unison Tasks</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Templates are dead. <span className="text-lime-400 drop-shadow-[0_0_20px_rgba(132,204,22,0.5)]">Systems are alive.</span>
            </h2>
            <p className="text-lg text-gray-400">
              Other tools give you static pages. We give you running businesses.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Old Way */}
            <Card className="border-red-500/30 bg-red-500/5">
              <div className="p-6">
                <h3 className="text-lg text-red-400 font-semibold mb-4">❌ Static Templates</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>• Buttons don't do anything</p>
                  <p>• Forms need manual wiring</p>
                  <p>• Payments require integration</p>
                  <p>• Booking needs separate app</p>
                  <p>• Weeks of development work</p>
                </div>
              </div>
            </Card>

            {/* New Way */}
            <Card className="border-lime-500/50 bg-lime-500/5 shadow-[0_0_20px_rgba(132,204,22,0.1)]">
              <div className="p-6">
                <h3 className="text-lg text-lime-400 font-semibold mb-4">✓ Unison Systems</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>• Buttons pre-wired to actions</p>
                  <p>• Forms auto-submit to CRM</p>
                  <p>• Payments work out of box</p>
                  <p>• Booking calendar included</p>
                  <p>• Backend packs installed automatically</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
