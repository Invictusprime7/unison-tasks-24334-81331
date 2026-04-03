import React, { useState, useMemo } from "react";
import { 
  Search, 
  ChevronDown,
  ArrowLeft,
  BookOpen,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { docSections, quickLinks, type DocArticle } from "./docs-data";

interface DocHelperProps {
  className?: string;
  embedded?: boolean;
}

const DocHelper = ({ className, embedded = false }: DocHelperProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<DocArticle | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Filter sections and articles based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return docSections;

    const query = searchQuery.toLowerCase();
    return docSections
      .map((section) => ({
        ...section,
        articles: section.articles.filter((article) =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (section) =>
          section.articles.length > 0 ||
          section.title.toLowerCase().includes(query) ||
          section.description.toLowerCase().includes(query)
      );
  }, [searchQuery]);

  // Handle quick link click - find and show article
  const handleQuickLink = (sectionId: string, articleId: string) => {
    const section = docSections.find((s) => s.id === sectionId);
    const article = section?.articles.find((a) => a.id === articleId);
    if (article) {
      setSelectedArticle(article);
    }
  };

  // Handle article click - show content
  const handleArticleClick = (article: DocArticle) => {
    setSelectedArticle(article);
  };

  // Go back to menu
  const handleBack = () => {
    setSelectedArticle(null);
  };

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactElement[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-muted-foreground">
            {listItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(
          <h1 key={i} className="text-2xl font-bold mb-4 text-foreground">
            {trimmed.slice(2)}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={i} className="text-xl font-semibold mt-6 mb-3 text-foreground">
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={i} className="text-lg font-medium mt-4 mb-2 text-foreground">
            {trimmed.slice(4)}
          </h3>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.slice(2));
      } else if (/^\d+\.\s/.test(trimmed)) {
        inList = true;
        listItems.push(trimmed.replace(/^\d+\.\s/, ""));
      } else if (trimmed.startsWith("|")) {
        flushList();
        // Simple table handling
        if (!trimmed.includes("---")) {
          const cells = trimmed.split("|").filter(c => c.trim());
          elements.push(
            <div key={i} className="grid grid-cols-2 gap-2 py-1 border-b border-border text-sm">
              {cells.map((cell, j) => (
                <span key={j} className={j === 0 ? "font-medium" : "text-muted-foreground"}>
                  {cell.trim()}
                </span>
              ))}
            </div>
          );
        }
      } else if (trimmed === "") {
        flushList();
      } else {
        flushList();
        // Handle inline formatting
        const formatted = trimmed
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
        elements.push(
          <p 
            key={i} 
            className="mb-3 text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      }
    });

    flushList();
    return elements;
  };

  // If an article is selected, show its content
  if (selectedArticle) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        {/* Header with back button */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">{selectedArticle.title}</h1>
            </div>
          </div>
        </div>

        {/* Article content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl">
            {/* Article hero image */}
            {selectedArticle.image && (
              <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={selectedArticle.image} 
                  alt={selectedArticle.title}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            {renderContent(selectedArticle.content)}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">U</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Unison Docs</h1>
              <p className="text-xs text-muted-foreground">Documentation & Guides</p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-muted/50 border-muted focus-visible:bg-background"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Quick Links */}
          {!searchQuery && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quick Links
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link) => (
                  <button
                    key={link.articleId}
                    onClick={() => handleQuickLink(link.sectionId, link.articleId)}
                    className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all duration-200 group border border-primary/10 hover:border-primary/20"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {link.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Sections */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {searchQuery ? "Search Results" : "Browse by Topic"}
            </h2>
            <div className="space-y-2">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const isExpanded = expandedSections.includes(section.id);
                return (
                  <Collapsible
                    key={section.id}
                    open={isExpanded}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full text-left rounded-xl transition-all duration-200 group border overflow-hidden",
                          isExpanded 
                            ? "bg-muted border-primary/20" 
                            : "bg-card hover:bg-muted/80 border-border hover:border-primary/20 hover:shadow-sm"
                        )}
                      >
                        {/* Section thumbnail image */}
                        <div className="relative h-24 w-full overflow-hidden">
                          <img 
                            src={section.image} 
                            alt={section.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                          <div className="absolute bottom-2 left-3 flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center",
                              isExpanded ? "ring-2 ring-primary" : ""
                            )}>
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <h3 className={cn(
                              "font-semibold text-foreground drop-shadow-sm",
                              isExpanded ? "text-primary" : "group-hover:text-primary"
                            )}>
                              {section.title}
                            </h3>
                          </div>
                          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                            {section.articles.length} {section.articles.length === 1 ? 'article' : 'articles'}
                          </Badge>
                        </div>
                        {/* Section info */}
                        <div className="p-3 flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {section.description}
                          </p>
                          <ChevronDown className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2",
                            isExpanded && "rotate-180 text-primary"
                          )} />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                      <div className="pl-4 pr-2 pt-2 pb-1 space-y-1">
                        {section.articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => handleArticleClick(article)}
                              className="w-full text-left p-3 rounded-lg hover:bg-muted/80 transition-all duration-150 group border border-transparent hover:border-border flex items-center justify-between gap-3"
                            >
                              <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                {article.title}
                              </span>
                              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {filteredSections.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default DocHelper;
