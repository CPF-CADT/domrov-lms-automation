import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleOAuthButton from "./GoogleOAuthButton";
import authService from "@/services/AuthService";

interface SignUpFormProps {
  onSuccess?: () => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: "" | "M" | "F" | "N/A";
  dob: string;
}
const initialState: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  gender: '',
  dob: '',
};

export default function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!form.firstName || !form.lastName) {
      setError('Please enter your name');
      return false;
    }
    return true;
  };

  /**
   * Handle form submission
   * Calls POST /auth/sign-up
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      await authService.signUp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        gender: form.gender || undefined,
        dob: form.dob ? new Date(form.dob) : undefined,
      });

      // Success callback if provided
      if (onSuccess) onSuccess();

      // Redirect to email verification page after successful registration
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, { replace: true });
    } catch (err: unknown) {
      // Extract error message from API response
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="public-auth-card public-signup-card">
          <div className="w-full">
            <div className="text-center mb-5">
              <p className="landing-eyebrow">Create your account</p>
              <h1 className="text-2xl md:text-3xl font-black text-primary">Join Domrov</h1>
              <p className="text-sm text-slate-600 mt-2">Set up your account to get started.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">First Name</label>
                  <input name="firstName" placeholder="First" value={form.firstName} onChange={handleChange} required className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Last Name</label>
                  <input name="lastName" placeholder="Last" value={form.lastName} onChange={handleChange} required className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Gender</label>
                  <select name="gender" value={form.gender} onChange={(e) => setForm(prev => ({ ...prev, gender: e.target.value as "" | "M" | "F" | "N/A" }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }}>
                    <option value="">Select</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Date of Birth</label>
                  <input name="dob" type="date" value={form.dob} onChange={handleChange} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }} />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Email</label>
                <input name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required type="email" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Password</label>
                  <input name="password" placeholder="Password" value={form.password} onChange={handleChange} required type="password" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Confirm</label>
                  <input name="confirmPassword" placeholder="Confirm" value={form.confirmPassword} onChange={handleChange} required type="password" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" style={{ color: '#222' }} />
                </div>
              </div>

              {error && <div className="text-red-600 text-xs mt-1 p-2 bg-red-50 rounded">{error}</div>}

              <div className="text-xs text-gray-400 text-center">or sign up with</div>
              <div className="scale-90 origin-top">
                <GoogleOAuthButton />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a href="/login" className="text-gray-500 hover:text-indigo-700 text-xs">← Back to login</a>
                <button type="submit" disabled={loading} className="text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-150 disabled:opacity-50" style={{ backgroundColor: '#0b0b3a', border: 'none' }}>
                  {loading ? 'Creating...' : 'Sign Up'}
                </button>
              </div>
            </form>
          </div>
    </section>
  );
}
