"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import the map to avoid SSR issues
const FieldVisitHeatMap = dynamic(
  () => import("@/components/FieldVisitHeatMap"),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" /> }
);

interface FieldVisit {
  id: string;
  latitude: number;
  longitude: number;
  visit_date: string;
  visit_type: string;
  visit_outcome?: string; // "attempt" or "engagement"
  location_address: string;
  contact_name?: string;
  staff_member: string;
  applicant_id?: string;
  property_condition_notes?: string;
  occupant_situation?: string;
  immediate_needs?: string;
  requires_follow_up: boolean;
}

interface Application {
  id: string;
  full_name: string;
  property_county: string;
  property_zip: string;
  status: string;
  created_at: string;
  has_auction_date: boolean;
  auction_date?: string;
  assigned_to?: string;
}

interface Worker {
  id: string;
  full_name: string;
}

interface ReportMetrics {
  totalApplications: number;
  pendingApplications: number;
  inProgressApplications: number;
  closedApplications: number;
  totalFieldVisits: number;
  visitsWithFollowUp: number;
  urgentAuctions: number;
  applicationsByCounty: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  visitsByType: Record<string, number>;
  visitsByWorker: Record<string, number>;
  // Attempt vs Engagement metrics
  totalAttempts: number;
  totalEngagements: number;
  attemptsByWorker: Record<string, number>;
  engagementsByWorker: Record<string, number>;
  engagementRate: number; // percentage
}

