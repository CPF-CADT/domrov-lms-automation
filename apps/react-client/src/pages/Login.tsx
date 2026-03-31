import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SectionWrapper from "@/components/primitives/SectionWrapper";
import { LoginCard } from "@/features/login";

/**
 * Login - Login page component.
 * Displays the login form and authentication options.
 */
export default function Login() {
  return (
    <div className="flex flex-col h-screen bg-white font-sans text-slate-800">
      <Header />
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <SectionWrapper>
          <LoginCard />
        </SectionWrapper>
      </div>
      <Footer />
    </div>
  );
}