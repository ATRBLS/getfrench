import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-6">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border shadow-2xl rounded-2xl",
            headerTitle: "text-foreground text-xl font-bold",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "bg-secondary border border-border hover:bg-muted text-foreground",
            formFieldLabel: "text-foreground text-sm",
            formFieldInput: "bg-secondary border-border text-foreground rounded-lg",
            formButtonPrimary: "bg-violet-600 hover:bg-violet-700 text-white",
            footerActionLink: "text-violet-400 hover:text-violet-300",
          },
        }}
      />
    </div>
  );
}
