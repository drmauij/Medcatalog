import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

function getAppUrl(): string {
  // Priority: Custom APP_URL > Production domains > Dev domain > localhost
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://localhost:5000';
}

export async function sendInvitationEmail(
  toEmail: string,
  supplierName: string,
  inviterName: string,
  inviteToken: string
) {
  const { client, fromEmail } = await getResendClient();
  
  const appUrl = getAppUrl();
  
  const inviteLink = `${appUrl}/invite/${inviteToken}`;
  
  await client.emails.send({
    from: fromEmail || 'noreply@resend.dev',
    to: toEmail,
    subject: `Einladung zu ${supplierName} - MedCatalog`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Einladung zu MedCatalog</h2>
        <p>Hallo,</p>
        <p><strong>${inviterName}</strong> hat Sie eingeladen, dem Lieferantenportal von <strong>${supplierName}</strong> auf MedCatalog beizutreten.</p>
        <p>Klicken Sie auf den folgenden Link, um die Einladung anzunehmen:</p>
        <p style="margin: 24px 0;">
          <a href="${inviteLink}" 
             style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Einladung annehmen
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
          <a href="${inviteLink}">${inviteLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          Diese E-Mail wurde automatisch von MedCatalog gesendet.
        </p>
      </div>
    `
  });
}

export async function sendClinicInvitationEmail(
  toEmail: string,
  clinicName: string,
  inviterName: string,
  inviteToken: string
) {
  const { client, fromEmail } = await getResendClient();
  
  const appUrl = getAppUrl();
  
  const inviteLink = `${appUrl}/clinic-invite/${inviteToken}`;
  
  await client.emails.send({
    from: fromEmail || 'noreply@resend.dev',
    to: toEmail,
    subject: `Einladung zu ${clinicName} - MedCatalog`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Einladung zu MedCatalog</h2>
        <p>Hallo,</p>
        <p><strong>${inviterName}</strong> hat Sie eingeladen, dem Klinikportal von <strong>${clinicName}</strong> auf MedCatalog beizutreten.</p>
        <p>Klicken Sie auf den folgenden Link, um die Einladung anzunehmen:</p>
        <p style="margin: 24px 0;">
          <a href="${inviteLink}" 
             style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Einladung annehmen
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
          <a href="${inviteLink}">${inviteLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          Diese E-Mail wurde automatisch von MedCatalog gesendet.
        </p>
      </div>
    `
  });
}
