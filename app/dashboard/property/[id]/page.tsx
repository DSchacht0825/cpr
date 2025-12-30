"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { jsPDF } from "jspdf";

interface Applicant {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  primary_language?: string;
  preferred_contact_method?: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  property_type?: string;
  property_type_other?: string;
  name_on_title?: string;
  occupant_type?: string;
  is_hoa?: boolean | null;
  status: string;
  created_at: string;
  has_auction_date: boolean;
  auction_date?: string;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  cannot_afford_mortgage?: boolean;
  facing_eviction?: boolean;
  poor_property_condition?: boolean;
  wants_to_remain?: boolean;
  needs_relocation_funds?: boolean;
  title_holder_deceased?: boolean;
  tenant_owner_deceased?: boolean;
  needs_probate_info?: boolean;
  needs_legal_assistance?: boolean;
  other_issues?: string;
  trustee_name?: string;
  appointment_type?: string;
  availability?: string[];
  comments?: string;
  assigned_to?: string;
  source?: string;
  submitted_by_worker?: string;
  intake_latitude?: number;
  intake_longitude?: number;
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

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  created_at: string;
}

interface PropertyData {
  applicant: Applicant;
  visits: Visit[];
  visitCount: number;
  attemptCount: number;
  engagementCount: number;
}

