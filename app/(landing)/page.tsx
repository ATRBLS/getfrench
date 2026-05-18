"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { t, type Lang } from "@/lib/translations";
import {
  Zap, CheckCircle2, Clock, Shield, Plug, Code2, Github, Star, ChevronRight, ArrowRight,
} from "lucide-react";

const FEATURE_ICONS = [Zap, Shield, Plug, Code2, Clock, Github];

const SERVICES = [
  { name: "Vercel", color: "text-white", bg: "bg-white/10" },
  { name: "Supabase", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { name: "Stripe", color: "text-violet-400", bg: "bg-violet-500/10" },
  { name: "Resend", color: "text-white", bg: "bg-white/10" },
  { name: "GitHub", color: "text-white", bg: "bg-white/10" },
  { name: "OpenAI", color: "text-teal-400", bg: "bg-teal-500/10" },
  { name: "Anthropic", color: "text-orange-400", bg: "bg-orange-500/10" },
  { name: "Clerk", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { name: "PostHog", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { name: "Railway", color: "text-white", bg: "bg-white/10" },
  { name: "Upstash", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { name: "ElevenLabs", color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
          lang === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("fr")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
          lang === "fr" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        FR
      </button>
    </div>
  );
}

function DemoMockup({ lang }: { lang: Lang }) {
  const tr = t[lang].demo;
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-0 bg-violet-600/20 blur-3xl rounded-3xl" />
      <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-[#0f0f0f]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0a0a0a]">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-xs text-muted-foreground font-mono">stacklaunch.app/new-project</span>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Project name</p>
            <div className="h-10 rounded-lg border border-violet-500/40 bg-violet-600/5 px-3 flex items-center">
              <span className="text-sm font-mono text-violet-300">my-saas-2024</span>
              <span className="ml-0.5 w-0.5 h-4 bg-violet-400 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Stack: SaaS Standard</p>
            <div className="flex gap-2 flex-wrap">
              {["Vercel", "Supabase", "Stripe", "Resend", "GitHub"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-600/30 text-violet-300 text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {[
              { name: "GitHub", status: "done" },
              { name: "Supabase", status: "done" },
              { name: "Vercel", status: "active" },
              { name: "Stripe", status: "pending" },
              { name: "Resend", status: "pending" },
            ].map((step) => (
              <div key={step.name} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${step.status === "done" ? "bg-emerald-500" : step.status === "active" ? "bg-violet-500 animate-pulse" : "bg-zinc-600"}`} />
                <span className="text-xs text-muted-foreground flex-1">{step.name}</span>
                <span className="text-xs">
                  {step.status === "done" && <span className="text-emerald-400">✓ {tr.step1}</span>}
                  {step.status === "active" && <span className="text-violet-400">{tr.step2}</span>}
                  {step.status === "pending" && <span className="text-muted-foreground">{tr.step3}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-[#0a0a0a] border border-white/5 p-3">
            <p className="text-xs text-muted-foreground mb-2">{tr.envTitle}</p>
            <div className="font-mono text-xs space-y-0.5">
              <p><span className="text-muted-foreground">VERCEL_PROJECT_ID</span>=<span className="text-violet-400 blur-[2px]">prj_xxxxx</span></p>
              <p><span className="text-muted-foreground">SUPABASE_URL</span>=<span className="text-emerald-400 blur-[2px]">https://xxx.supabase.co</span></p>
              <p><span className="text-muted-foreground">STRIPE_SECRET_KEY</span>=<span className="text-violet-400">sk_live_••••••••</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en");
  const { isSignedIn, isLoaded } = useAuth();
  const tr = t[lang];

  return (
    <div className="min-h-screen bg-mesh text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-lg">StackLaunch</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{tr.nav.features}</a>
            <a href="#how" className="hover:text-foreground transition-colors">{tr.nav.how}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{tr.nav.pricing}</a>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            {!isLoaded ? (
              <div className="w-24 h-9 rounded-lg skeleton" />
            ) : isSignedIn ? (
              <Link href="/dashboard">
                <Button variant="violet" size="sm" className="gap-1.5">
                  {tr.nav.dashboard} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">{tr.nav.signIn}</Button>
                </Link>
                <Link href="/sign-up">
                  <Button variant="violet" size="sm" className="gap-1.5">
                    {tr.nav.getStarted} <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="violet" className="mb-6 px-4 py-1.5 text-sm gap-2">
              <Star className="w-3.5 h-3.5" fill="currentColor" />
              {tr.hero.badge}
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.08]">
              {tr.hero.title1}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
                {tr.hero.titleAccent}
              </span>
              ,<br />{tr.hero.title2}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {tr.hero.subtitle.split(tr.hero.subtitleBold)[0]}
              <span className="text-foreground font-medium">{tr.hero.subtitleBold}</span>
              {tr.hero.subtitle.split(tr.hero.subtitleBold)[1]}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {isSignedIn ? (
                <Link href="/dashboard">
                  <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
                    <Zap className="w-5 h-5" fill="currentColor" />
                    {tr.hero.ctaDashboard}
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-up">
                  <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
                    <Zap className="w-5 h-5" fill="currentColor" />
                    {tr.hero.cta}
                  </Button>
                </Link>
              )}
              <a href="#how">
                <Button variant="outline" size="xl" className="gap-2">
                  {tr.hero.ctaHow} <ChevronRight className="w-5 h-5" />
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{tr.hero.subCta}</p>
          </div>
          <DemoMockup lang={lang} />
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">{tr.hero.servicesLabel}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SERVICES.map((s) => (
                <span key={s.name} className={`px-3 py-1.5 rounded-lg border border-white/5 text-sm font-medium ${s.bg} ${s.color}`}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="destructive" className="mb-4">{tr.problem.badge}</Badge>
          <h2 className="text-3xl font-bold mb-6">{tr.problem.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {tr.problem.items.map((item) => (
              <Card key={item.title} className="glass border-red-500/10 bg-red-500/5">
                <CardContent className="p-5">
                  <span className="text-3xl mb-3 block">{item.emoji}</span>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 p-6 rounded-2xl border border-red-500/15 bg-red-500/5">
            <p className="text-muted-foreground">
              {tr.problem.footer}
              <span className="text-red-400 font-semibold">{tr.problem.footerBold}</span>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="violet" className="mb-4">{tr.how.badge}</Badge>
            <h2 className="text-3xl font-bold">{tr.how.title}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {tr.how.steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < tr.how.steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-violet-600/30 to-transparent" />
                )}
                <div className="text-4xl font-black text-violet-600/30 mb-3">{step.num}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="violet" className="mb-4">{tr.features.badge}</Badge>
            <h2 className="text-3xl font-bold">{tr.features.title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tr.features.items.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <Card key={f.title} className="glass hover:border-violet-600/20 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-600/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="violet" className="mb-4">{tr.pricing.badge}</Badge>
            <h2 className="text-3xl font-bold">{tr.pricing.title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tr.pricing.plans.map((plan, i) => {
              const highlighted = i === 1;
              return (
                <Card key={plan.name} className={highlighted ? "glass border-violet-500/40 shadow-2xl shadow-violet-900/20 relative" : "glass"}>
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="violet" className="shadow-lg">{tr.pricing.recommended}</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                    </div>
                    <Separator className="mb-6" />
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/sign-up">
                      <Button variant={highlighted ? "violet" : "outline"} className="w-full">
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="p-12 rounded-3xl border border-violet-600/20 bg-violet-600/5 glow-purple">
            <h2 className="text-4xl font-bold mb-4">{tr.finalCta.title}</h2>
            <p className="text-muted-foreground mb-8 text-lg">{tr.finalCta.subtitle}</p>
            {isSignedIn ? (
              <Link href="/new-project">
                <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
                  <Zap className="w-5 h-5" fill="currentColor" />
                  {tr.finalCta.ctaDashboard}
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button variant="violet" size="xl" className="gap-2 shadow-2xl shadow-violet-900/40">
                  <Zap className="w-5 h-5" fill="currentColor" />
                  {tr.finalCta.cta}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" fill="currentColor" />
            </div>
            <span className="font-bold">StackLaunch</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} StackLaunch. {tr.footer.tagline}</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{tr.footer.privacy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{tr.footer.terms}</a>
            <a href="#" className="hover:text-foreground transition-colors">{tr.footer.contact}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
