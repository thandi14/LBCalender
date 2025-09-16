
'use client';

import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import { Calendar as BigCalendar, dateFnsLocalizer, Event, Views } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";


const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});


export default function Calendar() {
  const [assignments, setAssignments] = useState<{ title: string; date: string; topics: string; details: string }[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<typeof Views[keyof typeof Views]>("month");
  const [date, setDate] = useState(new Date());


  useEffect(() => {
    setIsClient(true);
  }, []);

  async function extractPdfText(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await extractPdfText(file);

    console.log(text)

    // send text to your OpenAI backend
    const res = await fetch("/api/parse-pdf", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    console.log(data)
    setAssignments(data.assignments ?? []);
  }

  function inferYear(assignments: { date: string }[]) {
    const years: Record<string, number> = {};

    assignments.forEach(a => {
      const match = a.date.match(/\d{4}/);
      if (match) {
        const year = match[0];
        years[year] = (years[year] || 0) + 1;
      }
    });

    const sortedYears = Object.entries(years).sort((a, b) => b[1] - a[1]);
    return sortedYears.length > 0 ? sortedYears[0][0] : new Date().getFullYear().toString();
  }

  const inferredYear = inferYear(assignments);

const events: Event[] = assignments.map((a) => {
  let dateStr = a.date;

  if (!/\d{4}/.test(dateStr)) {
    dateStr += `-${inferredYear}`;
  }

  const dateObj = new Date(dateStr);

  return {
    title: a.title,
    start: dateObj,
    end: dateObj,
    allDay: true,
    resource: a.details,
  };
});

  useEffect(() => {
    if (assignments.length > 0) {
      setDate(new Date(assignments[0].date));
    }
  }, [assignments]);



  console.log(assignments)

  return (
    <div>
      <h1>My Calendar dummy</h1>
      <input type="file" accept="application/pdf" onChange={handleUpload} />
      <ul>
        {assignments.map((a, i) => (
          <li key={i}>
            {a.title} - {a.date}, {a.topics}: "{a.details}"
          </li>
        ))}
      </ul>

       {/* Calendar view */}
       {isClient && (
        <div style={{ height: "80vh", marginTop: "2rem" }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            popup
            tooltipAccessor={(event: any) => event.resource}
            view={view}                  // controlled view
            onView={(newView) => setView(newView)} // handle view change
            date={date}                  // controlled date
            onNavigate={(newDate) => setDate(newDate)}
          />
        </div>
      )}
    </div>
  );
}
