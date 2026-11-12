import type { Metadata } from "next";
import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthPage mode="register">
      <Suspense fallback={<CircularProgress />}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthPage>
  );
}
