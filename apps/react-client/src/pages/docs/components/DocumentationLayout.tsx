import DocsContent from "./DocsContent";
import DocsSidebar from "./DocsSidebar";

/**
 * DocumentationLayout - Main layout for documentation page.
 * Provides 12-column grid with sidebar and content areas.
 */
export default function DocumentationLayout() {
    return (
        <div className="flex-1 section-container w-full grid grid-cols-12 pt-8">
            <DocsSidebar />
            <DocsContent />
        </div>
    );
}
