export const dynamic = "force-dynamic";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-6xl font-black text-violet-600/30 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">Page introuvable</h2>
        <p className="text-muted-foreground mb-6">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
