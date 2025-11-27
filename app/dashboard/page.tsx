"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetchApplications();
    fetchWorkers();
    fetchVisitLocations();
  }, []);

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

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return null;
    const worker = workers.find((w) => w.id === workerId);
    return worker?.full_name || "Unknown";
  };

  const calculateStats = (data: Application[]) => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: data.length,
      pending: data.filter((app) => app.status === "pending").length,
      contacted: data.filter((app) => app.status === "contacted").length,
      in_progress: data.filter((app) => app.status === "in-progress").length,
      closed: data.filter((app) => app.status === "closed").length,
      urgent_auctions: data.filter((app) => {
        if (!app.auction_date) return false;
        const auctionDate = new Date(app.auction_date);
        return auctionDate <= sevenDaysFromNow;
      }).length,
    };

    setStats(stats);
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Always exclude closed applications from main dashboard
    // (they have their own page)
    filtered = filtered.filter((app) => app.status !== "closed");

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (zipFilter.length > 0) {
      filtered = filtered.filter((app) => zipFilter.includes(app.property_zip));
    }

    setFilteredApplications(filtered);
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
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              <Link href="/dashboard/reports" className="text-cyan-600 hover:text-cyan-700 font-medium">
                Reports & Analytics
              </Link>
              <Link href="/" className="text-gray-500 hover:text-gray-700 font-medium">
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Contacted</p>
            <p className="text-3xl font-bold text-blue-600">{stats.contacted}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-cyan-600">{stats.in_progress}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Closed</p>
            <p className="text-3xl font-bold text-gray-600">{stats.closed}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Urgent Auctions</p>
            <p className="text-3xl font-bold text-red-600">{stats.urgent_auctions}</p>
          </div>
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
                <option value="all">All Active</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="in-progress">In Progress</option>
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
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/property/${app.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium"
                          >
                            View
                          </Link>
                          <select
                            value=""
                            onChange={(e) => handleCloseApplication(app.id, e.target.value)}
                            disabled={closingId === app.id}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                          >
                            <option value="">Close Out...</option>
                            {CLOSE_OUTCOMES.map((outcome) => (
                              <option key={outcome.value} value={outcome.value}>
                                {outcome.label}
                              </option>
                            ))}
                          </select>
                          {closingId === app.id && (
                            <span className="text-gray-400 text-xs">Closing...</span>
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
