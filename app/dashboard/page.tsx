"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
}

interface Stats {
  total: number;
  pending: number;
  contacted: number;
  in_progress: number;
  closed: number;
  urgent_auctions: number;
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
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [zipFilter, setZipFilter] = useState<string[]>([]);
  const [customZip, setCustomZip] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // San Diego County ZIP codes
  const sanDiegoZips = [
    "91901", "91902", "91905", "91906", "91910", "91911", "91913", "91914", "91915", "91916",
    "91917", "91931", "91932", "91933", "91934", "91935", "91941", "91942", "91945", "91948",
    "91950", "91962", "91963", "91977", "91978", "91980", "92003", "92004", "92007", "92008",
    "92009", "92010", "92011", "92013", "92014", "92018", "92019", "92020", "92021", "92024",
    "92025", "92026", "92027", "92028", "92029", "92037", "92039", "92040", "92054", "92055",
    "92056", "92057", "92058", "92059", "92061", "92064", "92065", "92066", "92067", "92068",
    "92069", "92070", "92071", "92072", "92074", "92075", "92078", "92079", "92081", "92082",
    "92083", "92084", "92086", "92091", "92092", "92093", "92096", "92101", "92102", "92103",
    "92104", "92105", "92106", "92107", "92108", "92109", "92110", "92111", "92112", "92113",
    "92114", "92115", "92116", "92117", "92118", "92119", "92120", "92121", "92122", "92123",
    "92124", "92126", "92127", "92128", "92129", "92130", "92131", "92132", "92134", "92135",
    "92136", "92137", "92138", "92139", "92140", "92142", "92145", "92147", "92149", "92150",
    "92152", "92153", "92154", "92155", "92158", "92159", "92160", "92161", "92163", "92165",
    "92166", "92167", "92168", "92169", "92170", "92171", "92172", "92173", "92174", "92175",
    "92176", "92177", "92178", "92179", "92182", "92186", "92187", "92191", "92192", "92193",
    "92195", "92196", "92197", "92198", "92199"
  ];

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter, countyFilter, zipFilter]);

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

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (countyFilter !== "all") {
      filtered = filtered.filter((app) => app.property_county === countyFilter);
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
    if (customZip && !zipFilter.includes(customZip)) {
      setZipFilter([...zipFilter, customZip]);
      setCustomZip("");
    }
  };

  const setSanDiegoFilter = () => {
    setZipFilter(sanDiegoZips);
  };

  const clearZipFilter = () => {
    setZipFilter([]);
  };

  const getUniqueCounties = () => {
    const counties = applications.map((app) => app.property_county);
    return [...new Set(counties)].filter(Boolean).sort();
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
            <Link href="/" className="text-cyan-600 hover:text-cyan-700 font-medium">
              ← Back to Home
            </Link>
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

        {/* Filters */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filters</h3>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
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
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="countyFilter" className="label">
                Filter by County
              </label>
              <select
                id="countyFilter"
                value={countyFilter}
                onChange={(e) => setCountyFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Counties</option>
                {getUniqueCounties().map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCountyFilter("all");
                  clearZipFilter();
                }}
                className="btn-secondary w-full"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* ZIP Code Filter */}
          <div className="border-t border-gray-200 pt-4">
            <label className="label mb-2">
              Filter by ZIP Code{zipFilter.length > 0 && ` (${zipFilter.length} selected)`}
            </label>

            <div className="flex gap-2 mb-3">
              <button
                onClick={setSanDiegoFilter}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  zipFilter.length === sanDiegoZips.length
                    ? "bg-cyan-600 text-white"
                    : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                }`}
              >
                All San Diego ZIPs ({sanDiegoZips.length})
              </button>
              <button
                onClick={clearZipFilter}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Clear ZIP Filter
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={customZip}
                onChange={(e) => setCustomZip(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCustomZip()}
                placeholder="Add custom ZIP code..."
                className="input-field flex-1"
                maxLength={5}
              />
              <button
                onClick={addCustomZip}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors"
              >
                Add
              </button>
            </div>

            {zipFilter.length > 0 && (
              <div className="flex flex-wrap gap-2">
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
              </div>
            )}
          </div>
        </div>

        {/* Applications Table */}
        <div className="card overflow-hidden">
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

          <div className="overflow-x-auto">
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
                        <Link
                          href={`/dashboard/application/${app.id}`}
                          className="text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          View Details
                        </Link>
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
