"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import type { StudentSubmission } from "@/data/mockAssignmentDetails";

interface StudentSubmissionsTableProps {
  students: StudentSubmission[];
  assignmentId: number; // Added assignmentId to the props
}

export default function StudentSubmissionsTable({ students }: StudentSubmissionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 5;

  // Filter students based on search
  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Get status badge styles
  const getSubmissionStatusColor = (status: "submitted" | "missing") => {
    return status === "submitted"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  };

  const getAIStatusColor = (status: "checked" | "pending" | "flagged") => {
    switch (status) {
      case "checked":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-orange-100 text-orange-700";
      case "flagged":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getSubmissionStatusIcon = (status: "submitted" | "missing") => {
    return status === "submitted" ? (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="mt-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Student Submissions</h2>
        
        {/* Search and Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left font-medium text-slate-700">STUDENT NAME</th>
              <th className="px-6 py-3 text-left font-medium text-slate-700">STUDENT ID</th>
              <th className="px-6 py-3 text-left font-medium text-slate-700">SUBMISSION STATUS</th>
              <th className="px-6 py-3 text-left font-medium text-slate-700">AI STATUS</th>
              <th className="px-6 py-3 text-left font-medium text-slate-700">SUBMISSION TIME</th>
              <th className="px-6 py-3 text-left font-medium text-slate-700">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student, index) => (
                <tr
                  key={student.studentId}
                  className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  {/* Student Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{student.name}</span>
                    </div>
                  </td>

                  {/* Student ID */}
                  <td className="px-6 py-4 text-slate-600">{student.studentId}</td>

                  {/* Submission Status */}
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getSubmissionStatusColor(
                        student.submissionStatus
                      )}`}
                    >
                      {getSubmissionStatusIcon(student.submissionStatus)}
                      <span>{student.submissionStatus === "submitted" ? "Submitted" : "Missing"}</span>
                    </div>
                  </td>

                  {/* AI Status */}
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getAIStatusColor(
                        student.aiStatus
                      )}`}
                    >
                      {student.aiStatus === "checked"
                        ? "AI Checked"
                        : student.aiStatus === "pending"
                          ? "AI Pending"
                          : "AI Flagged"}
                    </div>
                  </td>

                  {/* Submission Time */}
                  <td className="px-6 py-4 text-slate-600">
                    {student.submissionTime || "Not available"}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                      VIEW SUBMISSION
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredStudents.length)} of{" "}
            {filteredStudents.length} students
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
