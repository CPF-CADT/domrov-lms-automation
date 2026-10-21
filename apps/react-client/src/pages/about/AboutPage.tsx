import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AboutHero from "@/pages/about/components/AboutHero";
import MissionSection from "@/pages/about/components/MissionSection";
import TeamSection from "@/pages/about/components/TeamSection";
import VisionCards from "@/pages/about/components/VisionCards";

/**
 * About - About page component.
 * Displays information about the company/team.
 */
export default function About() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-800 animate-in fade-in duration-500">
            <Header />
            <main>
                <AboutHero />
                <VisionCards />
                <MissionSection />
                <TeamSection />
            </main>
            <Footer />
        </div>
    );
}
