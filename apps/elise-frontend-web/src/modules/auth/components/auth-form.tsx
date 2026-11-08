import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShellBrand } from "#/modules/shell";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { signIn, signUp } from "../api";
import { SignInSchema, SignUpInputSchema } from "../schemas";

const COPY = {
  signin: { title: "Sign in", hint: "Enter your details to continue.", submit: "Sign in", swap: "Create an account", to: "/signup" },
  signup: { title: "Create an account", hint: "You need an invite code to join.", submit: "Create account", swap: "I already have an account", to: "/signin" },
} as const;

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  const copy = COPY[mode];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parsed =
      mode === "signup"
        ? SignUpInputSchema.safeParse({ inviteCode, firstName, lastName, email, password, accountName, timezone })
        : SignInSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setPending(true);
    try {
      if (mode === "signup") await signUp({ data: SignUpInputSchema.parse(parsed.data) });
      else await signIn({ data: SignInSchema.parse(parsed.data) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      return;
    } finally {
      setPending(false);
    }
    await router.invalidate();
    await navigate({ to: "/overview" });
  };

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-sm content-center gap-8 p-6">
      <div className="justify-self-center text-center">
        <ShellBrand />
      </div>
      <Card className="shadow-raised">
        <CardHeader className="gap-1.5 px-6 pb-9 pt-6">
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{copy.hint}</p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            {mode === "signup" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="inviteCode">Invite code</Label>
                  <Input id="inviteCode" autoComplete="off" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountName">Account name</Label>
                  <Input id="accountName" autoComplete="organization" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
              {pending ? "Please wait…" : copy.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Link to={copy.to} className="justify-self-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {copy.swap}
      </Link>
    </main>
  );
}
