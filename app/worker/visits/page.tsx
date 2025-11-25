"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Pacific timezone formatting
const formatDatePacific = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTimePacific = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

interface WorkerSession {
  user: { id: string; email: string };
  profile: { full_name: string };
  session: { access_token: string };
}

interface Visit {
  id: string;
  visit_date: string;
  visit_type: string;
  visit_outcome?: string;
  location_address: string;
  contact_name?: string;
  property_condition_notes?: string;
  requires_follow_up: boolean;
  follow_up_date?: string;
  applicant_id?: string;
}

export default function WorkerVisitsPage() {
  const router = useRouter();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchVisits(parsed.user.id);
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const fetchVisits = async (userId: string) => {
    try {
      const response = await fetch(`/api/worker/visits?userId=${userId}&limit=50`);
      const result = await response.json();
      if (response.ok) {
        setVisits(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch visits:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = formatDatePacific;
  const formatDateTime = formatDateTimePacific;

  const visitTypeLabels: Record<string, string> = {
    "initial-contact": "Initial Contact",
    "follow-up": "Follow Up",
    "property-inspection": "Property Inspection",
    "document-collection": "Document Collection",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/worker/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">My Visits</h1>
            </div>
            <Link
              href="/worker/visit/new"
              className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + New Visit
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {visits.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No visits logged yet.</p>
            <Link
              href="/worker/visit/new"
              className="inline-block mt-4 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Log Your First Visit
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className={`bg-white rounded-xl p-4 shadow-sm border ${
                  visit.visit_outcome === "attempt"
                    ? "border-amber-200"
                    : visit.visit_outcome === "engagement"
                    ? "border-green-200"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {visitTypeLabels[visit.visit_type] || visit.visit_type}
                      </span>
                      {visit.visit_outcome && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            visit.visit_outcome === "attempt"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {visit.visit_outcome === "attempt" ? "Attempt" : "Engagement"}
                        </span>
                      )}
                      {visit.requires_follow_up && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{visit.location_address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(visit.visit_date)}
                    </p>
                    {visit.contact_name && (
                      <p className="text-xs text-gray-500">Contact: {visit.contact_name}</p>
                    )}
                    {visit.follow_up_date && (
                      <p className="text-xs text-purple-600 mt-1">
                        Follow-up: {formatDate(visit.follow_up_date)}
                      </p>
                    )}
                  </div>
                  {visit.applicant_id && (
                    <Link
                      href={`/dashboard/property/${visit.applicant_id}`}
                      className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  )}
                </div>
                {visit.property_condition_notes && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                    {visit.property_condition_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-around">
          <Link href="/worker/dashboard" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/worker/cases" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs mt-1">Cases</span>
          </Link>
          <Link href="/worker/visit/new" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <div className="bg-cyan-600 text-white rounded-full p-2 -mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs mt-1">New Visit</span>
          </Link>
          <Link href="/worker/visits" className="flex flex-col items-center text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Visits</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
