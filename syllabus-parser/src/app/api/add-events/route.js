import axios from "axios";

export async function POST(req) {
  const body = await req.json();
  const access_token = body.access_token;
  const events = body.events; 

  for (const event of events) {
    await axios.post(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        summary: event.title,
        description: event.details,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
      },
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
  }

  return new Response(JSON.stringify({ success: true }));
}
