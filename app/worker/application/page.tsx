"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface WorkerSession {
  user: { id: string; email: string };
  profile: { full_name: string; role?: string };
  session: { access_token: string };
}

interface DocumentUpload {
  id: string;
  file: File;
  preview: string;
  document_type: string;
  name: string;
}

interface FormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  primaryLanguage: string;
  preferredContactMethod: string;
  propertyAddress: string;
  propertyCity: string;
  propertyCounty: string;
  propertyZip: string;
  propertyType: string;
  propertyTypeOther: string;
  nameOnTitle: string;
  occupantType: string;
  isHOA: string;
  hasNoticeOfDefault: boolean;
  hasNoticeOfTrusteeSale: boolean;
  cannotAffordMortgage: boolean;
  facingEviction: boolean;
  poorPropertyCondition: boolean;
  wantsToRemain: boolean;
  needsRelocationFunds: boolean;
  titleHolderDeceased: boolean;
  tenantOwnerDeceased: boolean;
  needsProbateInfo: boolean;
  needsLegalAssistance: boolean;
  hasAuctionDate: boolean;
  otherIssues: string;
  auctionDate: string;
  trusteeName: string;
  appointmentType: string;
  availability: string[];
  comments: string;
}

const DOCUMENT_TYPES = [
  { value: "government_id", label: "Government ID" },
  { value: "proof_of_income", label: "Proof of Income" },
  { value: "mortgage_statement", label: "Mortgage Statement" },
  { value: "notice_of_default", label: "Notice of Default" },
  { value: "notice_of_trustee_sale", label: "Notice of Trustee Sale" },
  { value: "property_tax_bill", label: "Property Tax Bill" },
  { value: "utility_bill", label: "Utility Bill" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "grant_deed", label: "Grant Deed / Title" },
  { value: "other", label: "Other Document" },
];

export default function WorkerApplicationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    }>
      <WorkerApplicationContent />
    </Suspense>
  );
}

function WorkerApplicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [createdApplicationId, setCreatedApplicationId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    phoneNumber: "",
    email: "",
    primaryLanguage: "English",
    preferredContactMethod: "phone",
    propertyAddress: "",
    propertyCity: "",
    propertyCounty: "",
    propertyZip: "",
    propertyType: "",
    propertyTypeOther: "",
    nameOnTitle: "",
    occupantType: "",
    isHOA: "",
    hasNoticeOfDefault: false,
    hasNoticeOfTrusteeSale: false,
    cannotAffordMortgage: false,
    facingEviction: false,
    poorPropertyCondition: false,
    wantsToRemain: false,
    needsRelocationFunds: false,
    titleHolderDeceased: false,
    tenantOwnerDeceased: false,
    needsProbateInfo: false,
    needsLegalAssistance: false,
    hasAuctionDate: false,
    otherIssues: "",
    auctionDate: "",
    trusteeName: "",
    appointmentType: "in-person",
    availability: ["anytime"],
    comments: "",
  });

  // Pre-fill from URL params
  useEffect(() => {
    const name = searchParams.get("name");
    const address = searchParams.get("address");
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");

    if (name || address || phone || email) {
      setFormData(prev => ({
        ...prev,
        fullName: name || prev.fullName,
        propertyAddress: address || prev.propertyAddress,
        phoneNumber: phone || prev.phoneNumber,
        email: email || prev.email,
        nameOnTitle: name || prev.nameOnTitle,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      getLocation();
      setLoading(false);
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDocumentCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newDoc: DocumentUpload = {
          id: Math.random().toString(36).substring(7),
          file,
          preview: reader.result as string,
          document_type: "other",
          name: file.name,
        };
        setDocuments((prev) => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateDocumentType = (id: string, docType: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, document_type: docType } : d))
    );
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const uploadDocument = async (doc: DocumentUpload, applicationId: string) => {
    const formData = new FormData();
    formData.append("file", doc.file);
    formData.append("applicationId", applicationId);
    formData.append("document_type", doc.document_type);

    const response = await fetch("/api/applications/documents", {
      method: "POST",
      body: formData,
    });

    return response.ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      // Create the application
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          submitted_by_worker: session.user.id,
          intake_type: "field",
          intake_latitude: location?.lat || null,
          intake_longitude: location?.lng || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit application");
      }

      const applicationId = result.data?.id;
      setCreatedApplicationId(applicationId);

      // Upload documents if any
      if (documents.length > 0 && applicationId) {
        await Promise.all(documents.map((doc) => uploadDocument(doc, applicationId)));
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <Link href="/worker/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">Application</h1>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Application Submitted!</h2>
            <p className="text-green-700 mb-2">
              The application for <strong>{formData.fullName}</strong> has been submitted successfully.
            </p>
            {documents.length > 0 && (
              <p className="text-green-600 mb-4">
                {documents.length} document{documents.length > 1 ? "s" : ""} uploaded.
              </p>
            )}
            <div className="space-y-3 mt-6">
              <Link
                href="/worker/dashboard"
                className="block w-full bg-cyan-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-cyan-700 text-center"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setDocuments([]);
                  setFormData({
                    fullName: "",
                    phoneNumber: "",
                    email: "",
                    primaryLanguage: "English",
                    preferredContactMethod: "phone",
                    propertyAddress: "",
                    propertyCity: "",
                    propertyCounty: "",
                    propertyZip: "",
                    propertyType: "",
                    propertyTypeOther: "",
                    nameOnTitle: "",
                    occupantType: "",
                    isHOA: "",
                    hasNoticeOfDefault: false,
                    hasNoticeOfTrusteeSale: false,
                    cannotAffordMortgage: false,
                    facingEviction: false,
                    poorPropertyCondition: false,
                    wantsToRemain: false,
                    needsRelocationFunds: false,
                    titleHolderDeceased: false,
                    tenantOwnerDeceased: false,
                    needsProbateInfo: false,
                    needsLegalAssistance: false,
                    hasAuctionDate: false,
                    otherIssues: "",
                    auctionDate: "",
                    trusteeName: "",
                    appointmentType: "in-person",
                    availability: ["anytime"],
                    comments: "",
                  });
                  setCurrentStep(1);
                }}
                className="block w-full bg-white border-2 border-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:border-cyan-300 text-center"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/worker/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">Client Application</h1>
            </div>
            {location && (
              <span className="text-green-600 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                GPS
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of 6</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 6) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-lg"
                    placeholder="Enter client's full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-lg"
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-lg"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Language</label>
                  <select
                    name="primaryLanguage"
                    value={formData.primaryLanguage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Some English">Some English</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Property Information */}
          {currentStep === 2 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Property Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Address *</label>
                  <input
                    type="text"
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-lg"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      name="propertyCity"
                      value={formData.propertyCity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                    <input
                      type="text"
                      name="propertyZip"
                      value={formData.propertyZip}
                      onChange={handleInputChange}
                      required
                      pattern="[0-9]{5}"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">County *</label>
                  <input
                    type="text"
                    name="propertyCounty"
                    value={formData.propertyCounty}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="e.g., San Diego"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg"
                  >
                    <option value="">Select property type</option>
                    <option value="single-family">Single Family Home</option>
                    <option value="multi-family">Multi-family Home</option>
                    <option value="condo">Condo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Step 3: Title & Ownership */}
          {currentStep === 3 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Title & Ownership</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name on Title (Grant Deed) *</label>
                  <input
                    type="text"
                    name="nameOnTitle"
                    value={formData.nameOnTitle}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="Name as it appears on title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupant Type *</label>
                  <select
                    name="occupantType"
                    value={formData.occupantType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg"
                  >
                    <option value="">Select occupant type</option>
                    <option value="homeowner">Homeowner</option>
                    <option value="renter">Renter</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part of HOA? *</label>
                  <select
                    name="isHOA"
                    value={formData.isHOA}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unsure">Unsure</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Step 4: Crisis Indicators */}
          {currentStep === 4 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Problems Facing</h2>
              <p className="text-gray-600 text-sm mb-4">Check all that apply</p>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="hasNoticeOfDefault" checked={formData.hasNoticeOfDefault} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Received Notice of Default</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="hasNoticeOfTrusteeSale" checked={formData.hasNoticeOfTrusteeSale} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Received Notice of Trustee Sale</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="cannotAffordMortgage" checked={formData.cannotAffordMortgage} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Unable to afford mortgage</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="wantsToRemain" checked={formData.wantsToRemain} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Wants to save home / remain</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="needsRelocationFunds" checked={formData.needsRelocationFunds} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Needs relocation funds</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="titleHolderDeceased" checked={formData.titleHolderDeceased} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Title holder deceased</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="needsLegalAssistance" checked={formData.needsLegalAssistance} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-cyan-600 rounded" />
                  <span className="text-gray-700">Interested in legal assistance</span>
                </label>
                <label className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <input type="checkbox" name="hasAuctionDate" checked={formData.hasAuctionDate} onChange={handleInputChange} className="mt-0.5 h-5 w-5 text-red-600 rounded" />
                  <span className="text-red-700 font-medium">Has auction date scheduled (URGENT)</span>
                </label>
                {formData.hasAuctionDate && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auction Date</label>
                    <input type="date" name="auctionDate" value={formData.auctionDate} onChange={handleInputChange} className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900" />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Step 5: Document Upload */}
          {currentStep === 5 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Supporting Documents</h2>
              <p className="text-gray-600 text-sm mb-4">
                Upload any documents the client has available (ID, mortgage statements, notices, etc.)
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf,.doc,.docx,.txt"
                multiple
                onChange={handleDocumentCapture}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-cyan-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600">Take photo, choose from gallery, or upload file</p>
                <p className="text-gray-400 text-sm mt-1">Images, PDF, Word documents</p>
              </button>

              {documents.length > 0 && (
                <div className="mt-4 space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex gap-3">
                        {doc.file.type.startsWith("image/") ? (
                          <img src={doc.preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-gray-700 truncate">{doc.name}</p>
                          <select
                            value={doc.document_type}
                            onChange={(e) => updateDocumentType(doc.id, e.target.value)}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded text-gray-900"
                          >
                            {DOCUMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.id)}
                            className="text-red-600 text-sm hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {documents.length === 0 && (
                <p className="text-center text-gray-500 mt-4 text-sm">
                  No documents uploaded yet. This step is optional.
                </p>
              )}
            </section>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Review & Submit</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                  placeholder="Add any additional notes..."
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Application Summary</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Client:</dt>
                    <dd className="text-gray-900 font-medium">{formData.fullName || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Phone:</dt>
                    <dd className="text-gray-900">{formData.phoneNumber || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Property:</dt>
                    <dd className="text-gray-900 text-right max-w-[60%]">{formData.propertyAddress || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">County:</dt>
                    <dd className="text-gray-900">{formData.propertyCounty || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Documents:</dt>
                    <dd className="text-gray-900">{documents.length} uploaded</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Worker:</dt>
                    <dd className="text-gray-900">{session?.profile.full_name}</dd>
                  </div>
                </dl>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
                  {submitError}
                </div>
              )}
            </section>
          )}

          {/* Navigation Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
            <div className="max-w-2xl mx-auto flex gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200"
                >
                  Back
                </button>
              )}
              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-cyan-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-cyan-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
