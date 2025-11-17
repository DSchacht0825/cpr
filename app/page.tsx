import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
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
                  Community Property Rescue
                </h1>
                <p className="text-sm text-gray-600">
                  Restoring hope & dignity
                </p>
              </div>
            </div>
            <Link
              href="/apply"
              className="btn-primary"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            We&apos;re Here to Help
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Facing a housing crisis? We walk alongside you with compassion and real solutions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="card">
            <div className="text-cyan-600 text-4xl mb-4">💙</div>
            <h3 className="text-xl font-semibold mb-2">Grace & Dignity</h3>
            <p className="text-gray-600">
              We recognize your unique context and treat you with the dignity and respect you deserve.
            </p>
          </div>

          <div className="card">
            <div className="text-cyan-600 text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold mb-2">Partnership</h3>
            <p className="text-gray-600">
              This is a shared journey, not a transaction. We&apos;re here to partner with you.
            </p>
          </div>

          <div className="card">
            <div className="text-cyan-600 text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Real Solutions</h3>
            <p className="text-gray-600">
              We listen, collaborate, and help you navigate options that support your goals.
            </p>
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-8 text-center border border-cyan-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Start?
          </h3>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Fill out our application to begin the process. We&apos;ll review your situation and reach out to discuss your options.
          </p>
          <Link
            href="/apply"
            className="btn-primary inline-block"
          >
            Start Your Application
          </Link>
        </div>
      </main>

      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              &copy; {new Date().getFullYear()} Community Property Rescue - California Benefit Corporation
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