interface PendingUpload {
  file: File;
  documentType: string;
  preview?: string;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullApplication, setShowFullApplication] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Document upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Auction date edit state
  const [editingAuctionDate, setEditingAuctionDate] = useState(false);
  const [auctionDateValue, setAuctionDateValue] = useState("");
  const [savingAuctionDate, setSavingAuctionDate] = useState(false);

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
    if (params.id) {
      fetchPropertyData(params.id as string);
      fetchDocuments(params.id as string);
    }
  }, [params.id, router]);

  const fetchDocuments = async (id: string) => {
    setLoadingDocs(true);
    try {
      const response = await fetch(`/api/applications/documents?applicationId=${id}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setDocuments(result.data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

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
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
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

  const documentTypeLabels: Record<string, string> = {
    government_id: "Government ID",
    proof_of_income: "Proof of Income",
    mortgage_statement: "Mortgage Statement",
    notice_of_default: "Notice of Default",
    notice_of_trustee_sale: "Notice of Trustee Sale",
    property_tax_bill: "Property Tax Bill",
    utility_bill: "Utility Bill",
    bank_statement: "Bank Statement",
    grant_deed: "Grant Deed / Title",
    other: "Other Document",
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleEditAuctionDate = () => {
    setAuctionDateValue(data?.applicant.auction_date || "");
    setEditingAuctionDate(true);
  };

  const handleSaveAuctionDate = async () => {
    if (!params.id) return;

    setSavingAuctionDate(true);
    try {
      const updateData = auctionDateValue
        ? { auction_date: auctionDateValue, has_auction_date: true }
        : { auction_date: null, has_auction_date: false };

      const response = await fetch(`/api/applications/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update auction date");
      }

      // Update local state
      if (data) {
        setData({
          ...data,
          applicant: {
            ...data.applicant,
            auction_date: auctionDateValue || undefined,
            has_auction_date: !!auctionDateValue,
          },
        });
      }
      setEditingAuctionDate(false);
    } catch (err) {
      console.error("Error updating auction date:", err);
      alert("Failed to update auction date. Please try again.");
    } finally {
      setSavingAuctionDate(false);
    }
  };

  const handleCancelAuctionEdit = () => {
    setEditingAuctionDate(false);
    setAuctionDateValue("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUploads: PendingUpload[] = [];
    Array.from(files).forEach((file) => {
      const upload: PendingUpload = {
        file,
        documentType: "other",
      };
      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPendingUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, preview: e.target?.result as string } : u
            )
          );
        };
        reader.readAsDataURL(file);
      }
      newUploads.push(upload);
    });

    setPendingUploads((prev) => [...prev, ...newUploads]);
    e.target.value = ""; // Reset input
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;

    const newUploads: PendingUpload[] = [];
    Array.from(files).forEach((file) => {
      // Only accept images and PDFs
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        return;
      }
      const upload: PendingUpload = {
        file,
        documentType: "other",
      };
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPendingUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, preview: e.target?.result as string } : u
            )
          );
        };
        reader.readAsDataURL(file);
      }
      newUploads.push(upload);
    });

    setPendingUploads((prev) => [...prev, ...newUploads]);
  };

  const updateDocumentType = (index: number, type: string) => {
    setPendingUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, documentType: type } : u))
    );
  };

  const removePendingUpload = (index: number) => {
    setPendingUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadDocuments = async () => {
    if (pendingUploads.length === 0 || !params.id) return;

    setUploadingDoc(true);
    setUploadError("");

    try {
      for (const upload of pendingUploads) {
        const formData = new FormData();
        formData.append("file", upload.file);
        formData.append("applicationId", params.id as string);
        formData.append("document_type", upload.documentType);

        const response = await fetch("/api/applications/documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to upload document");
        }
      }

      // Refresh documents list
      await fetchDocuments(params.id as string);
      setPendingUploads([]);
      setShowUploadForm(false);
    } catch (err) {
      console.error("Error uploading documents:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload documents");
    } finally {
      setUploadingDoc(false);
    }
  };

  const downloadApplication = () => {
    if (!data) return;
    const { applicant } = data;

    const doc = new jsPDF();
    let y = 20;
    const leftMargin = 20;
    const rightCol = 85;
    const pageWidth = 190;
    const lineHeight = 7;

    // Helper functions
    const addTitle = (text: string) => {
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(8, 145, 178); // Cyan color
      doc.text(text, pageWidth / 2 + 10, y, { align: "center" });
      y += 10;
    };

    const addSubtitle = (text: string) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(text, pageWidth / 2 + 10, y, { align: "center" });
      y += 8;
    };

    const addSectionHeader = (text: string) => {
      if (y > 260) { doc.addPage(); y = 20; }
      y += 5;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(text, leftMargin, y);
      y += 2;
      doc.setDrawColor(8, 145, 178);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, y, pageWidth, y);
      y += 8;
    };

    const addField = (label: string, value: string, isHighlight = false) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(label + ":", leftMargin, y);
      doc.setFont("helvetica", isHighlight ? "bold" : "normal");
      if (isHighlight) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(31, 41, 55);
      }
      const lines = doc.splitTextToSize(value, pageWidth - rightCol);
      doc.text(lines, rightCol, y);
      y += Math.max(lineHeight, lines.length * 5);
    };

    const addCheckbox = (label: string, checked: boolean) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (checked) {
        doc.setTextColor(220, 38, 38);
        doc.text("■ " + label, leftMargin, y);
      } else {
        doc.setTextColor(156, 163, 175);
        doc.text("□ " + label, leftMargin, y);
      }
      y += lineHeight;
    };

    // Header
    addTitle("COMMUNITY PROPERTY RESCUE");
    addSubtitle("Application for Assistance");
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageWidth / 2 + 10, y, { align: "center" });
    y += 10;

    // Personal Information
    addSectionHeader("PERSONAL INFORMATION");
    addField("Full Name", applicant.full_name);
    addField("Phone Number", applicant.phone_number);
    addField("Email", applicant.email);
    addField("Primary Language", applicant.primary_language || "Not specified");
    addField("Preferred Contact", applicant.preferred_contact_method || "Not specified");

    // Property Information
    addSectionHeader("PROPERTY INFORMATION");
    addField("Property Address", applicant.property_address);
    addField("City", applicant.property_city || "Not specified");
    addField("County", applicant.property_county);
    addField("ZIP Code", applicant.property_zip);
    addField("Property Type", (applicant.property_type || "Not specified") + (applicant.property_type_other ? ` (${applicant.property_type_other})` : ""));

    // Title & Ownership
    addSectionHeader("TITLE & OWNERSHIP");
    addField("Name on Title", applicant.name_on_title || "Not specified");
    addField("Occupant Type", applicant.occupant_type || "Not specified");
    addField("Part of HOA", applicant.is_hoa === true ? "Yes" : applicant.is_hoa === false ? "No" : "Not specified");

    // Crisis Indicators
    addSectionHeader("CRISIS INDICATORS");
    const col1X = leftMargin;
    const col2X = leftMargin + 60;
    const col3X = leftMargin + 120;
    const startY = y;

    doc.setFontSize(9);
    // Column 1
    y = startY;
    if (applicant.has_notice_of_default) { doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.has_notice_of_default ? "■" : "□") + " Notice of Default", col1X, y); y += lineHeight;
    if (applicant.has_notice_of_trustee_sale) { doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.has_notice_of_trustee_sale ? "■" : "□") + " Notice of Trustee Sale", col1X, y); y += lineHeight;
    if (applicant.cannot_afford_mortgage) { doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.cannot_afford_mortgage ? "■" : "□") + " Cannot Afford Mortgage", col1X, y); y += lineHeight;
    if (applicant.facing_eviction) { doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.facing_eviction ? "■" : "□") + " Facing Eviction", col1X, y);

    // Column 2
    y = startY;
    if (applicant.poor_property_condition) { doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.poor_property_condition ? "■" : "□") + " Poor Condition", col2X, y); y += lineHeight;
    if (applicant.wants_to_remain) { doc.setTextColor(34, 197, 94); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.wants_to_remain ? "■" : "□") + " Wants to Remain", col2X, y); y += lineHeight;
    if (applicant.needs_relocation_funds) { doc.setTextColor(245, 158, 11); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.needs_relocation_funds ? "■" : "□") + " Needs Relocation $", col2X, y); y += lineHeight;
    if (applicant.title_holder_deceased) { doc.setTextColor(147, 51, 234); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.title_holder_deceased ? "■" : "□") + " Title Holder Deceased", col2X, y);

    // Column 3
    y = startY;
    if (applicant.tenant_owner_deceased) { doc.setTextColor(147, 51, 234); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.tenant_owner_deceased ? "■" : "□") + " Tenant Owner Deceased", col3X, y); y += lineHeight;
    if (applicant.needs_probate_info) { doc.setTextColor(59, 130, 246); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.needs_probate_info ? "■" : "□") + " Needs Probate Info", col3X, y); y += lineHeight;
    if (applicant.needs_legal_assistance) { doc.setTextColor(59, 130, 246); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.needs_legal_assistance ? "■" : "□") + " Needs Legal Help", col3X, y); y += lineHeight;
    if (applicant.has_auction_date) { doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(156, 163, 175); doc.setFont("helvetica", "normal"); }
    doc.text((applicant.has_auction_date ? "■" : "□") + " Has Auction Date", col3X, y);

    y = startY + (lineHeight * 4) + 5;

    if (applicant.other_issues) {
      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.text("Other Issues:", leftMargin, y);
      y += lineHeight;
      doc.setTextColor(31, 41, 55);
      const otherLines = doc.splitTextToSize(applicant.other_issues, pageWidth - leftMargin);
      doc.text(otherLines, leftMargin, y);
      y += otherLines.length * 5 + 3;
    }

    // Urgency & Scheduling
    addSectionHeader("URGENCY & SCHEDULING");
    addField("Auction Date", applicant.auction_date ? formatDate(applicant.auction_date) : "Not scheduled", !!applicant.auction_date);
    addField("Trustee Name", applicant.trustee_name || "Not specified");
    addField("Appointment Type", applicant.appointment_type || "Not specified");
    addField("Availability", applicant.availability?.join(", ") || "Not specified");

    // Comments
    if (applicant.comments) {
      addSectionHeader("ADDITIONAL COMMENTS");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      const commentLines = doc.splitTextToSize(applicant.comments, pageWidth - leftMargin);
      if (y + commentLines.length * 5 > 270) { doc.addPage(); y = 20; }
      doc.text(commentLines, leftMargin, y);
      y += commentLines.length * 5 + 5;
    }

    // Metadata
    addSectionHeader("APPLICATION METADATA");
    addField("Application ID", applicant.id);
    addField("Submitted", formatDateTime(applicant.created_at));
    addField("Source", applicant.source === "field_intake" ? "Field Intake" : "Online Application");
    addField("Status", applicant.status);
    if (applicant.source === "field_intake" && applicant.intake_latitude) {
      addField("GPS Coordinates", `${applicant.intake_latitude}, ${applicant.intake_longitude}`);
    }

    // Footer
    y = 280;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(8, 145, 178);
    doc.text("Community Property Rescue - Restoring Hope & Dignity in Your Housing Crisis", pageWidth / 2 + 10, y, { align: "center" });

    // Save
    doc.save(`CPR_Application_${applicant.full_name.replace(/\s+/g, "_")}_${formatDate(applicant.created_at).replace(/[,\s]+/g, "_")}.pdf`);
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
        {/* Header with Download Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{applicant.full_name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[applicant.status] || 'bg-gray-100 text-gray-800'}`}>
                  {applicant.status}
                </span>
                {applicant.source === 'field_intake' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    Field Intake
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Application submitted: {formatDateTime(applicant.created_at)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFullApplication(!showFullApplication)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showFullApplication ? 'Hide Details' : 'Show Full Application'}
              </button>
              <button
                onClick={downloadApplication}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          {/* Visit Stats */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
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

        {/* Full Application Details */}
        {showFullApplication && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Complete Application</h3>

            {/* Personal Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Personal Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-gray-900 font-medium">{applicant.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <a href={`tel:${applicant.phone_number}`} className="text-cyan-600 hover:text-cyan-700 font-medium">{applicant.phone_number}</a>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${applicant.email}`} className="text-cyan-600 hover:text-cyan-700 font-medium">{applicant.email}</a>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Primary Language</p>
                  <p className="text-gray-900">{applicant.primary_language || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Preferred Contact Method</p>
                  <p className="text-gray-900">{applicant.preferred_contact_method || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Property Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Property Address</p>
                  <p className="text-gray-900 font-medium">{applicant.property_address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="text-gray-900">{applicant.property_city || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">County</p>
                  <p className="text-gray-900">{applicant.property_county}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ZIP Code</p>
                  <p className="text-gray-900">{applicant.property_zip}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Property Type</p>
                  <p className="text-gray-900">{applicant.property_type || 'Not specified'}{applicant.property_type_other && ` (${applicant.property_type_other})`}</p>
                </div>
              </div>
            </div>

            {/* Title & Ownership */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Title & Ownership</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name on Title</p>
                  <p className="text-gray-900">{applicant.name_on_title || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Occupant Type</p>
                  <p className="text-gray-900">{applicant.occupant_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Part of HOA</p>
                  <p className="text-gray-900">{applicant.is_hoa === true ? 'Yes' : applicant.is_hoa === false ? 'No' : 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Crisis Indicators */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Crisis Indicators</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg ${applicant.has_notice_of_default ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.has_notice_of_default ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.has_notice_of_default ? '✓' : '○'} Notice of Default
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.has_notice_of_trustee_sale ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.has_notice_of_trustee_sale ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.has_notice_of_trustee_sale ? '✓' : '○'} Notice of Trustee Sale
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.cannot_afford_mortgage ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.cannot_afford_mortgage ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.cannot_afford_mortgage ? '✓' : '○'} Cannot Afford Mortgage
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.facing_eviction ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.facing_eviction ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.facing_eviction ? '✓' : '○'} Facing Eviction
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.poor_property_condition ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.poor_property_condition ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.poor_property_condition ? '✓' : '○'} Poor Property Condition
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.wants_to_remain ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.wants_to_remain ? 'text-green-700' : 'text-gray-600'}`}>
                    {applicant.wants_to_remain ? '✓' : '○'} Wants to Remain in Home
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.needs_relocation_funds ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.needs_relocation_funds ? 'text-amber-700' : 'text-gray-600'}`}>
                    {applicant.needs_relocation_funds ? '✓' : '○'} Needs Relocation Funds
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.title_holder_deceased ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.title_holder_deceased ? 'text-purple-700' : 'text-gray-600'}`}>
                    {applicant.title_holder_deceased ? '✓' : '○'} Title Holder Deceased
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.tenant_owner_deceased ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.tenant_owner_deceased ? 'text-purple-700' : 'text-gray-600'}`}>
                    {applicant.tenant_owner_deceased ? '✓' : '○'} Tenant Owner Deceased
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.needs_probate_info ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.needs_probate_info ? 'text-blue-700' : 'text-gray-600'}`}>
                    {applicant.needs_probate_info ? '✓' : '○'} Needs Probate Info
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.needs_legal_assistance ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.needs_legal_assistance ? 'text-blue-700' : 'text-gray-600'}`}>
                    {applicant.needs_legal_assistance ? '✓' : '○'} Needs Legal Assistance
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.has_auction_date ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.has_auction_date ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.has_auction_date ? '✓' : '○'} Has Auction Date
                  </p>
                </div>
              </div>
              {applicant.other_issues && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Other Issues</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{applicant.other_issues}</p>
                </div>
              )}
            </div>

            {/* Urgency & Scheduling */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Urgency & Scheduling</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Auction Date</p>
                  {editingAuctionDate ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="date"
                        value={auctionDateValue}
                        onChange={(e) => setAuctionDateValue(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSaveAuctionDate}
                        disabled={savingAuctionDate}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {savingAuctionDate ? "..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancelAuctionEdit}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      {auctionDateValue && (
                        <button
                          onClick={() => setAuctionDateValue("")}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${applicant.auction_date ? 'text-red-600' : 'text-gray-900'}`}>
                        {applicant.auction_date ? formatDate(applicant.auction_date) : 'Not scheduled'}
                      </p>
                      <button
                        onClick={handleEditAuctionDate}
                        className="p-1 text-gray-400 hover:text-cyan-600 transition-colors"
                        title="Edit auction date"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trustee Name</p>
                  <p className="text-gray-900">{applicant.trustee_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Appointment Type</p>
                  <p className="text-gray-900">{applicant.appointment_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Availability</p>
                  <p className="text-gray-900">{applicant.availability?.join(', ') || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Additional Comments */}
            {applicant.comments && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Additional Comments</h4>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{applicant.comments}</p>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Application Metadata</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Application ID</p>
                  <p className="text-gray-700 font-mono">{applicant.id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Source</p>
                  <p className="text-gray-700">{applicant.source === 'field_intake' ? 'Field Intake' : 'Online Application'}</p>
                </div>
                {applicant.source === 'field_intake' && applicant.intake_latitude && (
                  <div>
                    <p className="text-gray-500">GPS Coordinates</p>
                    <p className="text-gray-700">{applicant.intake_latitude}, {applicant.intake_longitude}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Supporting Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Supporting Documents
              {documents.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({documents.length} document{documents.length > 1 ? "s" : ""})
                </span>
              )}
            </h3>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Document
            </button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Upload Supporting Documents</h4>

              {/* Drag and Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-cyan-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  Drag and drop files here, or <span className="text-cyan-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Accepts images (JPG, PNG) and PDF files</p>
              </div>

              {/* Pending Uploads List */}
              {pendingUploads.length > 0 && (
                <div className="mt-4 space-y-3">
                  {pendingUploads.map((upload, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      {/* Preview */}
                      <div className="flex-shrink-0">
                        {upload.preview ? (
                          <img src={upload.preview} alt="" className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{upload.file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(upload.file.size)}</p>
                      </div>

                      {/* Document Type Selector */}
                      <select
                        value={upload.documentType}
                        onChange={(e) => updateDocumentType(index, e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value="government_id">Government ID</option>
                        <option value="proof_of_income">Proof of Income</option>
                        <option value="mortgage_statement">Mortgage Statement</option>
                        <option value="notice_of_default">Notice of Default</option>
                        <option value="notice_of_trustee_sale">Notice of Trustee Sale</option>
                        <option value="property_tax_bill">Property Tax Bill</option>
                        <option value="utility_bill">Utility Bill</option>
                        <option value="bank_statement">Bank Statement</option>
                        <option value="grant_deed">Grant Deed / Title</option>
                        <option value="other">Other Document</option>
                      </select>

                      {/* Remove Button */}
                      <button
                        onClick={() => removePendingUpload(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {uploadError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setPendingUploads([]);
                    setUploadError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadDocuments}
                  disabled={pendingUploads.length === 0 || uploadingDoc}
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadingDoc ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload {pendingUploads.length > 0 ? `(${pendingUploads.length})` : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {loadingDocs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 text-sm">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {doc.mime_type?.startsWith("image/") ? (
                        <img
                          src={doc.file_url}
                          alt={doc.file_name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                      </p>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
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
