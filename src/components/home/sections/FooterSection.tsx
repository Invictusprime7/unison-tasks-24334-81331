import { CheckSquare } from "lucide-react";

export function FooterSection() {
  return (
    <footer className="border-t border-cyan-500/20 py-8 sm:py-12 bg-[#0a0a12]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
            <span className="text-base sm:text-lg font-bold text-white">Unison Tasks</span>
          </div>
          <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
            <a href="#" className="hover:text-cyan-400 transition-colors py-1">Privacy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors py-1">Terms</a>
            <a href="#" className="hover:text-cyan-400 transition-colors py-1">Support</a>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            © 2025 Unison Tasks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
