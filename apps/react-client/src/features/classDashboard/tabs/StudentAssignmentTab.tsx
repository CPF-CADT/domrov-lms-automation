import { useState } from "react";
import AssignmentFilters from "../AssignmentFilters";
import StudentAssignmentList from "../../assignment/StudentAssignmentList";

interface StudentAssignmentTabProps {
    classId: string;
}

/**
 * StudentAssignmentTab - STUDENT-SPECIFIC
 * Student view of assignments with filters for tracking submission status
 * Displays upcoming, past due, and completed assignments with student-centered workflow
 * NOT shared with teacher dashboard
 */
export default function StudentAssignmentTab({ classId }: StudentAssignmentTabProps) {
    const [activeFilter, setActiveFilter] = useState<"upcoming" | "past-due" | "completed">("upcoming");

    return (
        <div className="max-w-6xl p-6 mx-auto">
            {/* Assignment Filters - Student focused on submission tracking */}
            <AssignmentFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

            {/* Assignment List - Student submission view */}
            <div className="mt-6">
                <StudentAssignmentList classId={classId} filter={activeFilter} />
            </div>
        </div>
    );
}
