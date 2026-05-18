"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, ChevronRight } from "lucide-react";

export function HeroCTA() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="h-14 w-56 rounded-xl skeleton" />
        <div className="h-14 w-56 rounded-xl skeleton" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {isSignedIn ? (
        <Link href="/dashboard">
          <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
            <Zap className="w-5 h-5" fill="currentColor" />
            Aller au dashboard
          </Button>
        </Link>
      ) : (
        <Link href="/sign-up">
          <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
            <Zap className="w-5 h-5" fill="currentColor" />
            Commencer gratuitement
          </Button>
        </Link>
      )}
      <a href="#how">
        <Button variant="outline" size="xl" className="gap-2">
          Voir comment ça marche
          <ChevronRight className="w-5 h-5" />
        </Button>
      </a>
    </div>
  );
}

export function NavAuthButtons() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <div className="w-24 h-9 rounded-lg skeleton" />;

  if (isSignedIn) {
    return (
      <Link href="/dashboard">
        <Button variant="violet" size="sm" className="gap-1.5">
          Dashboard <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/sign-in">
        <Button variant="ghost" size="sm">Se connecter</Button>
      </Link>
      <Link href="/sign-up">
        <Button variant="violet" size="sm" className="gap-1.5">
          Commencer <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}

export function PlanCTA({ highlighted }: { highlighted: boolean }) {
  const { isSignedIn } = useAuth();
  const variant = highlighted ? "violet" : "outline";

  if (isSignedIn) {
    return (
      <Link href="/dashboard">
        <Button variant={variant as "violet" | "outline"} className="w-full">
          Aller au dashboard
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/sign-up">
      <Button variant={variant as "violet" | "outline"} className="w-full">
        {highlighted ? "Démarrer en Pro" : "Commencer gratuitement"}
      </Button>
    </Link>
  );
}

export function FinalCTA() {
  const { isSignedIn } = useAuth();

  return isSignedIn ? (
    <Link href="/new-project">
      <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
        <Zap className="w-5 h-5" fill="currentColor" />
        Créer mon premier projet
      </Button>
    </Link>
  ) : (
    <Link href="/sign-up">
      <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
        <Zap className="w-5 h-5" fill="currentColor" />
        Commencer gratuitement
      </Button>
    </Link>
  );
}
