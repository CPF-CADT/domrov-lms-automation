import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SignUpForm from "@/features/login/components/SignUpForm";

/**
 * Signup - Signup page component.
 * Displays the signup form for new users.
 */
export default function Signup() {
  return (
    <div className="flex flex-col h-screen bg-white font-sans text-slate-800 overflow-hidden">
      <Header />
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <SignUpForm />
      </div>
      <Footer />
    </div>
  );
}
