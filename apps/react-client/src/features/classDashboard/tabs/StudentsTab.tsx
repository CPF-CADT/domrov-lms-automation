import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string;
}

interface StudentsTabProps {
  classId: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function Avatar({ student }: { student: Student }) {
  if (student.profilePictureUrl) {
    return (
      <img
        src={student.profilePictureUrl}
        alt={`${student.firstName} ${student.lastName}`}
        className="w-9 h-9 rounded-full object-cover shrink-0"
        onError={(e) => {
          // Fallback to initials if image fails
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-blue-700">
        {getInitials(student.firstName, student.lastName)}
      </span>
    </div>
  );
}

export default function StudentsTab({ classId }: StudentsTabProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // GET /class/:classId/students
        const response = await axiosInstance.get(`/class/${classId}/students`);
        const raw = response.data?.data ?? response.data ?? [];
        console.log("✅ Students loaded:", raw);
        if (!cancelled) setStudents(Array.isArray(raw) ? raw : []);
      } catch (err: any) {
        console.error("❌ Failed to load students:", err);
        if (!cancelled) setError("Could not load students. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [classId]);

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-slate-200">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
                <div className="h-5 w-14 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-slate-600 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg border border-slate-200">

        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Students ({students.length})
          </h2>
        </div>

        {/* Student list */}
        {students.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {students.map((student) => (
              <div
                key={student.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar student={student} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">
                      {student.firstName} {student.lastName}
                    </h4>
                    <p className="text-sm text-slate-500 truncate">{student.email}</p>
                  </div>
                  <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full shrink-0">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm">No students enrolled in this class yet.</p>
          </div>
        )}

      </div>
    </div>
  );
}