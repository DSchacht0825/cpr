"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface WorkerSession {
  user: { id: string; email: string };
  profile: { full_name: string };
  session: { access_token: string };
}

interface Case {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  status: string;
  has_auction_date: boolean;
  auction_date?: string;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  created_at: string;
}

export default function WorkerCasesPage() {
  const router = useRouter();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Auction date editing state
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [auctionDateValue, setAuctionDateValue] = useState("");
  const [savingAuctionDate, setSavingAuctionDate] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchCases(parsed.user.id);
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const fetchCases = async (userId: string) => {
    try {
      const response = await fetch(`/api/worker/cases?userId=${userId}`);
      const result = await response.json();
      if (response.ok) {
        setCases(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch cases:", err);
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

  const isUrgent = (c: Case) => {
    if (c.auction_date) {
      const auction = new Date(c.auction_date);
      const now = new Date();
      const daysUntil = Math.ceil((auction.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }
    return c.has_notice_of_trustee_sale;
  };

  const handleEditAuctionDate = (e: React.MouseEvent, caseItem: Case) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCaseId(caseItem.id);
    setAuctionDateValue(caseItem.auction_date || "");
  };

  const handleSaveAuctionDate = async (e: React.MouseEvent, caseId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setSavingAuctionDate(true);
    try {
      const updateData = auctionDateValue
        ? { auction_date: auctionDateValue, has_auction_date: true }
        : { auction_date: null, has_auction_date: false };

      const response = await fetch(`/api/applications/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update auction date");
      }

      // Update local state
      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId
            ? {
                ...c,
                auction_date: auctionDateValue || undefined,
                has_auction_date: !!auctionDateValue,
              }
            : c
        )
      );
      setEditingCaseId(null);
    } catch (err) {
      console.error("Error updating auction date:", err);
      alert("Failed to update auction date. Please try again.");
    } finally {
      setSavingAuctionDate(false);
    }
  };

  const handleCancelAuctionEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCaseId(null);
    setAuctionDateValue("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/worker/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">My Cases</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {cases.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No cases assigned to you yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/property/${c.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-cyan-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{c.full_name}</h3>
                      {isUrgent(c) && (
                        <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{c.property_address}</p>
                    <p className="text-sm text-gray-500">
                      {c.property_city}, {c.property_county} {c.property_zip}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <a
                        href={`tel:${c.phone_number}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-cyan-600 hover:text-cyan-700"
                      >
                        {c.phone_number}
                      </a>
                      {editingCaseId === c.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="date"
                            value={auctionDateValue}
                            onChange={(e) => setAuctionDateValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => handleSaveAuctionDate(e, c.id)}
                            disabled={savingAuctionDate}
                            className="px-2 py-1 text-xs font-medium text-white bg-cyan-600 rounded hover:bg-cyan-700 disabled:opacity-50"
                          >
                            {savingAuctionDate ? "..." : "Save"}
                          </button>
                          <button
                            onClick={handleCancelAuctionEdit}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {c.auction_date ? (
                            <span className="text-red-600">
                              Auction: {formatDate(c.auction_date)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No auction date</span>
                          )}
                          <button
                            onClick={(e) => handleEditAuctionDate(e, c)}
                            className="p-1 text-gray-400 hover:text-cyan-600 transition-colors"
                            title="Edit auction date"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-around">
          <Link href="/worker/dashboard" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/worker/cases" className="flex flex-col items-center text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs mt-1">Cases</span>
          </Link>
          <Link href="/worker/visit/new" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <div className="bg-cyan-600 text-white rounded-full p-2 -mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs mt-1">New Visit</span>
          </Link>
          <Link href="/worker/visits" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Visits</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
