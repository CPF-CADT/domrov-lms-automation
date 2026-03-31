import { Plus, Trash2, AlertCircle } from "lucide-react";

export interface RubricItem {
    definition: string;
    totalScore: number;
}

interface RubricEditorProps {
    rubrics: RubricItem[];
    maxScore: number;
    onRubricsChange: (rubrics: RubricItem[]) => void;
}

export function RubricEditor({ rubrics, maxScore, onRubricsChange }: RubricEditorProps) {
    const totalPoints = rubrics.reduce((sum, r) => sum + r.totalScore, 0);
    const isBalanced = totalPoints === maxScore && maxScore > 0;

    const handleAddRubric = () => {
        const remaining = maxScore - totalPoints;
        onRubricsChange([
            ...rubrics,
            {
                definition: "",
                totalScore: Math.max(1, remaining),
            },
        ]);
    };

    const handleUpdateRubric = (index: number, field: keyof RubricItem, value: any) => {
        const updated = [...rubrics];
        if (field === "totalScore") {
            updated[index][field] = Math.max(0, Number(value) || 0);
        } else {
            updated[index][field] = value;
        }
        onRubricsChange(updated);
    };

    const handleDeleteRubric = (index: number) => {
        onRubricsChange(rubrics.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">Rubrics</label>
                    <p className="text-xs text-slate-600">Define grading criteria. Points must total {maxScore}.</p>
                </div>
                <div className={`text-sm font-semibold ${isBalanced ? 'text-green-600' : 'text-amber-600'}`}>
                    {totalPoints}/{maxScore} pts
                </div>
            </div>

            {!isBalanced && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        Rubric total ({totalPoints}pts) must equal max score ({maxScore}pts)
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {rubrics.map((rubric, idx) => (
                    <div key={idx} className="flex gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={rubric.definition}
                                onChange={(e) => handleUpdateRubric(idx, 'definition', e.target.value)}
                                placeholder="e.g., Code Quality, Documentation"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="w-24">
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min="0"
                                    value={rubric.totalScore || ''}
                                    onChange={(e) => handleUpdateRubric(idx, 'totalScore', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="text-sm text-slate-600 whitespace-nowrap">pts</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDeleteRubric(idx)}
                            className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Remove rubric"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {rubrics.length === 0 || totalPoints < maxScore ? (
                <button
                    type="button"
                    onClick={handleAddRubric}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Rubric Item
                </button>
            ) : null}
        </div>
    );
}
