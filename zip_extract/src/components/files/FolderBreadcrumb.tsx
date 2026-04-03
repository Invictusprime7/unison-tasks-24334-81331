import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface FolderBreadcrumbProps {
  currentFolder: string;
  onNavigate: (path: string) => void;
}

const FolderBreadcrumb = ({ currentFolder, onNavigate }: FolderBreadcrumbProps) => {
  const parts = currentFolder.split("/").filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => onNavigate("/")} className="cursor-pointer">
            <Home className="h-4 w-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>

        {parts.map((part, index) => {
          const path = "/" + parts.slice(0, index + 1).join("/");
          return (
            <span key={path} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigate(path)}
                  className="cursor-pointer"
                >
                  {part}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default FolderBreadcrumb;
