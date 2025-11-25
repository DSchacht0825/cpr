"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDatePacific, formatShortDate } from "@/lib/dateUtils";

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
  general_notes?: string;
  requires_follow_up: boolean;
}

interface Application {
  id: string;
  full_name: string;
  property_address: string;
  property_county: string;
  property_zip: string;
  status: string;
  created_at: string;
  has_auction_date: boolean;
  auction_date?: string;
  assigned_to?: string;
  phone_number: string;
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
  const [activeTab, setActiveTab] = useState<"map" | "metrics" | "inactive" | "worker" | "export">("map");
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<"applications" | "visits" | "pending" | "urgent" | null>(null);

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
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg mb-6">
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
            onClick={() => setActiveTab("inactive")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "inactive"
                ? "bg-white text-cyan-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            No Activity
          </button>
          <button
            onClick={() => setActiveTab("worker")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "worker"
                ? "bg-white text-cyan-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            By Worker
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
            {/* Summary Cards - Now Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setSelectedCard("applications")}
                className="card text-left hover:ring-2 hover:ring-cyan-500 transition-all cursor-pointer"
              >
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.totalApplications}
                </p>
                <p className="text-xs text-cyan-600 mt-1">Click to view all</p>
              </button>
              <button
                onClick={() => setSelectedCard("visits")}
                className="card text-left hover:ring-2 hover:ring-cyan-500 transition-all cursor-pointer"
              >
                <p className="text-sm text-gray-600">Field Visits</p>
                <p className="text-3xl font-bold text-cyan-600">
                  {metrics.totalFieldVisits}
                </p>
                <p className="text-xs text-cyan-600 mt-1">Click to view all</p>
              </button>
              <button
                onClick={() => setSelectedCard("pending")}
                className="card text-left hover:ring-2 hover:ring-yellow-500 transition-all cursor-pointer"
              >
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {metrics.pendingApplications}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Click to view all</p>
              </button>
              <button
                onClick={() => setSelectedCard("urgent")}
                className="card text-left hover:ring-2 hover:ring-red-500 transition-all cursor-pointer"
              >
                <p className="text-sm text-gray-600">Urgent Auctions</p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics.urgentAuctions}
                </p>
                <p className="text-xs text-red-600 mt-1">Click to view all</p>
              </button>
            </div>

            {/* Detail Modal/Panel for clicked card */}
            {selectedCard && (
              <div className="card border-2 border-cyan-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedCard === "applications" && "All Applications"}
                    {selectedCard === "visits" && "All Field Visits"}
                    {selectedCard === "pending" && "Pending Applications"}
                    {selectedCard === "urgent" && "Urgent Auctions (Within 7 Days)"}
                  </h3>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Applications List */}
                {(selectedCard === "applications" || selectedCard === "pending" || selectedCard === "urgent") && (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          {selectedCard === "urgent" && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction Date</th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          const now = new Date();
                          const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

                          let filteredApps = applications;
                          if (selectedCard === "pending") {
                            filteredApps = applications.filter(a => a.status === "pending");
                          } else if (selectedCard === "urgent") {
                            filteredApps = applications.filter(a => {
                              if (!a.auction_date) return false;
                              const auctionDate = new Date(a.auction_date);
                              return auctionDate <= sevenDaysFromNow;
                            });
                          }

                          if (filteredApps.length === 0) {
                            return (
                              <tr>
                                <td colSpan={selectedCard === "urgent" ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                                  No applications found
                                </td>
                              </tr>
                            );
                          }

                          return filteredApps.map((app) => (
                            <tr key={app.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{app.full_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {app.property_address}
                                <br />
                                <span className="text-gray-400">{app.property_county} {app.property_zip}</span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <a href={`tel:${app.phone_number}`} className="text-cyan-600 hover:text-cyan-700">
                                  {app.phone_number}
                                </a>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  app.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                  app.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                                  app.status === "closed" ? "bg-gray-100 text-gray-800" :
                                  "bg-green-100 text-green-800"
                                }`}>
                                  {app.status}
                                </span>
                              </td>
                              {selectedCard === "urgent" && (
                                <td className="px-4 py-3 text-sm text-red-600 font-medium">
                                  {app.auction_date ? formatShortDate(app.auction_date) : "-"}
                                </td>
                              )}
                              <td className="px-4 py-3 text-sm">
                                <Link
                                  href={`/dashboard/property/${app.id}`}
                                  className="text-cyan-600 hover:text-cyan-700 font-medium"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Field Visits List */}
                {selectedCard === "visits" && (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {fieldVisits.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                              No field visits found
                            </td>
                          </tr>
                        ) : (
                          fieldVisits.slice(0, 100).map((visit) => {
                            const worker = workers.find(w => w.id === visit.staff_member);
                            return (
                              <tr key={visit.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {formatShortDate(visit.visit_date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {visit.location_address}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {visitTypeLabels[visit.visit_type] || visit.visit_type}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {visit.visit_outcome && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      visit.visit_outcome === "attempt"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-green-100 text-green-800"
                                    }`}>
                                      {visit.visit_outcome === "attempt" ? "Attempt" : "Engagement"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {worker?.full_name || "Unknown"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                    {fieldVisits.length > 100 && (
                      <p className="text-sm text-gray-500 mt-2 px-4">Showing first 100 of {fieldVisits.length} visits</p>
                    )}
                  </div>
                )}
              </div>
            )}

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

        {/* No Activity Tab - Properties without visits in last 7 days */}
        {activeTab === "inactive" && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Properties Without Recent Activity
            </h2>
            <p className="text-gray-600 mb-6">
              Applications that have not had any field visits in the last 7 days.
            </p>

            {(() => {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

              // Get applicant IDs that have visits in last 7 days
              const recentlyVisitedIds = new Set(
                fieldVisits
                  .filter((v) => new Date(v.visit_date) >= sevenDaysAgo && v.applicant_id)
                  .map((v) => v.applicant_id)
              );

              // Find applications without recent visits
              const inactiveApps = applications.filter(
                (app) => !recentlyVisitedIds.has(app.id) && app.status !== "closed"
              );

              if (inactiveApps.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-600 font-medium">All active properties have been visited recently!</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inactiveApps.map((app) => {
                        const assignedWorker = workers.find((w) => w.id === app.assigned_to);
                        return (
                          <tr key={app.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{app.full_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {app.property_address}
                              <br />
                              <span className="text-gray-400">{app.property_county} {app.property_zip}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <a href={`tel:${app.phone_number}`} className="text-cyan-600 hover:text-cyan-700">
                                {app.phone_number}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                app.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                app.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {assignedWorker?.full_name || <span className="text-red-500">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Link
                                href={`/dashboard/property/${app.id}`}
                                className="text-cyan-600 hover:text-cyan-700 font-medium"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-500 mt-4">
                    {inactiveApps.length} properties need attention
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Worker Report Tab */}
        {activeTab === "worker" && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Worker Activity Report
            </h2>

            {/* Worker Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Worker
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 min-w-[200px]"
              >
                <option value="">-- Select a worker --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedWorker ? (
              (() => {
                const workerName = workers.find((w) => w.id === selectedWorker)?.full_name || "Unknown";

                // Filter visits by worker and date range
                let workerVisits = fieldVisits.filter((v) => v.staff_member === selectedWorker);

                if (startDate) {
                  workerVisits = workerVisits.filter((v) => v.visit_date.substring(0, 10) >= startDate);
                }
                if (endDate) {
                  workerVisits = workerVisits.filter((v) => v.visit_date.substring(0, 10) <= endDate);
                }

                const attempts = workerVisits.filter((v) => v.visit_outcome === "attempt");
                const engagements = workerVisits.filter((v) => v.visit_outcome === "engagement");
                const engagementRate = workerVisits.length > 0
                  ? Math.round((engagements.length / workerVisits.length) * 100)
                  : 0;

                // Get unique properties visited
                const uniqueProperties = new Set(workerVisits.map((v) => v.applicant_id).filter(Boolean));

                return (
                  <div>
                    {/* Worker Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{workerVisits.length}</p>
                        <p className="text-sm text-gray-600">Total Visits</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{attempts.length}</p>
                        <p className="text-sm text-amber-700">Attempts</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{engagements.length}</p>
                        <p className="text-sm text-green-700">Engagements</p>
                      </div>
                      <div className="bg-cyan-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-cyan-600">{engagementRate}%</p>
                        <p className="text-sm text-cyan-700">Engagement Rate</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{uniqueProperties.size}</p>
                        <p className="text-sm text-purple-700">Properties</p>
                      </div>
                    </div>

                    {/* Visit List */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Visit History for {workerName}
                      {(startDate || endDate) && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({startDate || "All"} to {endDate || "Now"})
                        </span>
                      )}
                    </h3>

                    {workerVisits.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No visits found for selected criteria</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {workerVisits.slice(0, 50).map((visit) => (
                              <tr key={visit.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {formatShortDate(visit.visit_date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {visit.location_address}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {visitTypeLabels[visit.visit_type] || visit.visit_type}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {visit.visit_outcome && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      visit.visit_outcome === "attempt"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-green-100 text-green-800"
                                    }`}>
                                      {visit.visit_outcome === "attempt" ? "Attempt" : "Engagement"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                  {visit.general_notes || visit.property_condition_notes || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {workerVisits.length > 50 && (
                          <p className="text-sm text-gray-500 mt-2">Showing first 50 of {workerVisits.length} visits</p>
                        )}
                      </div>
                    )}

                    {/* Export Worker Data */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => {
                          const data = workerVisits.map((v) => ({
                            "Date": v.visit_date.substring(0, 10),
                            "Address": v.location_address,
                            "Type": v.visit_type,
                            "Outcome": v.visit_outcome || "",
                            "Contact": v.contact_name || "",
                            "Property Condition": v.property_condition_notes || "",
                            "Occupant Situation": v.occupant_situation || "",
                            "Immediate Needs": v.immediate_needs || "",
                            "Notes": v.general_notes || "",
                            "Follow-up": v.requires_follow_up ? "Yes" : "No",
                          }));

                          if (data.length === 0) {
                            alert("No data to export");
                            return;
                          }

                          const headers = Object.keys(data[0]);
                          const csvContent = [
                            headers.join(","),
                            ...data.map((row) =>
                              headers.map((h) => `"${String(row[h as keyof typeof row] || "").replace(/"/g, '""')}"`).join(",")
                            ),
                          ].join("\n");

                          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                          const link = document.createElement("a");
                          link.href = URL.createObjectURL(blob);
                          link.download = `${workerName.replace(/\s+/g, "_")}_visits_${new Date().toISOString().substring(0, 10)}.csv`;
                          link.click();
                        }}
                        className="btn-primary"
                      >
                        Export Worker Report (CSV)
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p>Select a worker above to view their activity report</p>
              </div>
            )}
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
