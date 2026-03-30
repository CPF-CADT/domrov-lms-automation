"use client";
/**
 * TeacherGradesTab - TEACHER-SPECIFIC
 * Teacher grade management, grading tools, analytics, and student performance tracking
 * Complete control over grading and assessment
 * NOT shared with student dashboard
 */
const TeacherGradesTab = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Grade Management</h2>
                <p className="text-slate-600 text-sm mb-4">
                    View student performance, manage grades, and provide feedback on assignments.
                </p>
                <div className="text-slate-500 py-12 text-center">
                    <p>No grades to display yet. Grades will appear here as you review student submissions.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-600 mb-1">Class Average</p>
                    <p className="text-2xl font-bold text-slate-900">--</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-600 mb-1">Submissions</p>
                    <p className="text-2xl font-bold text-slate-900">0</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-600 mb-1">Graded</p>
                    <p className="text-2xl font-bold text-slate-900">0</p>
                </div>
            </div>
        </div>
    );
};

export default TeacherGradesTab;
