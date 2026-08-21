import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DocsHero from "@/features/docs/components/DocsHero";
import DocumentationLayout from "@/features/docs/components/DocumentationLayout";

export default function Docs() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 animate-in fade-in duration-500">
      <Header />
      <main className="flex-1 flex flex-col">
        <DocsHero />
        <DocumentationLayout />
      </main>
      <Footer />
    </div>
  );
}
