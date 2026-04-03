import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useTemplateAutomation } from '@/hooks/useTemplateAutomation';

interface ProductCardProps {
  productId: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  rating?: number;
  category?: string;
  primaryColor?: string;
  showAddToCart?: boolean;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  productId,
  name,
  price,
  description,
  imageUrl,
  rating,
  category,
  primaryColor = '#3b82f6',
  showAddToCart = true,
  onAddToCart
}) => {
  const { addToCart, loading } = useTemplateAutomation();

  const handleAddToCart = async () => {
    await addToCart(productId);
    onAddToCart?.();
  };

  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-square bg-muted">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
        {category && (
          <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded">
            {category}
          </span>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold truncate">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {description}
          </p>
        )}
        {rating && (
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star 
                key={i}
                className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">({rating})</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <span className="text-lg font-bold" style={{ color: primaryColor }}>
          ${price.toFixed(2)}
        </span>
        {showAddToCart && (
          <Button 
            size="sm"
            className="text-white"
            style={{ backgroundColor: primaryColor }}
            onClick={handleAddToCart}
            disabled={loading}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
