import Badge from "@/components/data-display/Badge";
import LoginForm from "./LoginForm";

/**
 * LoginCard - Container card for the login form.
 * Displays mock login notice and link to skip to pricing.
 */
export default function LoginCard() {
  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8">
      <div className="text-center mb-4 space-y-1">
        <Badge label="MOCK LOGIN" variant="primary" />
        <h1 className="text-2xl md:text-3xl font-black text-primary">Sign in to Domrov</h1>
      </div>

      <LoginForm />
    </div>
  );
}
