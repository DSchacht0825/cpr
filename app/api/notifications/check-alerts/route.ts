import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function getFirebaseAdmin() {
  const admin = (await import('firebase-admin')).default;

  if (admin.apps.length) {
    return admin;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return admin;
  } catch {
    return null;
  }
}

async function sendNotification(tokens: string[], title: string, body: string, data: Record<string, string>) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };

  const firebaseAdmin = await getFirebaseAdmin();
  if (!firebaseAdmin) {
    return { successCount: 0, failureCount: tokens.length };
  }

  try {
    const message = {
      notification: { title, body },
      data,
      tokens,
    };
    return await firebaseAdmin.messaging().sendEachForMulticast(message);
  } catch {
    return { successCount: 0, failureCount: tokens.length };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    const { data: deviceTokens } = await supabaseAdmin
      .from('device_tokens')
      .select('token, user_id, user_profiles!inner(role, full_name)')
      .eq('is_active', true)
      .in('user_profiles.role', ['field_worker', 'admin']);

    if (!deviceTokens || deviceTokens.length === 0) {
      return NextResponse.json({ message: 'No device tokens registered' }, { status: 200 });
    }

    const allTokens = deviceTokens.map(d => d.token);
    const results = { followUps: 0, urgentAuctions: 0, sent: 0, failed: 0 };

    const { data: dueFollowUps } = await supabaseAdmin
      .from('field_visits')
      .select('id, location_address, follow_up_date, contact_name, staff_member')
      .eq('requires_follow_up', true)
      .eq('follow_up_date', todayStr)
      .eq('reminder_sent', false);

    if (dueFollowUps && dueFollowUps.length > 0) {
      results.followUps = dueFollowUps.length;

      for (const followUp of dueFollowUps) {
        const title = 'Follow-up Due Today';
        const body = `Follow-up needed at ${followUp.location_address}${followUp.contact_name ? ` for ${followUp.contact_name}` : ''}`;

        const response = await sendNotification(allTokens, title, body, {
          type: 'follow_up',
          visitId: followUp.id,
          url: '/worker/dashboard',
        });

        results.sent += response.successCount;
        results.failed += response.failureCount;

        await supabaseAdmin
          .from('field_visits')
          .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
          .eq('id', followUp.id);
      }
    }

    const { data: urgentAuctions } = await supabaseAdmin
      .from('applicants')
      .select('id, full_name, property_address, auction_date')
      .not('auction_date', 'is', null)
      .gte('auction_date', todayStr)
      .lte('auction_date', sevenDaysStr)
      .eq('status', 'pending');

    if (urgentAuctions && urgentAuctions.length > 0) {
      results.urgentAuctions = urgentAuctions.length;

      const title = `${urgentAuctions.length} Urgent Auction${urgentAuctions.length > 1 ? 's' : ''} This Week`;
      const auctionList = urgentAuctions.slice(0, 3).map(a =>
        `${a.full_name} - ${new Date(a.auction_date!).toLocaleDateString()}`
      ).join(', ');
      const body = urgentAuctions.length > 3
        ? `${auctionList} and ${urgentAuctions.length - 3} more`
        : auctionList;

      const response = await sendNotification(allTokens, title, body, {
        type: 'urgent_auction',
        count: String(urgentAuctions.length),
        url: '/dashboard',
      });

      results.sent += response.successCount;
      results.failed += response.failureCount;
    }

    return NextResponse.json({ success: true, ...results }, { status: 200 });
  } catch (error) {
    console.error('Error checking alerts:', error);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}
