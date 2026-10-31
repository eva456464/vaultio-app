import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleSignInEnabled } from "@/server/auth";
import { getBrand } from "@/server/context";

export default async function Page() {
  const brand = await getBrand();
  return <AuthForm mode="sign-up" brandName={brand.name} googleEnabled={isGoogleSignInEnabled} />;
}
