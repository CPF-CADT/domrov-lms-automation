import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LoginForm from "@/pages/auth/components/LoginForm";
import "@/pages/public-pages.css";

/**
 * Login - Login page component.
 * Displays the login form and authentication options.
 */
export default function Login() {
  return (
    <div className="public-site-page public-auth-page min-h-screen flex flex-col font-sans">
      <Header variant="landing" />
      <main className="public-auth-main flex-1 flex items-center justify-center">
        <div className="public-auth-container">
          <div className="public-auth-card max-w-xl mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8">
            <div className="text-center mb-4 space-y-1">
              <p className="landing-eyebrow">Welcome back</p>
              <h1 className="text-2xl md:text-3xl font-black text-primary">Sign in to Domrov</h1>
              <p className="text-sm text-slate-600">Continue to your classes and assignments.</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
