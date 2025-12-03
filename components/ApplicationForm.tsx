"use client";

import { useState, FormEvent } from "react";

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

export default function ApplicationForm() {
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
    appointmentType: "",
    availability: [],
    comments: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      setSubmitSuccess(true);
      // Reset form
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
        appointmentType: "",
        availability: [],
        comments: "",
      });
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError("There was an error submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-2xl font-bold text-green-800 mb-4">
          Application Submitted Successfully!
        </h3>
        <p className="text-green-700 mb-4">
          Thank you for submitting your application. A member of our team will review your
          information and contact you within 1-2 business days.
        </p>
        <a
          href="https://www.communitypropertyrescue.com"
          className="btn-primary inline-block"
        >
          Back to Website
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      {/* Personal Information */}
      <section className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fullName" className="label">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="label">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="primaryLanguage" className="label">
              Primary Language <span className="text-red-500">*</span>
            </label>
            <select
              id="primaryLanguage"
              name="primaryLanguage"
              value={formData.primaryLanguage}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Some English">Some English</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="preferredContactMethod" className="label">
              Preferred Contact Method <span className="text-red-500">*</span>
            </label>
            <select
              id="preferredContactMethod"
              name="preferredContactMethod"
              value={formData.preferredContactMethod}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="text">Text Message</option>
            </select>
          </div>
        </div>
      </section>

      {/* Property Information */}
      <section className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Information</h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="propertyAddress" className="label">
              Property Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="propertyAddress"
              name="propertyAddress"
              value={formData.propertyAddress}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Street address"
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="propertyCity" className="label">
                City
              </label>
              <input
                type="text"
                id="propertyCity"
                name="propertyCity"
                value={formData.propertyCity}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="propertyCounty" className="label">
                County <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="propertyCounty"
                name="propertyCounty"
                value={formData.propertyCounty}
                onChange={handleInputChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="propertyZip" className="label">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="propertyZip"
                name="propertyZip"
                value={formData.propertyZip}
                onChange={handleInputChange}
                className="input-field"
                pattern="[0-9]{5}"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="propertyType" className="label">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="input-field"
                required
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
                <label htmlFor="propertyTypeOther" className="label">
                  Please specify
                </label>
                <input
                  type="text"
                  id="propertyTypeOther"
                  name="propertyTypeOther"
                  value={formData.propertyTypeOther}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Title & Ownership */}
      <section className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Title & Ownership</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="nameOnTitle" className="label">
              Name as it appears on title (grant deed) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nameOnTitle"
              name="nameOnTitle"
              value={formData.nameOnTitle}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="occupantType" className="label">
              Occupant Type <span className="text-red-500">*</span>
            </label>
            <select
              id="occupantType"
              name="occupantType"
              value={formData.occupantType}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              <option value="">Select occupant type</option>
              <option value="homeowner">Homeowner</option>
              <option value="renter">Renter (tenant lives in the home)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="isHOA" className="label">
              Is this property part of an HOA? <span className="text-red-500">*</span>
            </label>
            <select
              id="isHOA"
              name="isHOA"
              value={formData.isHOA}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unsure">Unsure</option>
            </select>
          </div>
        </div>
      </section>

      {/* Crisis Indicators */}
      <section className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Please mark the problems you are facing <span className="text-red-500">*</span>
        </h2>

        <div className="space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="hasNoticeOfDefault"
              checked={formData.hasNoticeOfDefault}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              Preforeclosure (You&apos;ve received a Notice of Default)
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="hasNoticeOfTrusteeSale"
              checked={formData.hasNoticeOfTrusteeSale}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              Foreclosure (You&apos;ve received a Notice of Trustee Sale)
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="cannotAffordMortgage"
              checked={formData.cannotAffordMortgage}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">You are unable to afford the mortgage payment</span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="facingEviction"
              checked={formData.facingEviction}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">You are being evicted</span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="poorPropertyCondition"
              checked={formData.poorPropertyCondition}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              Your property is in poor condition, and you owe more money than the home is worth
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="wantsToRemain"
              checked={formData.wantsToRemain}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              You want to remain in your property or save your home
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="needsRelocationFunds"
              checked={formData.needsRelocationFunds}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              You are in the process of losing your home and need money to relocate
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="titleHolderDeceased"
              checked={formData.titleHolderDeceased}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              The homeowner (title holder) has passed away, and you need help understanding your
              options
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="tenantOwnerDeceased"
              checked={formData.tenantOwnerDeceased}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              You are a tenant, and the homeowner has passed away and need to know your options
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="needsProbateInfo"
              checked={formData.needsProbateInfo}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              You would like to get information about probate for a loved one
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="needsLegalAssistance"
              checked={formData.needsLegalAssistance}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">You&apos;re interested in legal assistance</span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="hasAuctionDate"
              checked={formData.hasAuctionDate}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">
              You have an auction date scheduled and need urgent assistance
            </span>
          </label>

          <div>
            <label htmlFor="otherIssues" className="label">
              Other issues (please describe)
            </label>
            <textarea
              id="otherIssues"
              name="otherIssues"
              value={formData.otherIssues}
              onChange={handleInputChange}
              className="input-field"
              rows={3}
            />
          </div>
        </div>
      </section>

      {/* Urgency & Scheduling */}
      <section className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Scheduling & Urgency</h2>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="auctionDate" className="label">
                Auction Date (if applicable)
              </label>
              <input
                type="date"
                id="auctionDate"
                name="auctionDate"
                value={formData.auctionDate}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="trusteeName" className="label">
                Trustee Name (if you have a Notice of Trustee Sale)
              </label>
              <input
                type="text"
                id="trusteeName"
                name="trusteeName"
                value={formData.trusteeName}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="appointmentType" className="label">
              Appointment Type <span className="text-red-500">*</span>
            </label>
            <select
              id="appointmentType"
              name="appointmentType"
              value={formData.appointmentType}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              <option value="">Select appointment type</option>
              <option value="phone">Phone</option>
              <option value="video">Video Call</option>
              <option value="in-person">In Person</option>
            </select>
          </div>

          <div>
            <label className="label">
              What time are you available? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 mt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  value="morning"
                  checked={formData.availability.includes("morning")}
                  onChange={handleAvailabilityChange}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">Morning (8 AM - 12 PM)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  value="afternoon"
                  checked={formData.availability.includes("afternoon")}
                  onChange={handleAvailabilityChange}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">Afternoon (1 PM - 4 PM)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  value="evening"
                  checked={formData.availability.includes("evening")}
                  onChange={handleAvailabilityChange}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">Evening (4 PM - 7 PM)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  value="anytime"
                  checked={formData.availability.includes("anytime")}
                  onChange={handleAvailabilityChange}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">Any time</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Comments */}
      <section className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>

        <div>
          <label htmlFor="comments" className="label">
            Comments or Additional Information
          </label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            className="input-field"
            rows={5}
            placeholder="Please share any additional information about your situation that would help us serve you better..."
          />
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> As a mission-based for-profit organization, we strive to keep
            costs affordable—no greater than market value, but at times discounted or free. A member
            of our team will discuss options with you during your consultation.
          </p>
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex justify-center">
        {submitError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
