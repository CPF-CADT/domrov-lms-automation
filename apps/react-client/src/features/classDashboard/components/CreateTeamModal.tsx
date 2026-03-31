"use client";

import { useState, useRef } from "react";
import Modal from "@/components/primitives/Modal";
import FormInput from "@/components/primitives/FormInput";
import teamService from "@/services/teamService";
import type { CreateTeamDto, CreateManyTeamsDto } from "@/types/team";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  onSuccess?: () => void;
}

interface TeamFormData {
  name: string;
  maxMember: number;
}

const CreateTeamModal = ({ isOpen, onClose, classId, onSuccess }: CreateTeamModalProps) => {
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [singleTeam, setSingleTeam] = useState<TeamFormData>({ name: "", maxMember: 5 });
  const [teams, setTeams] = useState<TeamFormData[]>([{ name: "", maxMember: 5 }]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setSingleTeam({ name: "", maxMember: 5 });
    setTeams([{ name: "", maxMember: 5 }]);
    setActiveTeamIndex(0);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateTeam = (team: TeamFormData): string | null => {
    if (!team.name.trim()) return "Team name is required";
    if (team.name.length < 2) return "Team name must be at least 2 characters";
    if (team.name.length > 100) return "Team name must be at most 100 characters";
    if (team.maxMember < 2) return "Max members must be at least 2";
    if (team.maxMember > 20) return "Max members must be at most 20";
    return null;
  };

  const handleSingleTeamChange = (field: keyof TeamFormData, value: string | number) => {
    setSingleTeam(prev => ({
      ...prev,
      [field]: field === "maxMember" ? Number(value) : value
    }));
    setError(null);
  };

  const handleTeamChange = (index: number, field: keyof TeamFormData, value: string | number) => {
    const newTeams = [...teams];
    newTeams[index] = {
      ...newTeams[index],
      [field]: field === "maxMember" ? Number(value) : value
    };
    setTeams(newTeams);
    setError(null);
  };

  const addTeam = () => {
    setTeams(prev => [...prev, { name: "", maxMember: 5 }]);
    setActiveTeamIndex(teams.length);
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }, 0);
  };

  const removeTeam = (index: number) => {
    setTeams(prev => prev.filter((_, i) => i !== index));
    if (activeTeamIndex >= teams.length - 1) {
      setActiveTeamIndex(Math.max(0, teams.length - 2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      setIsSubmitting(true);

      if (mode === "single") {
        const validationError = validateTeam(singleTeam);
        if (validationError) {
          setError(validationError);
          return;
        }

        const payload: CreateTeamDto = {
          name: singleTeam.name.trim(),
          maxMember: singleTeam.maxMember,
          classId,
        };

        await teamService.createTeam(payload);
      } else {
        const validTeams = teams.filter(t => t.name.trim());
        
        if (validTeams.length === 0) {
          setError("At least one team is required");
          return;
        }

        for (const team of validTeams) {
          const validationError = validateTeam(team);
          if (validationError) {
            setError(`${team.name}: ${validationError}`);
            return;
          }
        }

        const payload: CreateManyTeamsDto = {
          classId,
          teams: validTeams.map(t => ({
            name: t.name.trim(),
            maxMember: t.maxMember,
          })),
        };

        await teamService.createManyTeams(payload);
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onSuccess?.();
        handleClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create team(s). Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Team"
      size="md"
    >
      <div className="w-full">
        {/* Mode Selector */}
        <div className="flex gap-3 pb-4 mb-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode("single");
              setError(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "single"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Single Team
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("multiple");
              setError(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "multiple"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Multiple Teams
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
            <p className="text-sm text-green-600">Team(s) created successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "single" ? (
            <div className="space-y-4">
              <FormInput
                id="team-name"
                name="name"
                label="Team Name"
                placeholder="e.g., Development Team"
                value={singleTeam.name}
                onChange={(e) => handleSingleTeamChange("name", e.target.value)}
                required
                maxLength={100}
              />
              <div>
                <label htmlFor="team-maxmember" className="block mb-2 text-sm font-medium text-slate-700">
                  Max Members <span className="text-red-500">*</span>
                </label>
                <input
                  id="team-maxmember"
                  type="number"
                  min="2"
                  max="20"
                  value={singleTeam.maxMember}
                  onChange={(e) => handleSingleTeamChange("maxMember", e.target.value)}
                  className="w-full px-3 py-2 transition-all border rounded-lg border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Between 2 and 20 members</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                ref={contentRef}
                className="pr-2 space-y-3 overflow-y-auto max-h-96"
              >
                {teams.map((team, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      activeTeamIndex === index
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    onClick={() => setActiveTeamIndex(index)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700">
                          Team {index + 1}
                        </label>
                        {teams.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTeam(index);
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Team name"
                        maxLength={100}
                        value={team.name}
                        onChange={(e) => handleTeamChange(index, "name", e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div>
                        <label className="block mb-1 text-xs font-medium text-slate-600">
                          Max Members
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="20"
                          value={team.maxMember}
                          onChange={(e) => handleTeamChange(index, "maxMember", e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTeam}
                className="w-full px-4 py-2 text-sm font-medium transition-colors border-2 border-dashed rounded-lg border-primary text-primary hover:bg-primary/5"
              >
                + Add Team
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team(s)"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateTeamModal;