export default function ReportsPage() {
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "metrics" | "export">("map");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (applications.length > 0 || fieldVisits.length > 0) {
      calculateMetrics();
    }
  }, [applications, fieldVisits, startDate, endDate]);

  const fetchData = async () => {
    try {
      const [appsRes, visitsRes, workersRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/dashboard/field-visits"),
        fetch("/api/workers"),
      ]);

      const appsData = await appsRes.json();
      const visitsData = await visitsRes.json();
      const workersData = await workersRes.json();

      setApplications(appsData.data || []);
      setFieldVisits(visitsData.data || []);
      setWorkers(workersData.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    // Filter by date range if specified
    let filteredApps = [...applications];
    let filteredVisits = [...fieldVisits];

    if (startDate) {
      filteredApps = filteredApps.filter(
        (a) => a.created_at.substring(0, 10) >= startDate
      );
      filteredVisits = filteredVisits.filter(
        (v) => v.visit_date.substring(0, 10) >= startDate
      );
    }
    if (endDate) {
      filteredApps = filteredApps.filter(
        (a) => a.created_at.substring(0, 10) <= endDate
      );
      filteredVisits = filteredVisits.filter(
        (v) => v.visit_date.substring(0, 10) <= endDate
      );
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const applicationsByCounty: Record<string, number> = {};
    const applicationsByStatus: Record<string, number> = {};
    const visitsByType: Record<string, number> = {};
    const visitsByWorker: Record<string, number> = {};
    const attemptsByWorker: Record<string, number> = {};
    const engagementsByWorker: Record<string, number> = {};

    filteredApps.forEach((app) => {
      applicationsByCounty[app.property_county] =
        (applicationsByCounty[app.property_county] || 0) + 1;
      applicationsByStatus[app.status] =
        (applicationsByStatus[app.status] || 0) + 1;
    });

    let totalAttempts = 0;
    let totalEngagements = 0;

    filteredVisits.forEach((visit) => {
      visitsByType[visit.visit_type] = (visitsByType[visit.visit_type] || 0) + 1;
      const worker = workers.find((w) => w.id === visit.staff_member);
      const workerName = worker?.full_name || "Unknown";
      visitsByWorker[workerName] = (visitsByWorker[workerName] || 0) + 1;

      // Track attempt vs engagement
      if (visit.visit_outcome === "attempt") {
        totalAttempts++;
        attemptsByWorker[workerName] = (attemptsByWorker[workerName] || 0) + 1;
      } else if (visit.visit_outcome === "engagement") {
        totalEngagements++;
        engagementsByWorker[workerName] = (engagementsByWorker[workerName] || 0) + 1;
      }
    });

    const engagementRate = filteredVisits.length > 0
      ? Math.round((totalEngagements / filteredVisits.length) * 100)
      : 0;

    setMetrics({
      totalApplications: filteredApps.length,
      pendingApplications: filteredApps.filter((a) => a.status === "pending")
        .length,
      inProgressApplications: filteredApps.filter(
        (a) => a.status === "in-progress"
      ).length,
      closedApplications: filteredApps.filter((a) => a.status === "closed")
        .length,
      totalFieldVisits: filteredVisits.length,
      visitsWithFollowUp: filteredVisits.filter((v) => v.requires_follow_up)
        .length,
      urgentAuctions: filteredApps.filter((a) => {
        if (!a.auction_date) return false;
        const auctionDate = new Date(a.auction_date);
        return auctionDate <= sevenDaysFromNow;
      }).length,
      applicationsByCounty,
      applicationsByStatus,
      visitsByType,
      visitsByWorker,
      totalAttempts,
      totalEngagements,
      attemptsByWorker,
      engagementsByWorker,
      engagementRate,
    });
  };

  const exportToCSV = (type: "applications" | "visits") => {
    let data: Record<string, unknown>[];
    let filename: string;

    if (type === "applications") {
      data = applications.map((a) => ({
        "Full Name": a.full_name,
        County: a.property_county,
        "ZIP Code": a.property_zip,
        Status: a.status,
        "Has Auction": a.has_auction_date ? "Yes" : "No",
        "Auction Date": a.auction_date || "",
        "Submitted Date": a.created_at.substring(0, 10),
      }));
      filename = `applications_${new Date().toISOString().substring(0, 10)}.csv`;
    } else {
      data = fieldVisits.map((v) => ({
        "Visit Date": v.visit_date.substring(0, 10),
        "Visit Type": v.visit_type,
        "Outcome": v.visit_outcome === "attempt" ? "Attempt (No Contact)" : v.visit_outcome === "engagement" ? "Engagement" : "",
        Address: v.location_address,
        "Contact Name": v.contact_name || "",
        "Property Condition": v.property_condition_notes || "",
        "Occupant Situation": v.occupant_situation || "",
        "Immediate Needs": v.immediate_needs || "",
        "Requires Follow-up": v.requires_follow_up ? "Yes" : "No",
        Latitude: v.latitude || "",
        Longitude: v.longitude || "",
      }));
      filename = `field_visits_${new Date().toISOString().substring(0, 10)}.csv`;
    }

    // Convert to CSV
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            // Escape quotes and wrap in quotes
            return `"${String(val || "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const visitTypeLabels: Record<string, string> = {
    "initial-contact": "Initial Contact",
    "follow-up": "Follow Up",
    "property-inspection": "Property Inspection",
    "document-collection": "Document Collection",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
                <h1 className="text-xl font-bold text-gray-900">
                  Reports & Analytics
                </h1>
                <p className="text-sm text-gray-600">Community Property Rescue</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-cyan-600 hover:text-cyan-700 font-medium"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Date Range Filter
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
              />
            </div>
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "map"
                ? "bg-white text-cyan-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Heat Map
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "metrics"
                ? "bg-white text-cyan-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "export"
                ? "bg-white text-cyan-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Export
          </button>
        </div>

        {/* Heat Map Tab */}
        {activeTab === "map" && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Field Visit Locations
            </h2>
            <FieldVisitHeatMap visits={fieldVisits} />
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && metrics && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card">
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.totalApplications}
                </p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-600">Field Visits</p>
                <p className="text-3xl font-bold text-cyan-600">
                  {metrics.totalFieldVisits}
                </p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {metrics.pendingApplications}
                </p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-600">Urgent Auctions</p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics.urgentAuctions}
                </p>
              </div>
            </div>

            {/* Attempt vs Engagement Summary */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Worker Accountability: Attempts vs Engagements
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{metrics.totalAttempts}</p>
                  <p className="text-sm text-amber-700">Attempts</p>
                  <p className="text-xs text-gray-500">No one home</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{metrics.totalEngagements}</p>
                  <p className="text-sm text-green-700">Engagements</p>
                  <p className="text-xs text-gray-500">Client contact</p>
                </div>
                <div className="bg-cyan-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-cyan-600">{metrics.engagementRate}%</p>
                  <p className="text-sm text-cyan-700">Engagement Rate</p>
                  <p className="text-xs text-gray-500">Success ratio</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{metrics.visitsWithFollowUp}</p>
                  <p className="text-sm text-purple-700">Pending Follow-ups</p>
                  <p className="text-xs text-gray-500">Need return visit</p>
                </div>
              </div>

              {/* Worker breakdown */}
              {Object.keys(metrics.visitsByWorker).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Worker Performance</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-600">Worker</th>
                          <th className="text-center py-2 text-gray-600">Total Visits</th>
                          <th className="text-center py-2 text-amber-600">Attempts</th>
                          <th className="text-center py-2 text-green-600">Engagements</th>
                          <th className="text-center py-2 text-gray-600">Engagement Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(metrics.visitsByWorker)
                          .sort(([, a], [, b]) => b - a)
                          .map(([worker, total]) => {
                            const attempts = metrics.attemptsByWorker[worker] || 0;
                            const engagements = metrics.engagementsByWorker[worker] || 0;
                            const rate = total > 0 ? Math.round((engagements / total) * 100) : 0;
                            return (
                              <tr key={worker} className="border-b border-gray-100">
                                <td className="py-2 text-gray-900">{worker}</td>
                                <td className="py-2 text-center text-gray-900">{total}</td>
                                <td className="py-2 text-center text-amber-600">{attempts}</td>
                                <td className="py-2 text-center text-green-600">{engagements}</td>
                                <td className="py-2 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    rate >= 70 ? 'bg-green-100 text-green-700' :
                                    rate >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {rate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Breakdown Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Applications by Status */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Applications by Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.applicationsByStatus).map(
                    ([status, count]) => (
                      <div key={status} className="flex items-center">
                        <span className="w-28 text-sm text-gray-600 capitalize">
                          {status}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                          <div
                            className="bg-cyan-600 h-4 rounded-full"
                            style={{
                              width: `${
                                (count / metrics.totalApplications) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-sm font-medium text-gray-900 text-right">
                          {count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Applications by County */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Applications by County
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.applicationsByCounty)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([county, count]) => (
                      <div key={county} className="flex items-center">
                        <span className="w-28 text-sm text-gray-600 truncate">
                          {county}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                          <div
                            className="bg-amber-500 h-4 rounded-full"
                            style={{
                              width: `${
                                (count / metrics.totalApplications) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-sm font-medium text-gray-900 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Visits by Type */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Field Visits by Type
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.visitsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center">
                      <span className="w-36 text-sm text-gray-600">
                        {visitTypeLabels[type] || type}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{
                            width: `${
                              metrics.totalFieldVisits > 0
                                ? (count / metrics.totalFieldVisits) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-sm font-medium text-gray-900 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visits by Worker */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Field Visits by Worker
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.visitsByWorker)
                    .sort(([, a], [, b]) => b - a)
                    .map(([worker, count]) => (
                      <div key={worker} className="flex items-center">
                        <span className="w-28 text-sm text-gray-600 truncate">
                          {worker}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                          <div
                            className="bg-purple-500 h-4 rounded-full"
                            style={{
                              width: `${
                                metrics.totalFieldVisits > 0
                                  ? (count / metrics.totalFieldVisits) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-sm font-medium text-gray-900 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Export Data
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Applications
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Export all application data including contact info, property
                  details, and status.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {applications.length} records
                </p>
                <button
                  onClick={() => exportToCSV("applications")}
                  className="btn-primary"
                >
                  Download CSV
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Field Visits
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Export all field visit data including GPS coordinates, notes,
                  and follow-up info.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {fieldVisits.length} records
                </p>
                <button
                  onClick={() => exportToCSV("visits")}
                  className="btn-primary"
                >
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
