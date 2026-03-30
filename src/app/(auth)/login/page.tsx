"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    if (!trimmedPassword) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: trimmedEmail,
        password: trimmedPassword,
        redirect: false,
      });

      if (!result) {
        setError("Something went wrong. Please try again.");
        return;
      }

      if (result.error) {
        if (result.code === "rate_limited") {
          setError("Too many login attempts. Please try again in 15 minutes.");
        } else {
          setError("Invalid email or password.");
        }
        return;
      }

      if (result.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      setError("Unable to sign in. Please try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
        <CardDescription>Sign in to continue to DailyDay</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {registered ? (
            <p
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
              role="status"
            >
              Account created. You can sign in now.
            </p>
          ) : null}

          {error ? (
            <p
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              aria-invalid={error ? true : undefined}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
