"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface ClosedApplication {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone_number: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  close_outcome: string;
  closed_at: string;
}

const CLOSE_OUTCOMES: Record<string, string> = {
  loan_modification_approved: "Loan Modification Approved",
  adu_development: "ADU Development",
  accepted_relocation: "Accepted Relocation",
  customer_filed_bankruptcy: "Customer Filed Bankruptcy",
  moving_forward_other: "Moving Forward Others Option",
  client_refused_help: "Client Refused Help",
};

export default function ClosedApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ClosedApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<ClosedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedApp, setSelectedApp] = useState<ClosedApplication | null>(null);

  // Admin emails that always have access
  const ADMIN_EMAILS = [
    "dschacht@sdrescue.org",
    "larrymonteforte@communitypropertyrescue.com",
    "larryjr@communitypropertyrescue.com",
    "schacht.dan@gmail.com",
    "david@communitypropertyrescue.com",
  ];

  useEffect(() => {
    // Check admin access
    const storedSession = localStorage.getItem("worker_session");
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        const userEmail = session.user?.email?.toLowerCase();
        const isAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || session.profile?.role === "admin";
        if (!isAdmin) {
          router.push("/worker/dashboard");
          return;
        }
      } catch {
        router.push("/worker");
        return;
      }
    }
    fetchClosedApplications();
  }, [router]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, outcomeFilter, startDate, endDate]);

  const fetchClosedApplications = async () => {
    try {
      const response = await fetch("/api/applications?status=closed");
      const result = await response.json();

      if (response.ok) {
        setApplications(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch closed applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.full_name.toLowerCase().includes(term) ||
          app.property_address.toLowerCase().includes(term) ||
          app.phone_number.includes(term) ||
          app.email.toLowerCase().includes(term)
      );
    }

    // Outcome filter
    if (outcomeFilter !== "all") {
      filtered = filtered.filter((app) => app.close_outcome === outcomeFilter);
    }

    // Date range filter (by closed_at)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((app) => {
        if (!app.closed_at) return false;
        return new Date(app.closed_at) >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((app) => {
        if (!app.closed_at) return false;
        return new Date(app.closed_at) <= end;
      });
    }

    setFilteredApplications(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Full Name",
      "Phone Number",
      "Email",
      "Property Address",
      "City",
      "County",
      "ZIP Code",
      "Outcome",
      "Closed Date",
      "Originally Submitted",
    ];

    const rows = filteredApplications.map((app) => [
      app.full_name,
      app.phone_number,
      app.email,
      app.property_address,
      app.property_city || "",
      app.property_county,
      app.property_zip,
      CLOSE_OUTCOMES[app.close_outcome] || app.close_outcome,
      app.closed_at ? formatDate(app.closed_at) : "",
      formatDate(app.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `CPR_Closed_Applications_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getOutcomeBadgeColor = (outcome: string) => {
    switch (outcome) {
      case "loan_modification_approved":
        return "bg-green-100 text-green-800";
      case "adu_development":
        return "bg-blue-100 text-blue-800";
      case "accepted_relocation":
        return "bg-purple-100 text-purple-800";
      case "customer_filed_bankruptcy":
        return "bg-yellow-100 text-yellow-800";
      case "moving_forward_other":
        return "bg-cyan-100 text-cyan-800";
      case "client_refused_help":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate outcome stats
  const outcomeCounts = applications.reduce((acc, app) => {
    const outcome = app.close_outcome || "unknown";
    acc[outcome] = (acc[outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading closed applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Popup Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedApp.full_name}</h3>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Outcome Badge */}
                <div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getOutcomeBadgeColor(selectedApp.close_outcome)}`}>
                    {CLOSE_OUTCOMES[selectedApp.close_outcome] || selectedApp.close_outcome}
                  </span>
                </div>

                {/* Property Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Property</h4>
                  <p className="text-gray-900 font-medium">{selectedApp.property_address}</p>
                  <p className="text-gray-600">{selectedApp.property_city}, {selectedApp.property_county} {selectedApp.property_zip}</p>
                </div>

                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Contact</h4>
                  <p className="text-gray-900">{selectedApp.phone_number}</p>
                  <p className="text-gray-600">{selectedApp.email}</p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Submitted</h4>
                    <p className="text-gray-900">{formatDate(selectedApp.created_at)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Closed</h4>
                    <p className="text-gray-900">{formatDate(selectedApp.closed_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href={`/dashboard/property/${selectedApp.id}`}
                    className="flex-1 bg-cyan-600 text-white text-center py-2 rounded-lg font-medium hover:bg-cyan-700"
                  >
                    View Full Details
                  </Link>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <h1 className="text-xl font-bold text-gray-900">Closed Applications</h1>
                <p className="text-sm text-gray-600">Community Property Rescue</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-cyan-600 hover:text-cyan-700 font-medium">
                ← Back to Dashboard
              </Link>
              <Link href="/dashboard/reports" className="text-gray-600 hover:text-gray-800 font-medium">
                Reports
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Outcome Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Total Closed</p>
            <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
          </div>
          {Object.entries(CLOSE_OUTCOMES).map(([key, label]) => (
            <div key={key} className="card">
              <p className="text-xs text-gray-600 mb-1 truncate" title={label}>{label}</p>
              <p className={`text-2xl font-bold ${getOutcomeBadgeColor(key).replace('bg-', 'text-').replace('-100', '-600')}`}>
                {outcomeCounts[key] || 0}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, address, phone, email..."
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Outcome</label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Outcomes</option>
                {Object.entries(CLOSE_OUTCOMES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Closed From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Closed To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredApplications.length} of {applications.length} closed applications
            </p>
            <button
              onClick={exportToCSV}
              disabled={filteredApplications.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to CSV
            </button>
          </div>
        </div>

        {/* Applications Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closed Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No closed applications found
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedApp(app)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{app.full_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{app.property_address}</div>
                        <div className="text-sm text-gray-500">
                          {app.property_city}, {app.property_county} {app.property_zip}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{app.phone_number}</div>
                        <div className="text-sm text-gray-500">{app.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getOutcomeBadgeColor(
                            app.close_outcome
                          )}`}
                        >
                          {CLOSE_OUTCOMES[app.close_outcome] || app.close_outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.closed_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          className="text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          View Details
                        </button>
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
