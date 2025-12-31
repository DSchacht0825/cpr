"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Application {
  id: string;
  full_name: string;
  property_address: string;
  property_city?: string;
  property_county: string;
  property_zip: string;
  phone_number: string;
  email?: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  comments?: string;
  visit_count: number;
  event_count: number;
  document_count: number;
}

interface DuplicateGroup {
  matchType: "name" | "address";
  matchValue: string;
  applications: Application[];
}

interface Worker {
  id: string;
  full_name: string;
}

export default function DuplicatesPage() {
  const router = useRouter();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [selectedDuplicate, setSelectedDuplicate] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const session = JSON.parse(storedSession);
      if (session.profile?.role !== "admin") {
        router.push("/worker/dashboard");
        return;
      }
      fetchData();
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const fetchData = async () => {
    try {
      const [dupsRes, workersRes] = await Promise.all([
        fetch("/api/applicants/duplicates"),
        fetch("/api/workers"),
      ]);

      const dupsData = await dupsRes.json();
      const workersData = await workersRes.json();

      setDuplicateGroups(dupsData.data || []);
      setWorkers(workersData.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return "Unassigned";
    const worker = workers.find((w) => w.id === workerId);
    return worker?.full_name || "Unknown";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleExpandGroup = (index: number) => {
    if (expandedGroup === index) {
      setExpandedGroup(null);
      setSelectedMaster(null);
      setSelectedDuplicate(null);
    } else {
      setExpandedGroup(index);
      setSelectedMaster(null);
      setSelectedDuplicate(null);
    }
  };

  const handleSelectForMerge = (appId: string, isMaster: boolean) => {
    if (isMaster) {
      setSelectedMaster(appId);
      if (selectedDuplicate === appId) {
        setSelectedDuplicate(null);
      }
    } else {
      setSelectedDuplicate(appId);
      if (selectedMaster === appId) {
        setSelectedMaster(null);
      }
    }
  };

  const handleMerge = async () => {
    if (!selectedMaster || !selectedDuplicate) return;

    setMerging(true);
    try {
      const response = await fetch(`/api/applicants/${selectedMaster}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateId: selectedDuplicate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to merge");
      }

      // Refresh data
      setShowConfirmModal(false);
      setSelectedMaster(null);
      setSelectedDuplicate(null);
      setExpandedGroup(null);
      await fetchData();
    } catch (err) {
      console.error("Error merging:", err);
      alert("Failed to merge records. Please try again.");
    } finally {
      setMerging(false);
    }
  };

  const getMasterApp = () => {
    if (!selectedMaster || expandedGroup === null) return null;
    return duplicateGroups[expandedGroup]?.applications.find(
      (a) => a.id === selectedMaster
    );
  };

  const getDuplicateApp = () => {
    if (!selectedDuplicate || expandedGroup === null) return null;
    return duplicateGroups[expandedGroup]?.applications.find(
      (a) => a.id === selectedDuplicate
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Duplicate Records
                </h1>
                <p className="text-sm text-gray-500">
                  Merge applications with same name or address
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {duplicateGroups.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Duplicates Found
            </h2>
            <p className="text-gray-500">
              All applications have unique names and addresses.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Group Header */}
                <button
                  onClick={() => handleExpandGroup(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        group.matchType === "name"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {group.matchType === "name" ? "Same Name" : "Same Address"}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {group.matchValue}
                    </span>
                    <span className="text-gray-500">
                      ({group.applications.length} records)
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedGroup === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded Content */}
                {expandedGroup === index && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>How to merge:</strong> Select one record as the
                        Master (keeps this ID) and one as Duplicate (will be
                        deleted). All visits, notes, and documents from the
                        duplicate will be moved to the master.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {group.applications.map((app) => (
                        <div
                          key={app.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            selectedMaster === app.id
                              ? "border-green-500 bg-green-50"
                              : selectedDuplicate === app.id
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">
                                  {app.full_name}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    app.status === "pending"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : app.status === "in-progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {app.property_address}
                                {app.property_city && `, ${app.property_city}`},{" "}
                                {app.property_county} {app.property_zip}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>Created: {formatDate(app.created_at)}</span>
                                <span>Assigned: {getWorkerName(app.assigned_to)}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-700">
                                  {app.visit_count} visits
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-700">
                                  {app.event_count} notes
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-700">
                                  {app.document_count} docs
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => handleSelectForMerge(app.id, true)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                  selectedMaster === app.id
                                    ? "bg-green-600 text-white"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {selectedMaster === app.id ? "Master" : "Set as Master"}
                              </button>
                              <button
                                onClick={() => handleSelectForMerge(app.id, false)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                  selectedDuplicate === app.id
                                    ? "bg-red-600 text-white"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                {selectedDuplicate === app.id ? "Duplicate" : "Set as Duplicate"}
                              </button>
                              <Link
                                href={`/dashboard/property/${app.id}`}
                                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 text-center"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Merge Button */}
                    {selectedMaster && selectedDuplicate && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setShowConfirmModal(true)}
                          className="w-full px-4 py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
                        >
                          Merge Selected Records
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Confirm Merge
            </h3>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-1">
                  Master Record (will be kept)
                </p>
                <p className="font-semibold text-gray-900">
                  {getMasterApp()?.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  {getMasterApp()?.property_address}
                </p>
              </div>

              <div className="flex justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Duplicate Record (will be deleted)
                </p>
                <p className="font-semibold text-gray-900">
                  {getDuplicateApp()?.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  {getDuplicateApp()?.property_address}
                </p>
                <div className="mt-2 text-sm text-red-700">
                  Will move to master: {getDuplicateApp()?.visit_count} visits,{" "}
                  {getDuplicateApp()?.event_count} notes,{" "}
                  {getDuplicateApp()?.document_count} documents
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={merging}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={merging}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50"
              >
                {merging ? "Merging..." : "Confirm Merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
