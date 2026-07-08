import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in · Watchruum" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
