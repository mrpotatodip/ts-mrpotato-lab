import { Link } from "@tanstack/react-router";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "#/components/ui/card";

import { SignUpForm } from "./auth-sign-up-form";

type SignupProps = {
  inviteCode?: string;
};

export function Signup({ inviteCode }: SignupProps) {
  return (
    <Card className="w-full max-w-sm border-0 shadow-floating">
      <CardHeader>
        <CardTitle>Start your cafe</CardTitle>
        <CardDescription>
          Have an invite code? Set up your cafe and your owner login in one step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm inviteCode={inviteCode} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have a cafe?{" "}
        <Link
          to="/signin"
          className="ml-1 font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
