import AdminGuide from "./AdminGuide";
import QuizGuide from "./QuizGuide";
import StudentGuide from "./StudentGuide";
import TeacherGuide from "./TeacherGuide";

/**
 * DocsContent - Main content area for documentation page.
 * Renders all user type guide sections in order.
 */
export default function DocsContent() {
  return (
    <main className="col-span-12 lg:col-span-9 pl-0 lg:pl-12 py-4">
      <div className="max-w-3xl space-y-20">
        <StudentGuide />
        <TeacherGuide />
        <AdminGuide />
        <QuizGuide />
      </div>
    </main>
  );
}
