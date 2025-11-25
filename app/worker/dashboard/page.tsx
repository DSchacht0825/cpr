"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface WorkerSession {
  user: {
    id: string;
    email: string;
  };
  profile: {
    full_name: string;
    role: string;
    can_field_intake: boolean;
  };
  session: {
    access_token: string;
  };
}

interface AssignedCase {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  status: string;
  has_auction_date: boolean;
  auction_date?: string;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  created_at: string;
}

interface RecentVisit {
  id: string;
  visit_date: string;
  visit_type: string;
  location_address: string;
  applicant_id: string;
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [assignedCases, setAssignedCases] = useState<AssignedCase[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for session
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchAssignedCases(parsed.user.id, parsed.session.access_token);
      fetchRecentVisits(parsed.user.id, parsed.session.access_token);
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const fetchAssignedCases = async (userId: string, token: string) => {
    try {
      const response = await fetch(`/api/worker/cases?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) {
        setAssignedCases(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentVisits = async (userId: string, token: string) => {
    try {
      const response = await fetch(`/api/worker/visits?userId=${userId}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) {
        setRecentVisits(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch visits:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("worker_session");
    router.push("/worker");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isUrgent = (app: AssignedCase) => {
    if (app.auction_date) {
      const auction = new Date(app.auction_date);
      const now = new Date();
      const daysUntil = Math.ceil((auction.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }
    return app.has_notice_of_trustee_sale;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/cpr.png"
                alt="CPR"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Field Worker</h1>
                <p className="text-sm text-gray-600">{session?.profile.full_name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            href="/worker/visit/new"
            className="bg-cyan-600 text-white rounded-xl p-4 text-center font-semibold hover:bg-cyan-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Visit
          </Link>
          <Link
            href="/worker/intake"
            className="bg-green-600 text-white rounded-xl p-4 text-center font-semibold hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Field Intake
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="mb-6">
          <Link
            href="/worker/visits"
            className="block bg-white border-2 border-gray-200 text-gray-700 rounded-xl p-4 text-center font-semibold hover:border-cyan-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View My Visits
          </Link>
        </div>

        {/* Assigned Cases */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            My Assigned Cases ({assignedCases.length})
          </h2>

          {assignedCases.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500">
              No cases assigned to you yet.
            </div>
          ) : (
            <div className="space-y-3">
              {assignedCases.map((app) => (
                <Link
                  key={app.id}
                  href={`/worker/case/${app.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-cyan-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{app.full_name}</h3>
                        {isUrgent(app) && (
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{app.property_address}</p>
                      <p className="text-sm text-gray-500">
                        {app.property_city}, {app.property_county} {app.property_zip}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <a
                          href={`tel:${app.phone_number}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-600 hover:text-cyan-700"
                        >
                          {app.phone_number}
                        </a>
                        {app.auction_date && (
                          <span className="text-red-600">
                            Auction: {formatDate(app.auction_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Visits */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Visits</h2>

          {recentVisits.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500">
              No visits logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{visit.location_address}</p>
                      <p className="text-sm text-gray-500">
                        {visit.visit_type} - {formatDate(visit.visit_date)}
                      </p>
                    </div>
                    <Link
                      href={`/worker/visit/${visit.id}`}
                      className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-around">
          <Link href="/worker/dashboard" className="flex flex-col items-center text-cyan-600">
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
          <Link href="/worker/visits" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Visits</span>
          </Link>
          <Link href="/worker/profile" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
