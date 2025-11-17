# Community Property Rescue - PWA Application

A Progressive Web App (PWA) for managing housing crisis applications and field outreach for Community Property Rescue, a California Benefit Corporation.

## Features

- **Progressive Web App**: Installable on iOS, Android, and desktop devices
- **Offline-capable**: Field staff can work offline and sync when back online
- **Comprehensive Application Form**: Collects detailed information about applicants and their situations
- **Admin Dashboard**: View, filter, and manage applications
- **Real-time Database**: Powered by Supabase for instant updates
- **Responsive Design**: Works seamlessly on all devices
- **Brand-aligned UI**: Uses CPR's color scheme and branding

## Tech Stack

- **Frontend**: Next.js 14+ (React with TypeScript)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for documents)
- **PWA**: next-pwa for service worker and offline support

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works great)
- Git (for version control)

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Wait for the project to finish setting up (takes ~2 minutes)

#### Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy your:
   - **Project URL**
   - **anon/public key**
   - **service_role key** (keep this secret!)

#### Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the database schema file: `docs/database-schema.md`
3. Copy the SQL for each table and run it in the SQL Editor

Key tables to create:
- `applicants` - Initial application data
- `clients` - Extended client information
- `documents` - File storage references
- `case_events` - Activity log
- `field_visits` - Outreach/field intake
- `user_profiles` - Staff profiles

**Important**: Make sure to run the Row Level Security (RLS) policies as well!

### 3. Configure Environment Variables

1. Copy the example env file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Application Structure

```
community-property-rescue/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── applications/         # Application submission endpoints
│   ├── apply/                    # Public application form
│   ├── dashboard/                # Admin dashboard
│   ├── layout.tsx                # Root layout with PWA config
│   └── page.tsx                  # Home page
├── components/                   # React components
│   └── ApplicationForm.tsx       # Main application form
├── lib/                          # Utilities
│   └── supabase.ts              # Supabase client configuration
├── public/                       # Static assets
│   ├── cpr.png                  # Logo
│   └── manifest.json            # PWA manifest
├── docs/                         # Documentation
│   └── database-schema.md       # Complete database schema
└── next.config.ts               # Next.js + PWA configuration
```

## Key Routes

### Public Routes
- `/` - Home page with information about CPR
- `/apply` - Application form for homeowners

### Admin Routes
- `/dashboard` - View all applications with filtering and stats

### API Routes
- `POST /api/applications` - Submit a new application
- `GET /api/applications` - Fetch applications (with optional status filter)

## PWA Features

### Installation

Users can install the app on their devices:

**iOS (iPhone/iPad)**:
1. Open in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

**Android**:
1. Open in Chrome
2. Tap the menu (3 dots)
3. Tap "Add to Home Screen"

**Desktop**:
1. Look for the install icon in the address bar
2. Click to install

### Offline Support

The PWA includes:
- **App Shell Caching**: UI loads instantly after first visit
- **Offline Form Submission**: Field staff can fill forms offline (coming soon with sync queue)
- **Cached Assets**: Logo, CSS, and JavaScript work offline

## Database Schema Overview

### `applicants` Table
Stores initial application data including:
- Personal information (name, phone, email, language)
- Property details (address, county, type)
- Crisis indicators (NOD, NTS, eviction, etc.)
- Urgency info (auction dates, trustee names)
- Scheduling preferences

### `clients` Table
Extended data for qualified applicants:
- Financial information (NO SSN for privacy)
- Detailed property info
- Mortgage details
- Legal assistance qualification

### `field_visits` Table
For offline-capable field intake:
- Visit details and notes
- Property condition observations
- Sync status for offline entries

### `documents` Table
References to uploaded files:
- Notice of Default (NOD)
- Notice of Trustee Sale (NTS)
- Mortgage statements
- Other supporting documents

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy!

The PWA will automatically work on your deployed domain.

### Other Platforms

You can also deploy to:
- Netlify
- Railway
- AWS Amplify
- Any platform that supports Next.js

## Adding to Your Website

To add an "Apply Now" button to your existing Squarespace website:

1. Add a Button Block
2. Link it to: `https://your-app-domain.vercel.app/apply`
3. Set the button text to "Apply for Assistance"

When visitors click, they'll be taken to the application form, and submissions will create records in your database.

## Security & Privacy

- **No SSN Storage**: The system explicitly does NOT collect Social Security Numbers
- **Row Level Security (RLS)**: Supabase policies ensure data is protected
- **Environment Variables**: Sensitive keys are never exposed to the client
- **HTTPS Only**: All connections are encrypted
- **Role-based Access**: Admin dashboard requires authentication

## Support & Documentation

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **PWA Guide**: [https://web.dev/progressive-web-apps/](https://web.dev/progressive-web-apps/)

## Future Enhancements

- [ ] Document upload functionality
- [ ] Email notifications for new applications
- [ ] SMS reminders for auction dates
- [ ] Advanced reporting and analytics
- [ ] Field intake offline sync queue
- [ ] Push notifications for urgent cases
- [ ] Export to CSV/Excel
- [ ] Calendar integration for appointments

## License

Copyright © 2024 Community Property Rescue - California Benefit Corporation

---

**Built with ❤️ for the mission of restoring hope & dignity**
