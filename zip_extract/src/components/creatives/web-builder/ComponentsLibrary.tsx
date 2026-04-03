import { ScrollArea } from "@/components/ui/scroll-area";
import { webBlocks } from "./webBlocks";

interface ComponentsLibraryProps {
  onAddBlock: (blockId: string) => void;
}

export const ComponentsLibrary = ({ onAddBlock }: ComponentsLibraryProps) => {
  const groupedBlocks = webBlocks.reduce((acc, block) => {
    const key = block.subcategory || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(block);
    return acc;
  }, {} as Record<string, typeof webBlocks>);

  return (
    <div className="w-80 bg-[#1a1a1a] border-r border-white/10 flex flex-col">
      {/* Components Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {Object.entries(groupedBlocks).map(([category, blocks]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">
                {category}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {blocks.map((block) => (
                  <button
                    key={block.id}
                    onClick={() => onAddBlock(block.id)}
                    className="group relative aspect-[4/3] rounded-lg border border-white/10 bg-[#0a0a0a] hover:border-white/30 transition-all overflow-hidden"
                  >
                    {/* Preview Thumbnail */}
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      <div className="w-full h-full bg-white/5 rounded border border-white/10 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-8 mx-auto bg-white/10 rounded mb-2" />
                          <div className="w-16 h-2 mx-auto bg-white/5 rounded" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-xs text-white/80 font-medium truncate">
                        {block.label}
                      </p>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
