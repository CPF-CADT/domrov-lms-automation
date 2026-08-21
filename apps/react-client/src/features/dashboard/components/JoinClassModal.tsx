"use client";

import { useState } from "react";
import { FormInput, Modal } from "@/components/primitives";

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}

export default function JoinClassModal({
  isOpen,
  onClose,
  onJoin,
}: JoinClassModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a class code");
      return;
    }
    try {
      // Optionally, call onJoin with the code or result
      onJoin(code.trim());
      setCode("");
      setError("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to join class");
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Join a Class"
      description="Enter the class code provided by your teacher to join a class."
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <FormInput
            id="classCode"
            label="Class Code"
            value={code}
            onChange={(e) => {
              setCode((e.target as HTMLInputElement).value.toUpperCase());
              setError("");
            }}
            placeholder="e.g., ABC123"
            error={error}
            autoFocus
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Join Class
          </button>
        </div>
      </form>
    </Modal>
  );
}
