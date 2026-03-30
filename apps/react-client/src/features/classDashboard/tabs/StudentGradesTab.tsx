"use client";

/**
 * StudentGradesTab - STUDENT-SPECIFIC
 * Student view of grades, feedback, and performance analytics
 * Read-only access to personal grades and instructor feedback
 * NOT shared with teacher dashboard
 */
const StudentGradesTab = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Grades</h2>
                <p className="text-slate-600 text-sm mb-4">
                    Track your assignment scores, feedback, and overall course performance.
                </p>
                <div className="text-slate-500 py-12 text-center">
                    <p>No grades available yet. They will appear here as assignments are graded.</p>
                </div>
            </div>
        </div>
    );
};

export default StudentGradesTab;
