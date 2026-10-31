import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";
import { emailConfigured } from "@/server/invites";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm emailEnabled={emailConfigured()} />;
}
