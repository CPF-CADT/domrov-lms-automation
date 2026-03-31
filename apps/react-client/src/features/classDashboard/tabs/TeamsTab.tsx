"use client";

import { useEffect, useState } from "react";
import CreateTeamModal from "../components/CreateTeamModal";
import teamService from "@/services/teamService";
import type { TeamResponseDto } from "@/types/team";

interface TeamsTabProps {
  classId: string;
}

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const UserAvatar = ({ user }: { user: { firstName: string; lastName: string; profilePictureUrl?: string | null } }) => {
  if (user.profilePictureUrl) {
    return (
      <img
        src={user.profilePictureUrl}
        alt={`${user.firstName} ${user.lastName}`}
        className="w-8 h-8 rounded-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">
        {getInitials(user.firstName, user.lastName)}
      </span>
    </div>
  );
};

export default function TeamsTab({ classId }: TeamsTabProps) {
  const classIdNum = Number(classId);
  const [teams, setTeams] = useState<TeamResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getTeamsByClass(classIdNum);
      setTeams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError("Failed to load teams. Please try again.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classIdNum) fetchTeams();
  }, [classIdNum]);

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      await teamService.deleteTeam(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      alert("Failed to delete team. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse"
            >
              <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchTeams}
            className="text-primary font-medium text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Teams ({teams.length})
            </h2>
            <p className="text-sm text-slate-500 mt-1">Manage class teams and members</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span> Create Team
          </button>
        </div>

        {/* Empty State */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 border-dashed p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium mb-2">No teams yet</p>
            <p className="text-sm text-slate-500 mb-6">Create your first team to get started</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors inline-block"
            >
              Create First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Team Header */}
                <div className="p-4 border-b border-slate-200 bg-linear-to-r from-primary/5 to-transparent">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold text-slate-900 line-clamp-2">
                      {team.name}
                    </h3>
                    <button
                      onClick={() => setSelectedTeamId(selectedTeamId === team.id ? null : team.id)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="More options"
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {team.maxMember} members max
                    </span>
                  </div>
                </div>

                {/* Team Info */}
                <div className="p-4 space-y-4">
                  {/* Leader */}
                  {team.leader && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Leader</p>
                      <div className="flex items-center gap-2">
                        <UserAvatar user={team.leader} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {team.leader.firstName} {team.leader.lastName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{team.leader.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Members */}
                  {team.members && team.members.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">
                        Members ({team.members.length})
                      </p>
                      <div className="space-y-2 max-h-24 overflow-y-auto">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2">
                            <UserAvatar user={member} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{member.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Join Code */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Join Code</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-slate-900">
                        {team.joinCode}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(team.joinCode);
                          alert("Join code copied!");
                        }}
                        className="p-2 hover:bg-slate-100 rounded transition-colors"
                        title="Copy join code"
                      >
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {selectedTeamId === team.id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3 flex gap-2">
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedTeamId(null)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            ))}
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
