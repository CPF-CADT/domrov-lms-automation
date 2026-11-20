import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AboutHero from "@/pages/about/components/AboutHero";
import MissionSection from "@/pages/about/components/MissionSection";
import TeamSection from "@/pages/about/components/TeamSection";
import VisionCards from "@/pages/about/components/VisionCards";
import "@/pages/public-pages.css";

/**
 * About - About page component.
 * Displays information about the company/team.
 */
export default function About() {
    return (
        <div className="public-site-page public-about-page min-h-screen font-sans animate-in fade-in duration-500">
            <Header variant="landing" />
            <main>
                <AboutHero />
                <VisionCards />
                <MissionSection />
                <TeamSection />
            </main>
            <Footer variant="landing" />
        </div>
    );
}
