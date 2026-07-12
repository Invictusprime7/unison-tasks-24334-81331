/**
 * BusinessCatalog — Business Center CRUD page.
 *
 * Route: `/business/:catalogKey` where `catalogKey` maps to a
 * `SECTION_DATA_CONTRACTS` entry via `editPath` (e.g. "services" →
 * `/business/services` → ServicesGrid contract).
 */
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessCatalogEditor } from '@/components/business-center/BusinessCatalogEditor';
import { SECTION_DATA_CONTRACTS } from '@/services/catalog/sectionDataContracts';

const CATALOG_KEY_TO_SECTION: Record<string, string> = {
  services: 'ServicesGrid',
  products: 'ProductGrid',
  menu: 'Menu',
  pricing: 'PricingTable',
  offers: 'FeaturedOffers',
  testimonials: 'Testimonials',
  portfolio: 'Portfolio',
};

export default function BusinessCatalog() {
  const { catalogKey } = useParams<{ catalogKey: string }>();
  const navigate = useNavigate();

  const sectionType = useMemo(() => {
    if (!catalogKey) return null;
    const key = CATALOG_KEY_TO_SECTION[catalogKey.toLowerCase()];
    if (!key) return null;
    return SECTION_DATA_CONTRACTS[key] ? key : null;
  }, [catalogKey]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <nav className="flex flex-wrap gap-1 text-xs">
            {Object.entries(CATALOG_KEY_TO_SECTION).map(([slug, section]) => {
              const contract = SECTION_DATA_CONTRACTS[section];
              const active = slug === catalogKey?.toLowerCase();
              return (
                <Link
                  key={slug}
                  to={`/business/${slug}`}
                  className={`rounded-full border px-3 py-1 transition ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {contract?.friendlyName ?? slug}
                </Link>
              );
            })}
          </nav>
        </div>

        {sectionType ? (
          <BusinessCatalogEditor sectionType={sectionType} />
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Unknown catalog <code>{catalogKey}</code>. Choose one above.
          </div>
        )}
      </div>
    </div>
  );
}
