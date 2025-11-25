"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Applicant {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  status: string;
  created_at: string;
  has_auction_date: boolean;
  auction_date?: string;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  assigned_to?: string;
  source?: string;
}

interface Worker {
  id: string;
  full_name: string;
  email: string;
}

interface Visit {
  id: string;
  visit_date: string;
  visit_type: string;
  visit_outcome?: string;
  location_address: string;
  contact_name?: string;
  property_condition_notes?: string;
  occupant_situation?: string;
  immediate_needs?: string;
  general_notes?: string;
  requires_follow_up: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  latitude?: number;
  longitude?: number;
  staff_member: string;
  worker?: Worker;
}

interface PropertyData {
  applicant: Applicant;
  visits: Visit[];
  visitCount: number;
  attemptCount: number;
  engagementCount: number;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const [data, setData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchPropertyData(params.id as string);
    }
  }, [params.id]);

  const fetchPropertyData = async (id: string) => {
    try {
      const response = await fetch(`/api/applicants/${id}/visits`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch property data");
      }

      setData(result);
    } catch (err) {
      console.error("Error fetching property data:", err);
      setError(err instanceof Error ? err.message : "Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const visitTypeLabels: Record<string, string> = {
    "initial-contact": "Initial Contact",
    "follow-up": "Follow Up",
    "property-inspection": "Property Inspection",
    "document-collection": "Document Collection",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-blue-100 text-blue-800",
    closed: "bg-gray-100 text-gray-800",
    approved: "bg-green-100 text-green-800",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Property not found"}</p>
          <Link href="/dashboard" className="text-cyan-600 hover:text-cyan-700">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { applicant, visits, visitCount, attemptCount, engagementCount } = data;

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
                <h1 className="text-xl font-bold text-gray-900">Property Details</h1>
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
        {/* Property Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{applicant.full_name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[applicant.status] || 'bg-gray-100 text-gray-800'}`}>
                  {applicant.status}
                </span>
              </div>
              <p className="text-lg text-gray-700">{applicant.property_address}</p>
              <p className="text-gray-600">
                {applicant.property_city}, {applicant.property_county} {applicant.property_zip}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <a href={`tel:${applicant.phone_number}`} className="text-cyan-600 hover:text-cyan-700">
                  {applicant.phone_number}
                </a>
                <a href={`mailto:${applicant.email}`} className="text-cyan-600 hover:text-cyan-700">
                  {applicant.email}
                </a>
              </div>
              {applicant.auction_date && (
                <p className="mt-2 text-red-600 font-medium">
                  Auction Date: {formatDate(applicant.auction_date)}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Application submitted: {formatDate(applicant.created_at)}
                {applicant.source === 'field_intake' && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    Field Intake
                  </span>
                )}
              </p>
            </div>

            {/* Visit Stats */}
            <div className="flex gap-4">
              <div className="text-center px-4 py-3 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{visitCount}</p>
                <p className="text-sm text-gray-600">Total Visits</p>
              </div>
              <div className="text-center px-4 py-3 bg-amber-50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">{attemptCount}</p>
                <p className="text-sm text-amber-700">Attempts</p>
              </div>
              <div className="text-center px-4 py-3 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{engagementCount}</p>
                <p className="text-sm text-green-700">Engagements</p>
              </div>
            </div>
          </div>

          {/* Crisis Indicators */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Crisis Indicators:</p>
            <div className="flex flex-wrap gap-2">
              {applicant.has_notice_of_default && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Notice of Default</span>
              )}
              {applicant.has_notice_of_trustee_sale && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Notice of Trustee Sale</span>
              )}
              {applicant.has_auction_date && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Auction Scheduled</span>
              )}
              {!applicant.has_notice_of_default && !applicant.has_notice_of_trustee_sale && !applicant.has_auction_date && (
                <span className="text-gray-500 text-sm">None indicated</span>
              )}
            </div>
          </div>
        </div>

        {/* Visit History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Visit History</h3>

          {visits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No visits recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className={`border rounded-lg p-4 ${
                    visit.visit_outcome === 'attempt'
                      ? 'border-amber-200 bg-amber-50'
                      : visit.visit_outcome === 'engagement'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {visitTypeLabels[visit.visit_type] || visit.visit_type}
                        </span>
                        {visit.visit_outcome && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            visit.visit_outcome === 'attempt'
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-green-200 text-green-800'
                          }`}>
                            {visit.visit_outcome === 'attempt' ? 'Attempt' : 'Engagement'}
                          </span>
                        )}
                        {visit.requires_follow_up && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            Follow-up needed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(visit.visit_date)}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">Worker:</span>{" "}
                        {visit.worker?.full_name || "Unknown"}
                      </p>
                    </div>
                    {visit.latitude && visit.longitude && (
                      <div className="text-xs text-gray-500">
                        GPS: {visit.latitude.toFixed(4)}, {visit.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>

                  {/* Visit Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
                    {visit.contact_name && (
                      <p><span className="font-medium text-gray-700">Contact:</span> {visit.contact_name}</p>
                    )}
                    {visit.property_condition_notes && (
                      <p><span className="font-medium text-gray-700">Property Condition:</span> {visit.property_condition_notes}</p>
                    )}
                    {visit.occupant_situation && (
                      <p><span className="font-medium text-gray-700">Occupant Situation:</span> {visit.occupant_situation}</p>
                    )}
                    {visit.immediate_needs && (
                      <p><span className="font-medium text-gray-700">Immediate Needs:</span> {visit.immediate_needs}</p>
                    )}
                    {visit.general_notes && (
                      <p><span className="font-medium text-gray-700">Notes:</span> {visit.general_notes}</p>
                    )}
                    {visit.follow_up_date && (
                      <p className="text-purple-700">
                        <span className="font-medium">Follow-up scheduled:</span> {formatDate(visit.follow_up_date)}
                        {visit.follow_up_notes && ` - ${visit.follow_up_notes}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
