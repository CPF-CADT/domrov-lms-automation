"use client";

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import ClassGrid from "@/features/dashboard/components/ClassGrid";
import StatusFilters from "@/features/dashboard/components/TermFilters";
import JoinClassModal from "@/features/dashboard/components/JoinClassModal";
import DeleteConfirmModal from "@/features/dashboard/components/DeleteConfirmModal";
import { useDashboardFilters } from "@/hooks";
import classService from "@/services/classService";
import type { ClassCard } from "@/types/classCard";

interface ClassesDetailProps {
  onBack: () => void;
}

export default function ClassesDetail({ onBack }: ClassesDetailProps) {
  const navigate = useNavigate();
  const [classList, setClassList] = useState<ClassCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | number | null>(null);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const classes = await classService.getMyClasses();
        const mappedClasses: ClassCard[] = classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          coverImageUrl: c.coverImageUrl,
          joinCode: c.joinCode,
          status: c.status,
          owner: c.owner,
          role: c.role,
          createdAt: c.createdAt?.toString(),
        }));
        setClassList(mappedClasses);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
        setClassList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const { activeStatus, setActiveStatus, filteredClasses } =
    useDashboardFilters(classList);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    classId: string | null;
    className: string;
  }>({ isOpen: false, classId: null, className: "" });

  const handleOpen = useCallback(
    (id: string, role?: string) => {
      setActiveClassId(id);
      navigate(`/class/${id}`, { state: { role } });
    },
    [navigate],
  );

  const handleJoinClass = useCallback(
    async (code: string) => {
      try {
        const result = await classService.joinClassByCode({ joinCode: code });
        alert(`Successfully joined class: ${result.className}`);
        const classes = await classService.getMyClasses();
        const mappedClasses: ClassCard[] = classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          coverImageUrl: c.coverImageUrl,
          joinCode: c.joinCode,
          status: c.status,
          owner: c.owner,
          role: c.role,
          createdAt: c.createdAt?.toString(),
        }));
        setClassList(mappedClasses);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to join class");
      }
      setIsJoinModalOpen(false);
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModalState.classId) return;
    try {
      await classService.deleteClass(parseInt(deleteModalState.classId));
      setClassList(prev => prev.filter(c => c.id.toString() !== deleteModalState.classId));
      setDeleteModalState({ isOpen: false, classId: null, className: "" });
    } catch (err) {
      alert("Error deleting class: " + (err instanceof Error ? err.message : err));
    }
  }, [deleteModalState.classId]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalState({ isOpen: false, classId: null, className: "" });
  }, []);

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-4 mx-auto"></div>
            <p className="text-slate-500">Loading classes...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="flex items-center justify-center transition-colors rounded-lg w-9 h-9 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Classes</h1>
            <p className="mt-2 text-slate-600">
              Browse and manage your cohorts
            </p>
          </div>
        </div>

        <main className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <StatusFilters activeStatus={activeStatus} onChange={setActiveStatus} />
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              + Join Class
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <ClassGrid 
              items={filteredClasses} 
              onOpen={(id) => {
                const classItem = filteredClasses.find(c => c.id.toString() === id);
                handleOpen(id, classItem?.role);
              }}
              activeClassId={activeClassId}
              onEdit={(id) => {
                console.log("Edit class:", id);
              }}
              onViewMembers={(id) => {
                console.log("View members for class:", id);
              }}
              onLeaveClass={(id) => {
                console.log("Leave class:", id);
              }}
              onDeleteClass={(id) => {
                console.log("Delete class:", id);
              }}
              onShareClass={(id) => {
                console.log("Share class:", id);
              }}
            />
          </div>

          {!error && filteredClasses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No classes found. Join or create a class to get started.</p>
            </div>
          )}
        </main>

        <JoinClassModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onJoin={handleJoinClass}
        />

        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen}
          className={deleteModalState.className}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </div>
    </AnimatedPage>
  );
}
