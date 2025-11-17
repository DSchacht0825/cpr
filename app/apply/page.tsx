import Image from "next/image";
import Link from "next/link";
import ApplicationForm from "@/components/ApplicationForm";

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/cpr.png"
                alt="Community Property Rescue Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Community Property Rescue
                </h1>
                <p className="text-sm text-gray-600">Restoring hope & dignity</p>
              </div>
            </Link>
            <Link href="/" className="text-cyan-600 hover:text-cyan-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Application for Assistance
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Please fill out the form below with as much detail as possible. All information is kept
            confidential and will only be used to help us understand your situation better.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Fields marked with <span className="text-red-500">*</span> are required
          </p>
        </div>

        <ApplicationForm />

        <div className="mt-12 text-center">
          <div className="card max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">Need to Upload Documents?</h3>
            <p className="text-gray-600 mb-4">
              If you have a Notice of Default, Notice of Trustee Sale, or current mortgage
              statement, you can email them to:
            </p>
            <a
              href="mailto:CommunityPropertyRescue@gmail.com"
              className="text-cyan-600 hover:text-cyan-700 font-medium"
            >
              CommunityPropertyRescue@gmail.com
            </a>
            <p className="text-sm text-gray-500 mt-2">
              Please include your name and property address in the subject line
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              &copy; {new Date().getFullYear()} Community Property Rescue - California Benefit
              Corporation
            </p>
            <p className="text-sm text-gray-500 mt-2">
              People over profit. Transparency and honesty.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
