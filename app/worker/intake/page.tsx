"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface WorkerSession {
  user: { id: string; email: string };
  profile: { full_name: string };
  session: { access_token: string };
}

interface FormData {
  // Personal Information
  fullName: string;
  phoneNumber: string;
  email: string;
  primaryLanguage: string;
  preferredContactMethod: string;

  // Property Information
  propertyAddress: string;
  propertyCity: string;
  propertyCounty: string;
  propertyZip: string;
  propertyType: string;
  propertyTypeOther: string;

  // Title & Ownership
  nameOnTitle: string;
  occupantType: string;
  isHOA: string;

  // Crisis Indicators
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

  // Urgency & Scheduling
  auctionDate: string;
  trusteeName: string;
  appointmentType: string;
  availability: string[];

  // Additional Context
  comments: string;
}

export default function WorkerIntakePage() {
  const router = useRouter();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
        (error) => {
          setLocationError("Could not get location: " + error.message);
        },
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

  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      availability: checked
        ? [...prev.availability, value]
        : prev.availability.filter((item) => item !== value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Field intake metadata
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

      setSubmitSuccess(true);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit application"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
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
              <h1 className="text-lg font-bold text-gray-900">Field Intake</h1>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Application Submitted!</h2>
            <p className="text-green-700 mb-6">
              The application has been submitted successfully and will appear in the admin dashboard.
            </p>
            <div className="space-y-3">
              <Link
                href="/worker/intake"
                onClick={() => {
                  setSubmitSuccess(false);
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
                className="block w-full bg-cyan-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-cyan-700"
              >
                Submit Another Application
              </Link>
              <Link
                href="/worker/dashboard"
                className="block w-full bg-white border-2 border-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:border-cyan-300"
              >
                Return to Dashboard
              </Link>
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
              <h1 className="text-lg font-bold text-gray-900">Field Intake</h1>
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
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of 5</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Language
                  </label>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Contact Method
                  </label>
                  <select
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg"
                  >
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="text">Text Message</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address *
                  </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="propertyCity"
                      value={formData.propertyCity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="propertyZip"
                      value={formData.propertyZip}
                      onChange={handleInputChange}
                      required
                      pattern="[0-9]{5}"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    County *
                  </label>
                  <input
                    type="text"
                    name="propertyCounty"
                    value={formData.propertyCounty}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-lg"
                    placeholder="e.g., San Diego"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Type *
                  </label>
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

                {formData.propertyType === "other" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Please specify
                    </label>
                    <input
                      type="text"
                      name="propertyTypeOther"
                      value={formData.propertyTypeOther}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Step 3: Title & Ownership */}
          {currentStep === 3 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Title & Ownership</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name on Title (Grant Deed) *
                  </label>
                  <input
                    type="text"
                    name="nameOnTitle"
                    value={formData.nameOnTitle}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-lg"
                    placeholder="Name as it appears on title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occupant Type *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Part of HOA? *
                  </label>
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
                  <input
                    type="checkbox"
                    name="hasNoticeOfDefault"
                    checked={formData.hasNoticeOfDefault}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Received Notice of Default</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="hasNoticeOfTrusteeSale"
                    checked={formData.hasNoticeOfTrusteeSale}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Received Notice of Trustee Sale</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="cannotAffordMortgage"
                    checked={formData.cannotAffordMortgage}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Unable to afford mortgage</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="facingEviction"
                    checked={formData.facingEviction}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Being evicted</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="poorPropertyCondition"
                    checked={formData.poorPropertyCondition}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Property in poor condition / underwater</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="wantsToRemain"
                    checked={formData.wantsToRemain}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Wants to save home / remain</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="needsRelocationFunds"
                    checked={formData.needsRelocationFunds}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Needs relocation funds</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="titleHolderDeceased"
                    checked={formData.titleHolderDeceased}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Title holder deceased</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="needsProbateInfo"
                    checked={formData.needsProbateInfo}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Needs probate information</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="needsLegalAssistance"
                    checked={formData.needsLegalAssistance}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-cyan-600 rounded"
                  />
                  <span className="text-gray-700">Interested in legal assistance</span>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <input
                    type="checkbox"
                    name="hasAuctionDate"
                    checked={formData.hasAuctionDate}
                    onChange={handleInputChange}
                    className="mt-0.5 h-5 w-5 text-red-600 rounded"
                  />
                  <span className="text-red-700 font-medium">Has auction date scheduled (URGENT)</span>
                </label>

                {formData.hasAuctionDate && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auction Date
                    </label>
                    <input
                      type="date"
                      name="auctionDate"
                      value={formData.auctionDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Issues
                  </label>
                  <textarea
                    name="otherIssues"
                    value={formData.otherIssues}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="Describe any other issues..."
                  />
                </div>
              </div>
            </section>
          )}

          {/* Step 5: Notes & Submit */}
          {currentStep === 5 && (
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trustee Name (if applicable)
                  </label>
                  <input
                    type="text"
                    name="trusteeName"
                    value={formData.trusteeName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="From Notice of Trustee Sale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments / Notes from Visit
                  </label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    rows={5}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="Add any additional notes from your conversation with the client..."
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                  <dl className="space-y-1 text-sm">
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
                      <dd className="text-gray-900">{formData.propertyAddress || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">County:</dt>
                      <dd className="text-gray-900">{formData.propertyCounty || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Worker:</dt>
                      <dd className="text-gray-900">{session?.profile.full_name}</dd>
                    </div>
                    {location && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">GPS:</dt>
                        <dd className="text-green-600">Captured</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {submitError}
                  </div>
                )}
              </div>
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
              {currentStep < 5 ? (
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
