"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamic import for the map to avoid SSR issues
const HeatMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
    </div>
  ),
});

interface Application {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone_number: string;
  property_address: string;
  property_city?: string;
  property_county: string;
  property_zip: string;
  status: string;
  has_auction_date: boolean;
  auction_date?: string;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  assigned_to?: string;
  close_outcome?: string;
  closed_at?: string;
  source?: string;
  submitted_by_worker?: string;
}

const CLOSE_OUTCOMES = [
  { value: "loan_modification_approved", label: "Loan Modification Approved" },
  { value: "adu_development", label: "ADU Development" },
  { value: "accepted_relocation", label: "Accepted Relocation" },
  { value: "customer_filed_bankruptcy", label: "Customer Filed Bankruptcy" },
  { value: "moving_forward_other", label: "Moving Forward Others Option" },
  { value: "client_refused_help", label: "Client Refused Help" },
];

interface Worker {
  id: string;
  full_name: string;
  role: string;
}

interface Stats {
  total: number;
  pending: number;
  contacted: number;
  in_progress: number;
  closed: number;
  urgent_auctions: number;
}

interface VisitLocation {
  id: string;
  latitude: number;
  longitude: number;
  visit_outcome?: string;
  location_address: string;
  visit_date: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    contacted: 0,
    in_progress: 0,
    closed: 0,
    urgent_auctions: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zipFilter, setZipFilter] = useState<string[]>([]);
  const [customZip, setCustomZip] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [visitLocations, setVisitLocations] = useState<VisitLocation[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [statsPopup, setStatsPopup] = useState<string | null>(null);

  // Admin emails that always have access
  const ADMIN_EMAILS = [
    "dschacht@sdrescue.org",
    "larry@communitypropertyrescue.com",
    "larryjr@communitypropertyrescue.com",
    "schacht.dan@gmail.com",
    "david@communitypropertyrescue.com",
    "taylor@communitypropertyrescue.com",
    "andrew@communitypropertyrescue.com",
  ];

  // Email with delete access for testing
  const DELETE_ACCESS_EMAIL = "larry@communitypropertyrescue.com";

  // Check admin access on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      const storedSession = localStorage.getItem("worker_session");
      if (!storedSession) {
        router.push("/worker");
        return;
      }

      try {
        const session = JSON.parse(storedSession);
        const email = session.user?.email?.toLowerCase();
        setUserEmail(email || "");
        // Check if user email is in admin list
        if (email && ADMIN_EMAILS.includes(email)) {
          session.profile.role = "admin";
          localStorage.setItem("worker_session", JSON.stringify(session));
          setAuthChecked(true);
          fetchApplications();
          fetchWorkers();
          fetchVisitLocations();
          return;
        }

        // Fetch fresh profile from database to get current role
        const response = await fetch(`/api/user/profile?userId=${session.user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data?.role === "admin") {
            session.profile.role = "admin";
            localStorage.setItem("worker_session", JSON.stringify(session));
            setAuthChecked(true);
            fetchApplications();
            fetchWorkers();
            fetchVisitLocations();
            return;
          }
        }

        // Fallback: check stored session role
        if (session.profile?.role === "admin") {
          setAuthChecked(true);
          fetchApplications();
          fetchWorkers();
          fetchVisitLocations();
          return;
        }

        router.push("/worker/dashboard");
      } catch {
        router.push("/worker");
      }
    };

    checkAdminAccess();
  }, [router]);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter, zipFilter]);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/applications");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch applications");
      }

      setApplications(result.data);
      calculateStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch("/api/workers");
      const result = await response.json();
      if (response.ok) {
        setWorkers(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    }
  };

  const fetchVisitLocations = async () => {
    try {
      const response = await fetch("/api/dashboard/field-visits");
      const result = await response.json();
      if (response.ok && result.data) {
        // Filter to only visits with GPS coordinates
        const locationsWithCoords = result.data.filter(
          (v: VisitLocation) => v.latitude && v.longitude
        );
        setVisitLocations(locationsWithCoords);
      }
    } catch (err) {
      console.error("Failed to fetch visit locations:", err);
    }
  };

  const handleAssignWorker = async (applicationId: string, workerId: string | null) => {
    setAssigningId(applicationId);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: workerId }),
      });

      if (response.ok) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, assigned_to: workerId || undefined } : app
          )
        );
      }
    } catch (err) {
      console.error("Failed to assign worker:", err);
    } finally {
      setAssigningId(null);
    }
  };

  const handleCloseApplication = async (applicationId: string, outcome: string) => {
    if (!outcome) return;

    setClosingId(applicationId);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "closed",
          close_outcome: outcome,
          closed_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Remove from active applications list
        setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      }
    } catch (err) {
      console.error("Failed to close application:", err);
    } finally {
      setClosingId(null);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm("Are you sure you want to DELETE this application? This cannot be undone.")) {
      return;
    }

    setDeletingAppId(applicationId);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      } else {
        alert("Failed to delete application");
      }
    } catch (err) {
      console.error("Failed to delete application:", err);
      alert("Failed to delete application");
    } finally {
      setDeletingAppId(null);
    }
  };

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return null;
    const worker = workers.find((w) => w.id === workerId);
    return worker?.full_name || "Unknown";
  };

  const getSubmittedByName = (workerId?: string) => {
    if (!workerId) return null;
    const worker = workers.find((w) => w.id === workerId);
    return worker?.full_name || "Field Worker";
  };

  const calculateStats = (data: Application[]) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: data.length,
      pending: data.filter((app) => app.status === "pending").length,
      contacted: data.filter((app) => app.status === "contacted").length,
      in_progress: data.filter((app) => app.status === "in-progress").length,
      closed: data.filter((app) => app.status === "closed").length,
      urgent_auctions: data.filter((app) => {
        if (!app.auction_date) return false;
        const auctionDate = new Date(app.auction_date);
        return auctionDate <= thirtyDaysFromNow;
      }).length,
    };

    setStats(stats);
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Filter by status
    if (statusFilter === "closed") {
      filtered = filtered.filter((app) => app.status === "closed");
    } else if (statusFilter === "urgent") {
      // Filter for urgent auctions (within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((app) => {
        if (!app.auction_date) return false;
        const auctionDate = new Date(app.auction_date);
        return auctionDate <= thirtyDaysFromNow;
      });
      // Sort by closest auction date
      filtered.sort((a, b) => new Date(a.auction_date!).getTime() - new Date(b.auction_date!).getTime());
    } else if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter && app.status !== "closed");
    }
    // "all" shows all applications

    if (zipFilter.length > 0) {
      filtered = filtered.filter((app) => zipFilter.includes(app.property_zip));
    }

    setFilteredApplications(filtered);
  };

  const getPopupApplications = () => {
    if (!statsPopup) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    switch (statsPopup) {
      case "all":
        return applications;
      case "pending":
        return applications.filter((app) => app.status === "pending");
      case "contacted":
        return applications.filter((app) => app.status === "contacted");
      case "in-progress":
        return applications.filter((app) => app.status === "in-progress");
      case "urgent":
        return applications.filter((app) => {
          if (!app.auction_date) return false;
          const auctionDate = new Date(app.auction_date);
          return auctionDate <= thirtyDaysFromNow;
        }).sort((a, b) => new Date(a.auction_date!).getTime() - new Date(b.auction_date!).getTime());
      default:
        return [];
    }
  };

  const getPopupTitle = () => {
    switch (statsPopup) {
      case "all": return "All Applications";
      case "pending": return "Pending Applications";
      case "contacted": return "Contacted Applications";
      case "in-progress": return "In Progress Applications";
      case "urgent": return "Urgent Auctions (within 30 days)";
      default: return "";
    }
  };

  const toggleZipFilter = (zip: string) => {
    setZipFilter((prev) =>
      prev.includes(zip) ? prev.filter((z) => z !== zip) : [...prev, zip]
    );
  };

  const addCustomZip = () => {
    if (customZip && customZip.length === 5 && !zipFilter.includes(customZip)) {
      setZipFilter([...zipFilter, customZip]);
      setCustomZip("");
    }
  };

  const clearZipFilter = () => {
    setZipFilter([]);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "contacted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in-progress":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isAuctionUrgent = (auctionDate?: string) => {
    if (!auctionDate) return false;
    const now = new Date();
    const auction = new Date(auctionDate);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return auction <= sevenDaysFromNow;
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Make sure your Supabase connection is configured correctly in your environment variables.
          </p>
          <button onClick={fetchApplications} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stats Popup Modal */}
      {statsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{getPopupTitle()}</h3>
              <button
                onClick={() => setStatsPopup(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {getPopupApplications().length === 0 ? (
                <p className="text-center text-gray-500 py-8">No applications found</p>
              ) : (
                <div className="space-y-3">
                  {getPopupApplications().map((app) => (
                    <div
                      key={app.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{app.full_name}</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(app.status)}`}>
                              {app.status}
                            </span>
                            {app.auction_date && (
                              <span className="text-xs text-red-600 font-medium">
                                Auction: {new Date(app.auction_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{app.property_address}</p>
                          <p className="text-sm text-gray-500">{app.property_city}, {app.property_county} {app.property_zip}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <a href={`tel:${app.phone_number}`} className="text-cyan-600 hover:text-cyan-700">
                              {app.phone_number}
                            </a>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-500">{app.email}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/dashboard/property/${app.id}`}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 text-center"
                            onClick={() => setStatsPopup(null)}
                          >
                            View/Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                {getPopupApplications().length} application{getPopupApplications().length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/cpr.png"
                alt="Community Property Rescue Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Community Property Rescue</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/closed" className="text-gray-600 hover:text-gray-800 font-medium">
                Closed Applications
              </Link>
              <Link href="/dashboard/duplicates" className="text-amber-600 hover:text-amber-700 font-medium">
                Duplicates
              </Link>
              <Link href="/dashboard/reports" className="text-cyan-600 hover:text-cyan-700 font-medium">
                Reports & Analytics
              </Link>
              <Link href="/dashboard/users" className="text-purple-600 hover:text-purple-700 font-medium">
                User Management
              </Link>
              <Link href="/" className="text-gray-500 hover:text-gray-700 font-medium">
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Clickable to open popup */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setStatsPopup("all")}
            className="card text-left hover:ring-2 hover:ring-gray-300 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </button>
          <button
            type="button"
            onClick={() => setStatsPopup("pending")}
            className="card text-left hover:ring-2 hover:ring-yellow-300 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </button>
          <button
            type="button"
            onClick={() => setStatsPopup("contacted")}
            className="card text-left hover:ring-2 hover:ring-blue-300 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Contacted</p>
            <p className="text-3xl font-bold text-blue-600">{stats.contacted}</p>
          </button>
          <button
            type="button"
            onClick={() => setStatsPopup("in-progress")}
            className="card text-left hover:ring-2 hover:ring-cyan-300 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-cyan-600">{stats.in_progress}</p>
          </button>
          <Link
            href="/dashboard/closed"
            className="card text-left hover:ring-2 hover:ring-gray-300 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Closed</p>
            <p className="text-3xl font-bold text-gray-600">{stats.closed}</p>
          </Link>
          <button
            type="button"
            onClick={() => setStatsPopup("urgent")}
            className="card text-left hover:ring-2 hover:ring-red-300 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Urgent Auctions</p>
            <p className="text-3xl font-bold text-red-600">{stats.urgent_auctions}</p>
          </button>
        </div>

        {/* Heat Map */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Field Visit Heat Map</h2>
              <p className="text-sm text-gray-600">
                {visitLocations.length} visits with GPS coordinates
              </p>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>
          {showMap && <HeatMap visits={visitLocations} height="400px" />}
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="statusFilter" className="label">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
                <option value="urgent">Urgent Auctions</option>
              </select>
            </div>

            <div>
              <label className="label">
                Filter by ZIP Code {zipFilter.length > 0 && `(${zipFilter.length} selected)`}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customZip}
                  onChange={(e) => setCustomZip(e.target.value.replace(/\D/g, ""))}
                  onKeyPress={(e) => e.key === "Enter" && addCustomZip()}
                  placeholder="Enter ZIP code..."
                  className="input-field flex-1"
                  maxLength={5}
                />
                <button
                  onClick={addCustomZip}
                  disabled={customZip.length !== 5}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {zipFilter.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {zipFilter.map((zip) => (
                    <span
                      key={zip}
                      className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {zip}
                      <button
                        onClick={() => toggleZipFilter(zip)}
                        className="hover:bg-cyan-200 rounded-full p-0.5 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={clearZipFilter}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="card overflow-visible">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Applications ({filteredApplications.length})
            </h2>
            <button onClick={fetchApplications} className="text-cyan-600 hover:text-cyan-700">
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[320px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No applications found
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{app.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{app.email}</div>
                        <div className="text-sm text-gray-500">{app.phone_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{app.property_address}</div>
                        <div className="text-sm text-gray-500">{app.property_county}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {app.has_notice_of_default && (
                            <span className="block text-orange-600 text-xs">• NOD</span>
                          )}
                          {app.has_notice_of_trustee_sale && (
                            <span className="block text-red-600 text-xs">• NTS</span>
                          )}
                          {app.auction_date && (
                            <span
                              className={`block text-xs ${
                                isAuctionUrgent(app.auction_date)
                                  ? "text-red-600 font-bold"
                                  : "text-gray-600"
                              }`}
                            >
                              🗓 {formatDate(app.auction_date)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {app.source === "field_intake" ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {getSubmittedByName(app.submitted_by_worker) || "Field Worker"}
                          </span>
                        ) : (
                          <span className="text-gray-400">Online</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={app.assigned_to || ""}
                          onChange={(e) =>
                            handleAssignWorker(app.id, e.target.value || null)
                          }
                          disabled={assigningId === app.id}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-gray-900 font-medium"
                        >
                          <option value="" className="text-gray-700">Unassigned</option>
                          {workers.map((worker) => (
                            <option key={worker.id} value={worker.id} className="text-gray-900">
                              {worker.full_name}
                            </option>
                          ))}
                        </select>
                        {assigningId === app.id && (
                          <span className="ml-2 text-gray-400">...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3 flex-nowrap">
                          <Link
                            href={`/dashboard/property/${app.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium whitespace-nowrap"
                          >
                            View
                          </Link>
                          <select
                            value=""
                            onChange={(e) => handleCloseApplication(app.id, e.target.value)}
                            disabled={closingId === app.id}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 min-w-[180px] cursor-pointer bg-white"
                          >
                            <option value="">Close Out...</option>
                            {CLOSE_OUTCOMES.map((outcome) => (
                              <option key={outcome.value} value={outcome.value}>
                                {outcome.label}
                              </option>
                            ))}
                          </select>
                          {closingId === app.id && (
                            <span className="text-gray-400 text-xs whitespace-nowrap">Closing...</span>
                          )}
                          {userEmail.toLowerCase() === DELETE_ACCESS_EMAIL.toLowerCase() && (
                            <button
                              onClick={() => handleDeleteApplication(app.id)}
                              disabled={deletingAppId === app.id}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingAppId === app.id ? "..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
