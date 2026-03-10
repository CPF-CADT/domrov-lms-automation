"use client";

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import ClassGrid from "@/features/dashboard/components/ClassGrid";
import StatusFilters from "@/features/dashboard/components/TermFilters";
import JoinClassModal from "@/features/dashboard/components/JoinClassModal";
import DeleteConfirmModal from "@/features/dashboard/components/DeleteConfirmModal";
import { useDashboardFilters } from "@/hooks";
import classService from "@/services/classService";
import type { ClassCard } from "@/types/classCard";

export default function DashboardClient() {
  const navigate = useNavigate();
  const [classList, setClassList] = useState<ClassCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const classes = await classService.getMyClasses();
        // Map API response to ClassCard format
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
    (id: string, role?: string) => navigate(`/class/${id}`, { state: { role } }),
    [],
  );

  const handleJoinClass = useCallback(
    async (code: string) => {
      try {
        const result = await classService.joinClassByCode({ joinCode: code });
        alert(`Successfully joined class: ${result.className}`);
        // Refresh class list
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
      // Remove from local state
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
      <div className="flex items-center justify-center flex-1">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-4 mx-auto"></div>
          <p className="text-slate-500">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        activeStatus={activeStatus}
        onChangeStatus={setActiveStatus}
        onJoinClass={() => setIsJoinModalOpen(true)}
      />

      <main className="px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Classes</h2>
            <p className="text-sm text-slate-500">
              Browse and manage your cohorts
            </p>
          </div>
          <StatusFilters activeStatus={activeStatus} onChange={setActiveStatus} />
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 mt-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <ClassGrid items={filteredClasses} onOpen={(id) => {
            const classItem = filteredClasses.find(c => c.id.toString() === id);
            handleOpen(id, classItem?.role);
          }} />
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
    </>
  );
}
