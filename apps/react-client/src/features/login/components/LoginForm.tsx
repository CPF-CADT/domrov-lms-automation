import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FormField } from "@/components";
import { PrimaryButton } from "@/components/primitives";
import { useAuth } from "@/context/AuthContext";
import GoogleOAuthButton from "./GoogleOAuthButton";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  /**
   * Handle form submission
   * Calls POST /api/auth?action=login via authAPI
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err: unknown) {
      // Extract error message from API response
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Email/Password Form */}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <FormField
          id="email"
          label="Email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2 pt-1">
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Continue"}
          </PrimaryButton>
          <p className="text-xs text-slate-500 text-center">
            Sign in with your email and password to access your account.
          </p>
        </div>
      </form>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-white text-slate-500">Or continue with</span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <div className="scale-90 origin-top -my-2">
        <GoogleOAuthButton />
      </div>

      {/* Sign Up Link */}
      <div className="text-center pt-1">
        <span className="text-xs text-slate-600">Don't have an account?</span>
        <a href="/login/signup" className="ml-1 text-xs text-blue-700 hover:underline font-semibold">Sign Up</a>
      </div>
    </div>
  );
}