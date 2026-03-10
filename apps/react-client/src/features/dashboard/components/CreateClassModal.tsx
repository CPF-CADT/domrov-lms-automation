"use client";

import { useState } from "react";
import Modal from "@/components/primitives/Modal";
import FormInput from "@/components/primitives/FormInput";
import ImageUpload from "@/components/forms/ImageUpload";
import type { CloudinaryUploadResponse } from "@/types";

export interface CreateClassData {
  name: string;
  description: string;
  coverImageUrl?: string;
}

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateClassData) => void;
}

export default function CreateClassModal({
  isOpen,
  onClose,
  onCreate,
}: CreateClassModalProps) {
  const [formData, setFormData] = useState<CreateClassData>({
    name: "",
    description: "",
    coverImageUrl: undefined,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateClassData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateClassData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Class name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Class name must be at least 3 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        coverImageUrl: formData.coverImageUrl,
      });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      coverImageUrl: undefined,
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof CreateClassData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageUploadSuccess = (result: CloudinaryUploadResponse) => {
    setFormData((prev) => ({ ...prev, coverImageUrl: result.secure_url }));
  };

  const handleImageUploadError = (error: string) => {
    setErrors((prev) => ({ ...prev, coverImageUrl: error }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create a New Class"
      description="Fill in the details below to create a new class."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cover Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Cover Image
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <ImageUpload
                label=""
                maxSizeMB={5}
                currentImageUrl={formData.coverImageUrl}
                onSuccess={handleImageUploadSuccess}
                onError={handleImageUploadError}
                className="h-32"
              />
            </div>
            {/* Preview */}
            <div className="w-40 shrink-0">
              <p className="text-xs text-slate-500 mb-1">Preview</p>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {formData.coverImageUrl ? (
                  <img
                    src={formData.coverImageUrl}
                    alt="Cover"
                    className="w-full h-16 object-cover"
                  />
                ) : (
                  <div className="w-full h-16 bg-slate-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-300">
                      {formData.name
                        ? formData.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                        : "CL"}
                    </span>
                  </div>
                )}
                <div className="p-2">
                  <p className="font-medium text-slate-900 truncate text-xs">
                    {formData.name || "Class Name"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {errors.coverImageUrl && (
            <p className="mt-1 text-xs text-red-600">{errors.coverImageUrl}</p>
          )}
        </div>

        <FormInput
          id="name"
          name="name"
          label="Class Name"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Advanced Web Development"
          error={errors.name}
          autoFocus
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g., Learning about NestJS and React"
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
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
            className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Class"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
