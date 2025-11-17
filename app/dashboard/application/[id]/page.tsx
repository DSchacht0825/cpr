"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AddNoteModal from "@/components/modals/AddNoteModal";
import UpdateStatusModal from "@/components/modals/UpdateStatusModal";

interface Application {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  phone_number: string;
  email: string;
  primary_language: string;
  preferred_contact_method?: string;
  property_address: string;
  property_city?: string;
  property_county: string;
  property_zip: string;
  property_type: string;
  property_type_other?: string;
  name_on_title: string;
  occupant_type: string;
  is_hoa?: boolean;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  cannot_afford_mortgage: boolean;
  facing_eviction: boolean;
  poor_property_condition: boolean;
  wants_to_remain: boolean;
  needs_relocation_funds: boolean;
  title_holder_deceased: boolean;
  tenant_owner_deceased: boolean;
  needs_probate_info: boolean;
  needs_legal_assistance: boolean;
  has_auction_date: boolean;
  other_issues?: string;
  auction_date?: string;
  trustee_name?: string;
  appointment_type?: string;
  availability?: string[];
  comments?: string;
  status: string;
  assigned_to?: string;
  source?: string;
}

interface CaseEvent {
  id: string;
  created_at: string;
  event_type: string;
  event_date: string;
  title: string;
  description?: string;
  contact_method?: string;
  outcome?: string;
  next_steps?: string;
  is_milestone: boolean;
  is_urgent: boolean;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApplication();
  }, [params.id]);

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/applications/${params.id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch application");
      }

      setApplication(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Application</h2>
          <p className="text-gray-600 mb-4">{error || "Application not found"}</p>
          <Link href="/dashboard" className="btn-primary inline-block">
            Back to Dashboard
          </Link>
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
                <h1 className="text-xl font-bold text-gray-900">Application Details</h1>
                <p className="text-sm text-gray-600">Community Property Rescue</p>
              </div>
            </div>
            <Link href="/dashboard" className="text-cyan-600 hover:text-cyan-700 font-medium">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{application.full_name}</h2>
              <p className="text-gray-600">{application.property_address}</p>
              <p className="text-sm text-gray-500">
                {application.property_city && `${application.property_city}, `}
                {application.property_county} County, {application.property_zip}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`px-4 py-2 text-sm font-medium rounded-full border ${getStatusBadgeColor(
                  application.status
                )}`}
              >
                {application.status}
              </span>
              <p className="text-sm text-gray-500 mt-2">
                Submitted: {formatDate(application.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="card">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-gray-900">
                    <a href={`tel:${application.phone_number}`} className="text-cyan-600 hover:underline">
                      {application.phone_number}
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">
                    <a href={`mailto:${application.email}`} className="text-cyan-600 hover:underline">
                      {application.email}
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Primary Language</p>
                  <p className="text-gray-900">{application.primary_language}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Preferred Contact</p>
                  <p className="text-gray-900">{application.preferred_contact_method || "Not specified"}</p>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="card">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Property Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Property Type</p>
                  <p className="text-gray-900">
                    {application.property_type}
                    {application.property_type_other && ` - ${application.property_type_other}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">HOA</p>
                  <p className="text-gray-900">
                    {application.is_hoa === true ? "Yes" : application.is_hoa === false ? "No" : "Unsure"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Name on Title</p>
                  <p className="text-gray-900">{application.name_on_title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Occupant Type</p>
                  <p className="text-gray-900">{application.occupant_type}</p>
                </div>
              </div>
            </div>

            {/* Crisis Indicators */}
            <div className="card">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Situation & Crisis Indicators</h3>
              <div className="space-y-2">
                {application.has_notice_of_default && (
                  <div className="flex items-center space-x-2 text-orange-700 bg-orange-50 p-2 rounded">
                    <span>⚠️</span>
                    <span>Notice of Default (NOD) received</span>
                  </div>
                )}
                {application.has_notice_of_trustee_sale && (
                  <div className="flex items-center space-x-2 text-red-700 bg-red-50 p-2 rounded">
                    <span>🚨</span>
                    <span>Notice of Trustee Sale (NTS) received</span>
                  </div>
                )}
                {application.cannot_afford_mortgage && (
                  <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded">
                    <span>💰</span>
                    <span>Cannot afford mortgage payment</span>
                  </div>
                )}
                {application.facing_eviction && (
                  <div className="flex items-center space-x-2 text-red-700 bg-red-50 p-2 rounded">
                    <span>🏠</span>
                    <span>Facing eviction</span>
                  </div>
                )}
                {application.poor_property_condition && (
                  <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded">
                    <span>🔧</span>
                    <span>Property in poor condition</span>
                  </div>
                )}
                {application.wants_to_remain && (
                  <div className="flex items-center space-x-2 text-blue-700 bg-blue-50 p-2 rounded">
                    <span>🏡</span>
                    <span>Wants to remain in property</span>
                  </div>
                )}
                {application.needs_relocation_funds && (
                  <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded">
                    <span>📦</span>
                    <span>Needs relocation funds</span>
                  </div>
                )}
                {application.title_holder_deceased && (
                  <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded">
                    <span>⚰️</span>
                    <span>Title holder deceased</span>
                  </div>
                )}
                {application.tenant_owner_deceased && (
                  <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded">
                    <span>⚰️</span>
                    <span>Homeowner deceased (tenant situation)</span>
                  </div>
                )}
                {application.needs_probate_info && (
                  <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded">
                    <span>⚖️</span>
                    <span>Needs probate information</span>
                  </div>
                )}
                {application.needs_legal_assistance && (
                  <div className="flex items-center space-x-2 text-blue-700 bg-blue-50 p-2 rounded">
                    <span>👨‍⚖️</span>
                    <span>Interested in legal assistance</span>
                  </div>
                )}
                {application.has_auction_date && (
                  <div className="flex items-center space-x-2 text-red-700 bg-red-50 p-2 rounded">
                    <span>📅</span>
                    <span>Auction date scheduled - URGENT</span>
                  </div>
                )}
                {application.other_issues && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Other Issues</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{application.other_issues}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Comments */}
            {application.comments && (
              <div className="card">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Comments</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{application.comments}</p>
              </div>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Urgency Information */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Urgency Information</h3>
              <div className="space-y-3">
                {application.auction_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Auction Date</p>
                    <p className="text-red-600 font-bold text-lg">
                      {new Date(application.auction_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {application.trustee_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Trustee Name</p>
                    <p className="text-gray-900">{application.trustee_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Scheduling</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Appointment Type</p>
                  <p className="text-gray-900">{application.appointment_type || "Not specified"}</p>
                </div>
                {application.availability && application.availability.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Availability</p>
                    <div className="space-y-1">
                      {application.availability.map((time) => (
                        <span
                          key={time}
                          className="inline-block bg-cyan-50 text-cyan-700 px-2 py-1 rounded text-sm mr-2 mb-1"
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Application Metadata</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-500">Source</p>
                  <p className="text-gray-900">{application.source || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="text-gray-900">{formatDate(application.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Updated</p>
                  <p className="text-gray-900">{formatDate(application.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="btn-primary w-full">Update Status</button>
                <button className="btn-secondary w-full">Add Note</button>
                <button className="btn-secondary w-full">Schedule Call</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
