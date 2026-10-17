import { Link } from "@tanstack/react-router";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "#/components/ui/card";

import { SigninForm } from "./auth-signin-form";

type SigninProps = {
  verificationSent?: boolean;
  verificationConfirmed?: boolean;
  verificationError?: string;
};

const VERIFICATION_ERROR_MESSAGES = new Map<string, string>(Object.entries({
  TOKEN_EXPIRED:
    "That verification link expired. Sign in below and we'll send you a fresh one.",
  INVALID_TOKEN: "That verification link is invalid or already used.",
  USER_NOT_FOUND: "We couldn't find an account for that verification link.",
}));

export function Signin({
  verificationSent,
  verificationConfirmed,
  verificationError,
}: SigninProps) {
  return (
    <Card className="w-full max-w-sm border-0 shadow-floating">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {verificationSent && (
          <div className="rounded-md bg-status-success-soft px-3 py-2 text-sm text-status-success">
            We&apos;ve sent a verification link to your email. Click it to
            activate your account, then sign in below.
          </div>
        )}
        {verificationConfirmed && (
          <div className="rounded-md bg-status-success-soft px-3 py-2 text-sm text-status-success">
            Your email is verified. Sign in below.
          </div>
        )}
        {verificationError && (
          <div className="rounded-md bg-status-danger-soft px-3 py-2 text-sm text-status-danger">
            {VERIFICATION_ERROR_MESSAGES.get(verificationError) ??
              "We couldn't verify your email. Sign in below and we'll send you a fresh link."}
          </div>
        )}
        <SigninForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/signup"
          className="ml-1 font-medium text-foreground underline underline-offset-4"
        >
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
