import { useSearchParams } from "react-router-dom";
import AssignmentFilters from "../components/AssignmentFilters";
import StudentAssignmentList from "../../assignments/components/StudentAssignmentList";

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
    const [searchParams, setSearchParams] = useSearchParams();
    const activeFilter = (searchParams.get("status") as "upcoming" | "past-due" | "completed" | null) ?? "upcoming";

    const setActiveFilter = (filter: "upcoming" | "past-due" | "completed") => {
        const next = new URLSearchParams(searchParams);
        next.set("status", filter);
        setSearchParams(next);
    };

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
