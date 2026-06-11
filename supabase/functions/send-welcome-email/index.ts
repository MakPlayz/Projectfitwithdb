declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('PROJECTFIT_SERVICE_ROLE_KEY');
const FROM = 'Project Fit Vizag <noreply@projectfitvizag.com>';
const SUBJECT = 'Welcome to Project Fit!';
const MENU_URL = 'https://www.projectfitvizag.com/menu';

type WelcomeRequest = {
  email?: string;
  name?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildWelcomeHtml(name?: string) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';

  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">
    <h2 style="color: #1a1a1a; margin: 0 0 16px;">🌿 Welcome to Project Fit!</h2>

    <p>${greeting}</p>

    <p>Thank you for your interest in our healthy meal solutions.</p>

    <p>Where healthy eating meets great taste. 💪🥗</p>

    <p>At Project Fit, we believe nutritious food should be convenient, delicious, and tailored to your lifestyle. Share your requirements with us, and we'll recommend the best options for your goals.</p>

    <p>Whether you're looking for meal plans, healthy daily meals, weight management options, or simply nutritious food, we're here to help.</p>

    <p>Your wellness journey starts with your next meal. 💚</p>

    <p style="margin: 32px 0;">
      <a href="${MENU_URL}"
         style="background-color: #2563eb; color: white; padding: 14px 28px;
                text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700;">
        Explore Healthy Meals
      </a>
    </p>

    <p style="color: #555; font-size: 14px;">
      Delivery is currently available only in selected Vizag pincodes. You can save
      or update your location from your profile before checkout.
    </p>

    <p style="color: #666; font-size: 14px;">
      If you did not create this account, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

    <p style="color: #888; font-size: 13px;">
      Project Fit Vizag<br>
      Eat clean. Live fit. Delivered with care.<br>
      projectfitvizag@gmail.com | 7799066991<br>
      <a href="https://www.projectfitvizag.com" style="color: #2563eb;">www.projectfitvizag.com</a>
    </p>
  </body>
</html>`;
}

function buildWelcomeText(name?: string) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  return [
    '🌿 Welcome to Project Fit!',
    '',
    greeting,
    '',
    'Thank you for your interest in our healthy meal solutions.',
    '',
    'Where healthy eating meets great taste. 💪🥗',
    '',
    "At Project Fit, we believe nutritious food should be convenient, delicious, and tailored to your lifestyle. Share your requirements with us, and we'll recommend the best options for your goals.",
    '',
    "Whether you're looking for meal plans, healthy daily meals, weight management options, or simply nutritious food, we're here to help.",
    '',
    'Your wellness journey starts with your next meal. 💚',
    '',
    `Explore Healthy Meals: ${MENU_URL}`,
    '',
    'Delivery is currently available only in selected Vizag pincodes.',
    '',
    'If you did not create this account, you can safely ignore this email.',
    '',
    'Project Fit Vizag',
    'Eat clean. Live fit. Delivered with care.',
    'projectfitvizag@gmail.com | 7799066991',
    'https://www.projectfitvizag.com',
  ].join('\n');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  if (SERVICE_ROLE_KEY) {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (token !== SERVICE_ROLE_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  let body: WelcomeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const email = body.email?.trim();
  if (!email) {
    return json({ error: 'email is required' }, 400);
  }

  const name = body.name?.trim();
  const html = buildWelcomeHtml(name);
  const text = buildWelcomeText(name);

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: SUBJECT,
      html,
      text,
    }),
  });

  const data = await resendResponse.json().catch(() => null);
  if (!resendResponse.ok) {
    console.error('Resend error', data);
    return json({ error: data ?? 'Resend request failed' }, 502);
  }

  return json({ ok: true, id: data?.id ?? null });
});
