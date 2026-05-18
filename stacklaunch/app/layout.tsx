import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StackLaunch — Lance ton SaaS en 1 clic",
  description:
    "Connecte Vercel, Supabase, Stripe et 20+ services une fois. On crée tous tes projets automatiquement.",
  keywords: ["SaaS", "boilerplate", "Vercel", "Supabase", "Stripe", "developer tools"],
  openGraph: {
    title: "StackLaunch",
    description: "Lance ton SaaS en 1 clic, pas en 2 jours.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "pk_test_build_placeholder_00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}>
      <html lang="fr" className="dark">
        <body className={`${inter.variable} font-sans bg-background text-foreground`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
