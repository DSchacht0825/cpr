import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  userIds?: string[];
  sendToAll?: boolean;
  roles?: string[];
}

async function getFirebaseAdmin() {
  const admin = (await import('firebase-admin')).default;

  if (admin.apps.length) {
    return admin;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials not configured');
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
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json();
    const { title, body, data, userIds, sendToAll, roles } = payload;

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Get device tokens based on criteria
    let query = supabaseAdmin
      .from('device_tokens')
      .select('token, user_id, user_profiles!inner(role)')
      .eq('is_active', true);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else if (roles && roles.length > 0) {
      query = query.in('user_profiles.role', roles);
    } else if (!sendToAll) {
      // Default: send to field_workers and admins
      query = query.in('user_profiles.role', ['field_worker', 'admin']);
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch device tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { message: 'No device tokens found', sent: 0 },
        { status: 200 }
      );
    }

    // Get Firebase Admin
    const firebaseAdmin = await getFirebaseAdmin();
    if (!firebaseAdmin) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    // Send notifications
    const tokenStrings = tokens.map(t => t.token);
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: tokenStrings,
    };

    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);

    // Log notifications
    const logEntries = tokens.map((t, index) => ({
      user_id: t.user_id,
      notification_type: data?.type || 'general',
      title,
      body,
      data,
      success: response.responses[index]?.success || false,
      error_message: response.responses[index]?.error?.message || null,
    }));

    await supabaseAdmin.from('notification_log').insert(logEntries);

    // Deactivate failed tokens
    const failedTokens = tokens.filter((_, index) => {
      const error = response.responses[index]?.error;
      return error?.code === 'messaging/registration-token-not-registered' ||
             error?.code === 'messaging/invalid-registration-token';
    });

    if (failedTokens.length > 0) {
      await supabaseAdmin
        .from('device_tokens')
        .update({ is_active: false })
        .in('token', failedTokens.map(t => t.token));
    }

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    }, { status: 200 });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
