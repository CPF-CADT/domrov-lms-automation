import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import MainNavigation from "@/components/navigation/MainNavigation";
import { MOCK_ASSIGNMENT } from "@/config/Assignment";
import ClassSidebar from "@/pages/classes/components/ClassSidebar";
import AssignmentHeader from "@/pages/assignments/components/AssignmentHeader";
import AssignmentInstructions from "@/pages/assignments/components/AssignmentInstructions";
import ReferenceMaterials from "@/pages/assignments/components/ReferenceMaterials";
import StudentPortal from "@/pages/assignments/components/StudentPortal";
import type { UploadedFile } from "@/pages/assignments/components/UploadSection";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = id || "";


  const classId = "flutter";

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const addFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFiles((current) => [...current, ...files]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }, []);

  const handleUploadComplete = useCallback((data: unknown) => {
    console.log("Upload complete:", data);
  }, []);

  const assignment = MOCK_ASSIGNMENT;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-screen bg-white flex overflow-hidden">
          <ClassSidebar classId={classId} />

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
