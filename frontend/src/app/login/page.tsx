import type { Metadata } from "next";
import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthPage mode="login">
      <Suspense fallback={<CircularProgress />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthPage>
  );
}
