export async function GET() {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar.events");

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return Response.redirect(url);
  }
