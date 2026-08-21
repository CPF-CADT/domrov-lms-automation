"use client";

import { Sparkles, Calendar, AlertCircle, MessageSquare, CheckCircle2, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { SubmissionViewerResponseDto } from "@/types/submission";

interface StudentEvaluationFeedbackProps {
    submission: SubmissionViewerResponseDto;
    maxScore: number;
    assignmentTitle: string;
}

export default function StudentEvaluationFeedback({
    submission,
    maxScore,
    assignmentTitle,
}: StudentEvaluationFeedbackProps) {
    if (!submission.evaluation?.isApproved) {
        return null;
    }

    const evaluation = submission.evaluation;
    const score = evaluation.score ?? 0;
    const scorePercent = Math.round((score / maxScore) * 100);
    const hasPenalty = evaluation.penaltyScore && evaluation.penaltyScore > 0;
    const hasLineComments = evaluation.feedbacks && evaluation.feedbacks.length > 0;



    return (
        <div className="space-y-6">
            {/* Feedback Header */}
            {/* AI Output Section */}
            {evaluation.aiOutput && (
                <div className="bg-white rounded-2xl border border-purple-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-purple-900">AI Output</h3>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-purple-800 text-sm leading-relaxed">
                        <ReactMarkdown>{evaluation.aiOutput}</ReactMarkdown>
                    </div>
                </div>
            )}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Grade & Feedback</h2>
                        <p className="text-sm text-slate-600">{assignmentTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">
                            {evaluation.evaluationType === 'AI' ? 'AI Evaluated' : 'Manual Review'}
                        </span>
                    </div>
                </div>

                {/* Score Display */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-600 mb-2">Score</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold text-blue-600">{score}</span>
                            <span className="text-lg text-slate-600">/ {maxScore}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 font-medium">{scorePercent}% Score</p>
                    </div>

                    {/* Score Grade */}
                    <div>
                        <p className="text-sm text-slate-600 mb-2">Grade</p>
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                                style={{
                                    backgroundColor: scorePercent >= 90 ? '#dcfce7' :
                                        scorePercent >= 80 ? '#dbeafe' :
                                            scorePercent >= 70 ? '#fef3c7' :
                                                scorePercent >= 60 ? '#fed7aa' : '#fee2e2',
                                    color: scorePercent >= 90 ? '#16a34a' :
                                        scorePercent >= 80 ? '#0284c7' :
                                            scorePercent >= 70 ? '#b45309' :
                                                scorePercent >= 60 ? '#ea580c' : '#dc2626'
                                }}>
                                {scorePercent >= 90 ? 'A' :
                                    scorePercent >= 80 ? 'B' :
                                        scorePercent >= 70 ? 'C' :
                                            scorePercent >= 60 ? 'D' : 'F'}
                            </div>
                            <div className="text-sm text-slate-600">
                                <p className="font-medium text-slate-900">
                                    {scorePercent >= 90 ? 'Excellent' :
                                        scorePercent >= 80 ? 'Good' :
                                            scorePercent >= 70 ? 'Satisfactory' :
                                                scorePercent >= 60 ? 'Passing' : 'Needs Improvement'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Penalty Badge */}
                {hasPenalty && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-red-900">Penalty Applied</p>
                            <p className="text-sm text-red-700">
                                -{evaluation.penaltyScore} points ({((evaluation.penaltyScore / maxScore) * 100).toFixed(1)}% deduction)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Overall Feedback */}
            {evaluation.feedback && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Feedback</h3>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {evaluation.feedback}
                    </div>
                </div>
            )}

            {/* Line-by-Line Comments */}
            {hasLineComments && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Detailed Comments</h3>
                        <span className="ml-auto px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            {evaluation.feedbacks.length} {evaluation.feedbacks.length === 1 ? 'comment' : 'comments'}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {evaluation.feedbacks.map((feedback, idx) => {
                            const fileName = feedback.filePath?.split('/').pop() || 'File';
                            const lineInfo = feedback.startLine ? `Line ${feedback.startLine}${feedback.endLine && feedback.endLine !== feedback.startLine ? `-${feedback.endLine}` : ''}` : null;

                            return (
                                <div key={feedback.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                                                {idx + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                                {fileName}
                                            </p>
                                            {lineInfo && (
                                                <p className="text-xs text-slate-600 mb-1">
                                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                                                        {lineInfo}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-700 ml-9">
                                        {feedback.message || 'No message provided'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Submission Info Footer */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
                {submission.submissionTime && (
                    <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                            <p className="text-xs text-slate-600">Submitted</p>
                            <p className="text-sm font-medium text-slate-900">
                                {new Date(submission.submissionTime).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                )}
                {evaluation.created_at && (
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                            <p className="text-xs text-slate-600">Graded</p>
                            <p className="text-sm font-medium text-slate-900">
                                {new Date(evaluation.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
