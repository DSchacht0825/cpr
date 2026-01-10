"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";

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
  visit_outcome?: string;
  location_address: string;
  applicant_id: string;
  requires_follow_up: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  interest_level?: string;
  attempt_count?: number;
}

interface SearchResult {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  status: string;
  auction_date?: string;
}

// Helper to extract time from follow_up_notes
const extractFollowUpTime = (notes?: string): string | null => {
  if (!notes) return null;
  const match = notes.match(/\[Preferred time: ([^\]]+)\]/);
  return match ? match[1] : null;
};

const INTEREST_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  not_interested: { label: "Not Interested", color: "bg-gray-100 text-gray-700" },
  interested_online: { label: "Interested - Online App", color: "bg-blue-100 text-blue-700" },
  applied_with_worker: { label: "Applied with Worker", color: "bg-green-100 text-green-700" },
};

export default function WorkerDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [assignedCases, setAssignedCases] = useState<AssignedCase[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAuctionDateStart, setSearchAuctionDateStart] = useState("");
  const [searchAuctionDateEnd, setSearchAuctionDateEnd] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchType, setSearchType] = useState<"text" | "auction">("text");

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

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

      // Check notification permission status
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationsEnabled(Notification.permission === "granted");
      }

      // Register service worker for push notifications
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(console.error);
      }

      // Listen for foreground messages
      const unsubscribe = onForegroundMessage((payload: unknown) => {
        const p = payload as { notification?: { title?: string; body?: string } };
        if (p.notification) {
          // Show a toast or alert for foreground messages
          alert(`${p.notification.title}\n${p.notification.body}`);
        }
      });

      return () => unsubscribe();
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

  const enableNotifications = async () => {
    if (!session) {
      alert("No session found. Please log in again.");
      return;
    }

    setNotificationLoading(true);
    console.log("Enable notifications clicked");

    try {
      console.log("Requesting notification permission...");
      const token = await requestNotificationPermission();
      console.log("Token received:", token ? "yes" : "no");

      if (token) {
        // Register the token with the server
        const response = await fetch("/api/notifications/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            token,
            deviceType: "web",
          }),
        });

        if (response.ok) {
          setNotificationsEnabled(true);
          alert("Notifications enabled successfully!");
        } else {
          const errorData = await response.json();
          console.error("Failed to register token:", errorData);
          alert("Failed to register for notifications. Check console for details.");
        }
      } else {
        alert("Could not get notification permission. Please allow notifications in your browser settings.");
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      alert("Error enabling notifications: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchType === "text" && searchQuery.length < 2) return;
    if (searchType === "auction" && !searchAuctionDateStart) return;

    setSearching(true);
    try {
      const params = searchType === "auction"
        ? `auction_start=${searchAuctionDateStart}&auction_end=${searchAuctionDateEnd || searchAuctionDateStart}`
        : `q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(`/api/applicants/search?${params}`);
      const result = await response.json();
      if (response.ok) {
        setSearchResults(result.data || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchAuctionDateStart("");
    setSearchAuctionDateEnd("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
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
              {/* Admin buttons for admins */}
              {(session?.profile?.role === "admin" || ["larry@communitypropertyrescue.com", "taylor@communitypropertyrescue.com", "dschacht@sdrescue.org", "schacht.dan@gmail.com", "david@communitypropertyrescue.com", "andrew@communitypropertyrescue.com", "larryjr@communitypropertyrescue.com"].includes(session?.user.email?.toLowerCase() || "")) && (
                <div className="flex gap-1 ml-2">
                  <Link
                    href="/dashboard"
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded font-medium hover:bg-purple-700"
                  >
                    Admin
                  </Link>
                  <Link
                    href="/dashboard/reports"
                    className="px-2 py-1 bg-orange-600 text-white text-xs rounded font-medium hover:bg-orange-700"
                  >
                    Reports
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Notification button */}
              {!notificationsEnabled ? (
                <button
                  type="button"
                  onClick={enableNotifications}
                  disabled={notificationLoading}
                  className="p-2 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors disabled:opacity-50"
                  title="Enable notifications"
                >
                  {notificationLoading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="p-2 text-green-600" title="Notifications enabled">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900">Search Customers</h3>
              <button
                onClick={clearSearch}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {/* Search Type Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setSearchType("text"); setSearchResults([]); }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    searchType === "text"
                      ? "bg-cyan-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Name / Address
                </button>
                <button
                  onClick={() => { setSearchType("auction"); setSearchResults([]); }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    searchType === "auction"
                      ? "bg-cyan-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Auction Date
                </button>
              </div>

              {/* Search Input */}
              {searchType === "text" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search by name, address, phone..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || searchQuery.length < 2}
                    className="px-4 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">From</label>
                      <input
                        type="date"
                        value={searchAuctionDateStart}
                        onChange={(e) => setSearchAuctionDateStart(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">To</label>
                      <input
                        type="date"
                        value={searchAuctionDateEnd}
                        onChange={(e) => setSearchAuctionDateEnd(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchAuctionDateStart}
                    className="w-full px-4 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Search Auctions"}
                  </button>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  {searchResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/dashboard/property/${result.id}`}
                      onClick={() => setShowSearch(false)}
                      className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{result.full_name}</p>
                          <p className="text-sm text-gray-600">{result.property_address}</p>
                          <p className="text-xs text-gray-500">
                            {result.property_city}, {result.property_county} {result.property_zip}
                          </p>
                        </div>
                        {result.auction_date && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Auction: {formatDate(result.auction_date)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && (searchQuery.length >= 2 || searchAuctionDateStart) && !searching && (
                <p className="mt-4 text-center text-gray-500">No results found</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="mb-4">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full bg-white border-2 border-cyan-600 text-cyan-600 rounded-xl p-4 text-center font-semibold hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Customers
          </button>
        </div>

        <div className="mb-6">
          <Link
            href="/worker/visit/new"
            className="block bg-cyan-600 text-white rounded-xl p-4 text-center font-semibold hover:bg-cyan-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Field Visit
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
                  href={`/dashboard/property/${app.id}`}
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
                  className={`rounded-xl p-4 shadow-sm border ${
                    visit.requires_follow_up
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{visit.location_address}</p>
                        {visit.requires_follow_up && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Follow-up Needed
                          </span>
                        )}
                        {visit.attempt_count && visit.attempt_count > 1 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            {visit.attempt_count} attempts
                          </span>
                        )}
                        {visit.interest_level && INTEREST_LEVEL_LABELS[visit.interest_level] && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INTEREST_LEVEL_LABELS[visit.interest_level].color}`}>
                            {INTEREST_LEVEL_LABELS[visit.interest_level].label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {visit.visit_outcome === "attempt" ? "Attempt" : visit.visit_outcome === "engagement" ? "Engagement" : visit.visit_type} - {formatDate(visit.visit_date)}
                      </p>
                      {visit.follow_up_date && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          Follow-up by: {formatDate(visit.follow_up_date)}
                          {extractFollowUpTime(visit.follow_up_notes) && (
                            <span> at {extractFollowUpTime(visit.follow_up_notes)}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Link
                        href={`/worker/visit/${visit.id}/edit`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Edit
                      </Link>
                      {visit.requires_follow_up && (
                        <Link
                          href={`/worker/visit/new?followup=${visit.id}&address=${encodeURIComponent(visit.location_address)}${visit.applicant_id ? `&applicant=${visit.applicant_id}` : ''}`}
                          className="px-3 py-1.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors"
                        >
                          Follow Up
                        </Link>
                      )}
                      {visit.applicant_id && (
                        <Link
                          href={`/dashboard/property/${visit.applicant_id}`}
                          className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      )}
                    </div>
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
          <Link href="/worker/urgent" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1 text-red-600">Urgent</span>
          </Link>
          <Link href="/worker/visits" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
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
