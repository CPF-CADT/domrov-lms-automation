import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SignUpForm from "@/pages/auth/components/SignUpForm";
import "@/pages/public-pages.css";

/**
 * Signup - Signup page component.
 * Displays the signup form for new users.
 */
export default function Signup() {
  return (
    <div className="public-site-page public-auth-page min-h-screen flex flex-col font-sans">
      <Header variant="landing" />
      <main className="public-auth-main flex-1 flex items-center justify-center">
        <SignUpForm />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
