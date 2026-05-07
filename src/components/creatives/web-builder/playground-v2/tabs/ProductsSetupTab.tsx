/**
 * ProductsSetupTab — products & services attached or available to the active page.
 * Read-only inventory derived from CreatorData.
 */

import { Badge } from "@/components/ui/badge";
import { Package, Wrench } from "lucide-react";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2Config, PlaygroundV2DerivedPageView } from "../types";

interface ProductsSetupTabProps {
  view: PlaygroundV2DerivedPageView;
  config: PlaygroundV2Config;
}

export function ProductsSetupTab({ view, config }: ProductsSetupTabProps) {
  const products = config.products;
  const services = config.services;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Products & Services</h2>
        <p className="text-sm text-muted-foreground">
          Inventory available to bind on {view.page.title}. Editing comes online next milestone.
        </p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4 text-muted-foreground" />
          Products ({products.length})
        </div>
        {products.length === 0 ? (
          <SetupStatusCard
            title="No products defined"
            description="Add products to enable checkout CTAs and product grids."
            severity="warn"
          />
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <SetupStatusCard
                key={p.productId}
                title={p.name}
                description={p.description?.slice(0, 120)}
                severity={p.inStock ? "ok" : "warn"}
                meta={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {p.currency} {p.price}
                    </Badge>
                    {p.billingType && (
                      <Badge variant="outline" className="text-[10px]">
                        {p.billingType}
                      </Badge>
                    )}
                    {p.featured && (
                      <Badge variant="secondary" className="text-[10px]">
                        featured
                      </Badge>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Services ({services.length})
        </div>
        {services.length === 0 ? (
          <SetupStatusCard
            title="No services defined"
            description="Add services to enable booking flows."
            severity="warn"
          />
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <SetupStatusCard
                key={s.serviceId}
                title={s.name}
                description={s.description?.slice(0, 120)}
                severity={s.bookable ? "ok" : "warn"}
                meta={
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.duration != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {s.duration} min
                      </Badge>
                    )}
                    {s.price != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {s.currency ?? ""} {s.price}
                      </Badge>
                    )}
                    {s.bookable && (
                      <Badge variant="secondary" className="text-[10px]">
                        bookable
                      </Badge>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
