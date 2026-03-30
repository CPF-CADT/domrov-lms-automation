import { CheckCircle2, AlertCircle, Award, BookOpen } from "lucide-react";

interface Evaluation {
    id: number;
    score: number;
    feedback?: string | null;
    penaltyScore?: number;
    isApproved: boolean;
    evaluationType?: string;
    aiOutput?: string | null;
    confidencePoint?: number | null;
    created_at?: string;
    updated_at?: string;
}

interface GradingSectionProps {
    evaluation: Evaluation | null | undefined;
    maxScore: number;
    submissionStatus: string;
}

export default function GradingSection({
    evaluation,
    maxScore,
    // submissionStatus,
}: GradingSectionProps) {
    if (!evaluation) {
        return null;
    }

    const scorePercentage = maxScore > 0 ? Math.round((evaluation.score / maxScore) * 100) : 0;
    const isPassing = scorePercentage >= 60;

    return (
        <div className="bg-gradient-to-br from-purple-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-6 space-y-6">
            {/* Header with Status */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {isPassing ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                    )}
                    <h3 className="text-lg font-bold text-slate-900">Grading Complete</h3>
                </div>
                <p className="text-sm text-slate-600">
                    {evaluation.created_at ? (
                        <>
                            Graded on{" "}
                            {new Date(evaluation.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                            {evaluation.evaluationType && ` • ${evaluation.evaluationType}`}
                        </>
                    ) : (
                        <>
                            {evaluation.evaluationType && `${evaluation.evaluationType} •`} Grading Complete
                        </>
                    )}
                </p>
            </div>

            {/* Score Display */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-purple-100">
                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Score</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-purple-700">{evaluation.score}</span>
                        <span className="text-sm text-slate-600">/ {maxScore}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{scorePercentage}%</p>
                </div>

                {evaluation.penaltyScore !== undefined && evaluation.penaltyScore > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-orange-100">
                        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Penalty</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-orange-600">-{evaluation.penaltyScore}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Applied</p>
                    </div>
                )}
            </div>

            {/* Score Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Score Distribution</span>
                    <span className={`font-bold ${isPassing ? 'text-green-600' : 'text-orange-600'}`}>
                        {isPassing ? 'Passing' : 'Needs Improvement'}
                    </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all rounded-full ${isPassing ? 'bg-green-500' : 'bg-orange-500'
                            }`}
                        style={{ width: `${Math.min(scorePercentage, 100)}%` }}
                    />
                </div>
            </div>

            {/* Feedback Section */}
            {evaluation.feedback && (
                <div className="bg-white rounded-xl p-4 border border-purple-100 space-y-2">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-bold text-slate-900">Instructor Feedback</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{evaluation.feedback}</p>
                </div>
            )}

            {/* AI Evaluation Info */}
            {evaluation.evaluationType === "AI" && evaluation.aiOutput && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        <p className="text-sm font-bold text-blue-900">AI Evaluation</p>
                    </div>
                </div>
            )}

            {/* Status Badge */}
            {evaluation.isApproved && (
                <div className="flex items-center justify-center gap-2 bg-green-100 border border-green-300 rounded-lg py-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700" />
                    <p className="text-sm font-semibold text-green-700">Grade Approved</p>
                </div>
            )}
        </div>
    );
}
