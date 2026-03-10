import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ImageUpload from "@/components/forms/ImageUpload";
import classService from "@/services/classService";
import type { CloudinaryUploadResponse } from "@/types";

interface CreateClassFormData {
    name: string;
    description: string;
    coverImageUrl?: string;
}

export default function CreateClass() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<CreateClassFormData>({
        name: "",
        description: "",
        coverImageUrl: undefined,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof CreateClassFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof CreateClassFormData, string>> = {};
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
        setSubmitError(null);

        try {
            const result = await classService.createClass({
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                coverImageUrl: formData.coverImageUrl,
            });
            navigate(`/class/${result.data.id}`);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Failed to create class");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof CreateClassFormData]) {
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
        <div className="min-h-screen bg-slate-100">
            {/* Header */}
            <header className="bg-primary text-white">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/dashboard"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold">Create a New Class</h1>
                            <p className="text-sm text-blue-100">Set up your class details</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Cover Image Section */}
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">Cover Image</h2>
                                <p className="text-sm text-slate-500 mb-4">Upload an image for your class card</p>

                                <ImageUpload
                                    label=""
                                    maxSizeMB={5}
                                    currentImageUrl={formData.coverImageUrl}
                                    onSuccess={handleImageUploadSuccess}
                                    onError={handleImageUploadError}
                                />
                                {formData.coverImageUrl && (
                                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Image uploaded
                                    </p>
                                )}
                                {errors.coverImageUrl && (
                                    <p className="mt-2 text-sm text-red-600">{errors.coverImageUrl}</p>
                                )}
                            </section>

                            {/* Class Details Section */}
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">Class Details</h2>
                                <p className="text-sm text-slate-500 mb-4">Basic information about your class</p>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Class Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="e.g., Advanced Web Development"
                                            className={`w-full px-4 py-2.5 rounded-lg border ${errors.name ? "border-red-300 focus:ring-red-500" : "border-slate-300 focus:ring-primary"
                                                } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors`}
                                            autoFocus
                                        />
                                        {errors.name && (
                                            <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="e.g., Learning about NestJS and React"
                                            rows={3}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
                                        />
                                        <p className="mt-1.5 text-xs text-slate-500">
                                            Briefly describe what students will learn
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Error Message */}
                            {submitError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-red-700">{submitError}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/dashboard"
                                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-center"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Class"
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Column - Preview */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-8">
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview</h2>

                                    {/* Preview Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        {formData.coverImageUrl ? (
                                            <img
                                                src={formData.coverImageUrl}
                                                alt="Class cover"
                                                className="w-full h-28 object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-28 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                <span className="text-3xl font-bold text-slate-400">
                                                    {formData.name
                                                        ? formData.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                                                        : "CL"}
                                                </span>
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <h3 className="font-semibold text-slate-900 truncate">
                                                {formData.name || "Class Name"}
                                            </h3>
                                            <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                                                {formData.description || "No description provided"}
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <p className="text-xs text-slate-400">Join Code</p>
                                                <p className="text-sm font-mono text-slate-600">ABC123</p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 mt-4 text-center">
                                        This is how your class card will appear
                                    </p>
                                </section>
                            </div>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
