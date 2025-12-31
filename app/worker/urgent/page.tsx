"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Worker {
  id: string;
  full_name: string;
}

interface UrgentCase {
  id: string;
  full_name: string;
  phone_number: string;
  property_address: string;
  property_city?: string;
  property_county: string;
  property_zip: string;
  auction_date: string;
  assigned_to?: string;
  status: string;
}

export default function UrgentAuctionsPage() {
  const router = useRouter();
  const [urgentCases, setUrgentCases] = useState<UrgentCase[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      // Fetch all applications and workers in parallel
      const [appsResponse, workersResponse] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/workers"),
      ]);

      const appsResult = await appsResponse.json();
      const workersResult = await workersResponse.json();

      if (workersResponse.ok) {
        setWorkers(workersResult.data || []);
      }

      if (appsResponse.ok && appsResult.data) {
        // Filter for urgent auctions (within 30 days)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const urgent = appsResult.data.filter((app: UrgentCase) => {
          if (!app.auction_date || app.status === "closed") return false;
          const auctionDate = new Date(app.auction_date);
          return auctionDate <= thirtyDaysFromNow;
        });

        // Sort by auction date (soonest first)
        urgent.sort((a: UrgentCase, b: UrgentCase) => {
          return new Date(a.auction_date).getTime() - new Date(b.auction_date).getTime();
        });

        setUrgentCases(urgent);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return "Unassigned";
    const worker = workers.find((w) => w.id === workerId);
    return worker?.full_name || "Unknown";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const auction = new Date(dateString);
    const days = Math.ceil((auction.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "PAST DUE";
    if (days === 0) return "TODAY";
    if (days === 1) return "TOMORROW";
    return `${days} days`;
  };

  const getUrgencyColor = (dateString: string) => {
    const now = new Date();
    const auction = new Date(dateString);
    const days = Math.ceil((auction.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 3) return "bg-red-600";
    if (days <= 7) return "bg-orange-500";
    if (days <= 14) return "bg-yellow-500";
    return "bg-blue-500";
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
              <div>
                <h1 className="text-lg font-bold text-gray-900">Urgent Auctions</h1>
                <p className="text-sm text-gray-500">Within 30 days</p>
              </div>
            </div>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
              {urgentCases.length}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {urgentCases.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No urgent auctions!</p>
            <p className="text-sm mt-1">No auctions scheduled within the next 30 days.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {urgentCases.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  {/* Urgency indicator */}
                  <div className={`${getUrgencyColor(c.auction_date)} text-white text-xs font-bold px-2 py-1 rounded-lg text-center min-w-[70px]`}>
                    {getDaysUntil(c.auction_date)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{c.full_name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{c.property_address}</p>
                    <p className="text-sm text-gray-500">
                      {c.property_city ? `${c.property_city}, ` : ""}{c.property_county} {c.property_zip}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Auction Date</p>
                        <p className="text-sm font-medium text-red-600">{formatDate(c.auction_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Assigned To</p>
                        <p className={`text-sm font-medium ${c.assigned_to ? "text-gray-900" : "text-amber-600"}`}>
                          {getWorkerName(c.assigned_to)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <a
                        href={`tel:${c.phone_number}`}
                        className="flex-1 text-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                      >
                        Call
                      </a>
                      <Link
                        href={`/dashboard/property/${c.id}`}
                        className="flex-1 text-center px-3 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
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
          <Link href="/worker/cases" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
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
          <Link href="/worker/urgent" className="flex flex-col items-center text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1">Urgent</span>
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
