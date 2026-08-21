import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainNavigation from "@/components/navigation/Navigation";
import { MOCK_ASSIGNMENT } from "@/config";
import { useSubmissions, useZipExtractor } from "@/hooks";
import { ClassSidebar } from "@/features/classDashboard";
import AssignmentHeader from "@/features/assignment/AssignmentHeader";
import AssignmentInstructions from "@/features/assignment/AssignmentInstructions";
import CodeEditorView from "@/features/assignment/CodeEditorView";
import ReferenceMaterials from "@/features/assignment/ReferenceMaterials";
import StudentPortal from "@/features/assignment/StudentPortal";
import type { UploadedFile } from "@/features/assignment/UploadSection";

type TabId = "general" | "assignment" | "posts" | "students" | "teams" | "files" | "grades";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assignmentId = id || "";

  const [activeTab] = useState<TabId>("assignment");

  const classId = "flutter";

  const { uploadedFiles, addFiles, removeFile } = useSubmissions(assignmentId, "1");
  const { editorFiles, showCodeEditor, extractAndOpen, openFileInEditor, closeEditor } = useZipExtractor();

  const handleTabChange = () => {
    navigate(`/class/${classId}`);
  };

  const handleUploadComplete = useCallback((data: unknown) => {
    console.log("Upload complete:", data);
  }, []);

  const handleFileClick = useCallback(async (file: UploadedFile) => {
    if (!file.path) return;

    if (file.name.toLowerCase().endsWith(".zip")) {
      try {
        await extractAndOpen();
      } catch {
        alert("Could not extract ZIP file.");
      }
    } else {
      try {
        await openFileInEditor(file.path, file.name);
      } catch {
        alert("Could not preview file. The file might not be accessible.");
      }
    }
  }, [extractAndOpen, openFileInEditor]);

  const assignment = MOCK_ASSIGNMENT;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <div className="flex-1 flex flex-col min-w-0">
        {showCodeEditor && (
          <CodeEditorView
            files={editorFiles}
            onClose={closeEditor}
          />
        )}

        <div className={`h-screen bg-white flex overflow-hidden ${showCodeEditor ? 'hidden' : ''}`}>
          <ClassSidebar classId={classId} activeTab={activeTab} onTabChange={handleTabChange} />

          <div className="flex-1 flex flex-col min-w-0">
            <AssignmentHeader />

            <div className="flex-1 overflow-y-auto bg-slate-50">
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">{assignment.title}</h1>
                      <p className="text-slate-600">{assignment.description}</p>
                    </div>
                    <AssignmentInstructions
                      dueDate={assignment.dueDate}
                      objective={assignment.objective}
                    />
                    <ReferenceMaterials materials={assignment.referenceMaterials} />
                  </div>

                  <div className="space-y-6">
                    <StudentPortal
                      status={assignment.status}
                      progress={assignment.progress}
                      progressPercent={assignment.progressPercent}
                      submittedAt={assignment.submittedAt}
                      uploadedFiles={uploadedFiles}
                      onFilesAdded={addFiles}
                      onFileRemoved={removeFile}
                      assignmentId={assignmentId}
                      submissionId={assignment.submissionId}
                      onUploadComplete={handleUploadComplete}
                      onFileClick={handleFileClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
