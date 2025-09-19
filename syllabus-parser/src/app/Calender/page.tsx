
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
  const [selectedEvent, setSelectedEvent] = useState<any>(null); // event for modal
  const [isCalender, setIsCalender] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    setIsLoading(true)


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
    setIsLoading(false)
    setAssignments(data.assignments ?? []);
  }

  function parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }


  const events: Event[] = assignments.map((a) => ({
    title: a.title,
    start: parseLocalDate(a.date),
    end: parseLocalDate(a.date),
    allDay: true,
    resource: a.details,
  }));



  useEffect(() => {
    if (assignments.length > 0) {
      setDate(new Date(assignments[0].date));
    }
  }, [assignments]);



  console.log(selectedEvent)

  return (

    <div>
      <h1 className='text-center'>My Calendar dummy</h1>

      <div className='p-6 !p-6 flex flex-col'>
      <div className="flex justify-between h-8">
      <label htmlFor="file-upload" className="cursor-pointer flex gap-1 items-center">
        <i className="fi fi-br-upload text-black bg-white p-4 flex justify-center items-center w-10 h-full rounded-sm text-xl"></i>
      { isLoading && <div className="flex justify-center items-center h-5 w-6 px-5">
       <img src="/unnamed.gif" alt="Loading" className="w-4 h-full" />
       </div> }
        <span className="!pl-1 flex items-center">{selectedFile && !isLoading ? selectedFile.name : ""}</span>
        <input
          id="file-upload"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setSelectedFile(file); // store selected file in state
            handleUpload(e);
          }}
          className="hidden"
        />
      </label>
      <div onClick={() => setIsCalender(!isCalender)} className='cursor-pointer flex'>
      { isCalender ?
      <i className="fi fi-rr-calendar-lines text-black bg-white p-4 flex justify-center items-center w-10 rounded-sm text-xl"></i> :
      <i className="fi fi-rr-rectangle-list text-black bg-white p-4 flex justify-center items-center w-10 rounded-sm text-xl"></i>
      }
      </div>
      </div>
{   !isCalender && <div className="h-0.5 w-full bg-white !mt-3 rounded-2"></div>
}      { !isCalender && <div className="flex !pt-4">
      <ul className="!space-y-2">
        {assignments.map((a, i) => (
          <li key={i}>
          {a.title} - {a.date} {a.topics}:
          <span style={{ whiteSpace: "pre-line" }}> {a.details}</span>
        </li>
        ))}
      </ul>
      </div>}

       {/* Calendar view */}
       {isClient && isCalender ? (
        <div style={{ height: "80vh", marginTop: "2rem" }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            popup
            tooltipAccessor={(event: any) => event.resource}
            view={view}
            onView={(newView) => setView(newView)}
            date={date}
            onNavigate={(newDate) => setDate(newDate)}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
        </div>
      ) : <div></div>}
      </div>

      {selectedEvent && (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/50 z-40 cursor-pointer"
    onClick={() => setSelectedEvent(null)} 
  >
    <div
      className="bg-white rounded-lg shadow-lg !p-4 max-w-md w-full z-50 relative"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-black text-xl font-bold mb-2">{selectedEvent.title}</h2>
      <p className="text-gray-700 mb-2">
        <strong>Date:</strong> {selectedEvent.start.toDateString()}
      </p>
      <p className="text-gray-700 mb-2" style={{ whiteSpace: "pre-line" }}>
        <strong>Details:</strong> {selectedEvent.resource}
      </p>
      <button
        onClick={() => setSelectedEvent(null)}
        className="cursor-pointer !mt-4 bg-blue-500 text-white !p-1 rounded-lg hover:bg-blue-600"
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );

}
