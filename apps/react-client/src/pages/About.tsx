import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
    AboutHero,
    MissionSection,
    TeamSection,
    VisionCards,
} from "@/features/about";

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