import { CheckSquare } from "lucide-react";

export function FooterSection() {
  return (
    <footer className="border-t border-cyan-500/20 py-12 bg-[#0a0a12]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-bold text-white">Unison Tasks</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Support</a>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 Unison Tasks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
