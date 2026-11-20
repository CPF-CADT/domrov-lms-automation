import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DocsHero from "@/pages/docs/components/DocsHero";
import DocumentationLayout from "@/pages/docs/components/DocumentationLayout";
import "@/pages/public-pages.css";

export default function Docs() {
  return (
    <div className="public-site-page public-docs-page min-h-screen font-sans animate-in fade-in duration-500">
      <Header variant="landing" />
      <main className="flex-1 flex flex-col">
        <DocsHero />
        <DocumentationLayout />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
