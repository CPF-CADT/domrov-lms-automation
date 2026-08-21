import { useEffect, useState, useRef } from "react";
import CreateTeamModal from "../components/CreateTeamModal";
import teamService from "@/services/teamService";
import axiosInstance from "@/lib/axiosInstance";
import type { TeamResponseDto } from "@/types/team";

// ── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string | null;
}

interface TeamsTabProps {
  classId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

// ── Avatar ────────────────────────────────────────────────────────────────────

const UserAvatar = ({
  user,
  size = "md",
}: {
  user: { firstName: string; lastName: string; profilePictureUrl?: string | null };
  size?: "sm" | "md";
}) => {
  const dim = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  if (user.profilePictureUrl) {
    return (
      <img
        src={user.profilePictureUrl}
        alt={`${user.firstName} ${user.lastName}`}
        className={`${dim} rounded-full object-cover shrink-0`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary`}
    >
      {getInitials(user.firstName, user.lastName)}
    </div>
  );
};

// ── Student Pill (draggable) ──────────────────────────────────────────────────

const StudentPill = ({
  student,
  onDragStart,
  compact = false,
  onRemove,
}: {
  student: Student;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
  onRemove?: () => void;
}) => (
  <div
    draggable={!!onDragStart}
    onDragStart={onDragStart}
    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all select-none
      ${onDragStart
        ? "bg-white border-slate-200 hover:border-primary/40 hover:shadow-sm cursor-grab active:cursor-grabbing active:scale-95 active:shadow-md active:border-primary/60"
        : "bg-slate-50 border-slate-200"
      }`}
  >
    <UserAvatar user={student} size="sm" />
    {!compact && (
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-800 truncate leading-tight">
          {student.firstName} {student.lastName}
        </p>
        <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
      </div>
    )}
    {compact && (
      <p className="text-xs font-medium text-slate-800 truncate max-w-[80px]">
        {student.firstName}
      </p>
    )}
    {onRemove && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-auto p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors shrink-0"
        title="Remove from team"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

// ── Team Card ─────────────────────────────────────────────────────────────────

const TeamCard = ({
  team,
  assignedStudents,
  onDrop,
  onRemoveStudent,
  onDelete,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  team: TeamResponseDto;
  assignedStudents: Student[];
  onDrop: (e: React.DragEvent) => void;
  onRemoveStudent: (studentId: number) => void;
  onDelete: () => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const total = assignedStudents.length + (team.members?.length ?? 0);
  const isFull = total >= team.maxMember;

  return (
    <div
      className={`relative bg-white rounded-xl border-2 transition-all overflow-hidden flex flex-col
        ${isDragOver
          ? "border-primary shadow-lg shadow-primary/10 scale-[1.01]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
        }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e);
      }}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-primary border-dashed rounded-xl z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {isFull ? "Team is full" : "Drop to add"}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{team.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isFull
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {total}/{team.maxMember} members
              </span>
              {team.joinCode && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(team.joinCode);
                  }}
                  className="group flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy join code"
                >
                  <span>{team.joinCode}</span>
                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowActions((v) => !v)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    setShowActions(false);
                    onDelete();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete team
                </button>
                <button
                  onClick={() => setShowActions(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 space-y-3">
        {/* Leader */}
        {team.leader && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Leader</p>
            <div className="flex items-center gap-2">
              <UserAvatar user={team.leader} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">
                  {team.leader.firstName} {team.leader.lastName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{team.leader.email}</p>
              </div>
              <span className="ml-auto text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-medium shrink-0">
                Lead
              </span>
            </div>
          </div>
        )}

        {/* Existing API members */}
        {team.members && team.members.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Members
            </p>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {team.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50">
                  <UserAvatar user={m} size="sm" />
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {m.firstName} {m.lastName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drag-assigned students */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Assigned
            {assignedStudents.length > 0 && (
              <span className="ml-1 text-primary">({assignedStudents.length})</span>
            )}
          </p>
          {assignedStudents.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {assignedStudents.map((s) => (
                <StudentPill
                  key={s.id}
                  student={s}
                  onRemove={() => onRemoveStudent(s.id)}
                />
              ))}
            </div>
          ) : (
            <div
              className={`flex items-center justify-center h-12 rounded-lg border-2 border-dashed transition-colors text-[10px] font-medium
                ${isDragOver ? "border-primary text-primary" : "border-slate-200 text-slate-300"}`}
            >
              {isDragOver ? "Release to add" : "Drag students here"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Student Panel ─────────────────────────────────────────────────────────────

const StudentPanel = ({
  students,
  assignedIds,
  onDragStart,
  loading,
}: {
  students: Student[];
  assignedIds: Set<number>;
  onDragStart: (student: Student) => (e: React.DragEvent) => void;
  loading: boolean;
}) => {
  const [search, setSearch] = useState("");
  const available = students.filter(
    (s) =>
      !assignedIds.has(s.id) &&
      `${s.firstName} ${s.lastName} ${s.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Panel header */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Students
          <span className="ml-2 text-xs font-normal text-slate-400">
            ({available.length} unassigned)
          </span>
        </h3>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 placeholder-slate-300"
          />
        </div>
      </div>

      {/* Hint */}
      <div className="px-4 py-2 bg-blue-50/60 border-b border-slate-100 shrink-0">
        <p className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          Drag a student onto a team card
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
          ))
        ) : available.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-slate-300">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs">
              {search ? "No matches" : "All assigned!"}
            </p>
          </div>
        ) : (
          available.map((student) => (
            <StudentPill
              key={student.id}
              student={student}
              onDragStart={onDragStart(student)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TeamsTab({ classId }: TeamsTabProps) {
  const classIdNum = Number(classId);

  const [teams, setTeams] = useState<TeamResponseDto[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // teamId → Student[]  (locally dragged assignments, before API save)
  const [assignments, setAssignments] = useState<Record<number, Student[]>>({});
  const [dragOverTeamId, setDragOverTeamId] = useState<number | null>(null);
  const dragStudent = useRef<Student | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ── Fetch teams ──────────────────────────────────────────────────────────

  const fetchTeams = async () => {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const data = await teamService.getTeamsByClass(classIdNum);
      setTeams(Array.isArray(data) ? data : []);
    } catch {
      setTeamsError("Failed to load teams. Please try again.");
    } finally {
      setTeamsLoading(false);
    }
  };

  // ── Fetch students ───────────────────────────────────────────────────────

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const response = await axiosInstance.get(`/class/${classId}/students`);
      const raw = response.data?.data ?? response.data ?? [];
      setStudents(Array.isArray(raw) ? raw : []);
    } catch {
      // silently fail — panel will show empty
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!classIdNum) return;
    fetchTeams();
    fetchStudents();
  }, [classIdNum]);

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = (student: Student) => (e: React.DragEvent) => {
    dragStudent.current = student;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (teamId: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTeamId(null);
    const student = dragStudent.current;
    if (!student) return;

    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    // Check if already assigned to this team
    const alreadyHere = (assignments[teamId] ?? []).some((s) => s.id === student.id);
    if (alreadyHere) return;

    // Check capacity
    const currentCount =
      (assignments[teamId]?.length ?? 0) + (team.members?.length ?? 0);
    if (currentCount >= team.maxMember) {
      alert(`"${team.name}" is full (${team.maxMember} members max).`);
      return;
    }

    // Remove from any other team assignment first
    setAssignments((prev) => {
      const next = { ...prev };
      // Remove from other teams
      Object.keys(next).forEach((key) => {
        const tid = Number(key);
        if (tid !== teamId) {
          next[tid] = next[tid].filter((s) => s.id !== student.id);
        }
      });
      // Add to this team
      next[teamId] = [...(next[teamId] ?? []), student];
      return next;
    });

    dragStudent.current = null;
  };

  const handleRemoveStudent = (teamId: number, studentId: number) => {
    setAssignments((prev) => ({
      ...prev,
      [teamId]: (prev[teamId] ?? []).filter((s) => s.id !== studentId),
    }));
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await teamService.deleteTeam(teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
    } catch {
      alert("Failed to delete team. Please try again.");
    }
  };

  // IDs of students already dragged into any team
  const allAssignedIds = new Set(
    Object.values(assignments)
      .flat()
      .map((s) => s.id)
  );

  // ── Loading ──────────────────────────────────────────────────────────────

  if (teamsLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-5 w-28 bg-slate-200 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (teamsError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-red-500 text-sm mb-4">{teamsError}</p>
          <button onClick={fetchTeams} className="text-primary font-medium text-sm underline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Teams ({teams.length})</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Drag students from the panel onto a team to assign them
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
          >
            <span className="text-base leading-none">+</span> Create Team
          </button>
        </div>

        {teams.length === 0 ? (
          /* ── Empty state ── */
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium mb-1">No teams yet</p>
            <p className="text-sm text-slate-400 mb-6">Create your first team to get started</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Create First Team
            </button>
          </div>
        ) : (
          /* ── Main layout: student panel + team grid ── */
          <div className="flex gap-5 items-start">
            {/* Student panel — fixed sidebar */}
            <div className="w-64 shrink-0 sticky top-6 max-h-[calc(100vh-8rem)]">
              <StudentPanel
                students={students}
                assignedIds={allAssignedIds}
                onDragStart={handleDragStart}
                loading={studentsLoading}
              />
            </div>

            {/* Team grid */}
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  assignedStudents={assignments[team.id] ?? []}
                  onDrop={handleDrop(team.id)}
                  onRemoveStudent={(sid) => handleRemoveStudent(team.id, sid)}
                  onDelete={() => handleDeleteTeam(team.id)}
                  isDragOver={dragOverTeamId === team.id}
                  onDragOver={() => setDragOverTeamId(team.id)}
                  onDragLeave={() => setDragOverTeamId(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        classId={classIdNum}
        onSuccess={fetchTeams}
      />
    </>
  );
}