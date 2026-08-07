import Link from "next/link";
import { Link2 } from "lucide-react";

export function QuickActions() {
  return (
    <Link
      href="/connect-doc"
      className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-primary text-primary hover:bg-primary/10 transition-colors"
    >
      <Link2 className="w-3.5 h-3.5" />
      Connect Google Doc
    </Link>
  );
}
