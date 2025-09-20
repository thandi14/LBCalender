'use client';

import { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import enUS from 'date-fns/locale/en-US';
import Image from 'next/image';
import { format, parse, startOfWeek, getDay } from "date-fns";


const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type Assignment = {
  title: string;
  date: string;
  topics: string;
  details: string | string[];
};

type MyEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: string[];
};

export default function Calendar() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<typeof Views[keyof typeof Views]>('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<MyEvent | null>(null);
  const [isCalender, setIsCalender] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => setIsClient(true), []);

  const handleAddToCalendar = useCallback(async () => {
    try {
      const access_token = localStorage.getItem('google_access_token');
      if (!access_token) {
        window.location.href = '/api/oauth/start';
        return;
      }

      const res = await fetch('/api/add-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: assignments, access_token }),
      });

      const data = await res.json();
      console.log('Events added:', data);
      alert('Assignments added to Google Calendar!');
    } catch (err) {
      console.error(err);
      alert('Failed to add events to Google Calendar.');
    }
  }, [assignments]);

  useEffect(() => {
    if (assignments.length > 0) {
      const confirmed = window.confirm('Do you want to add all assignments to Google Calendar?');
      if (confirmed) handleAddToCalendar();
    }
  }, [assignments, handleAddToCalendar]);

  async function extractPdfText(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ') + '\n';
    }
    return text;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setSelectedFile(file);

    const text = await extractPdfText(file);
    const res = await fetch('/api/parse-pdf', {
      method: 'POST',
      body: JSON.stringify({ text }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    setIsLoading(false);
    setAssignments(data.assignments ?? []);
  }

  function parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const events: MyEvent[] = assignments.map((a) => ({
    title: a.title,
    start: parseLocalDate(a.date),
    end: parseLocalDate(a.date),
    allDay: true,
    resource: Array.isArray(a.details) ? a.details : [a.details],
  }));

  useEffect(() => {
    if (assignments.length > 0) setDate(new Date(assignments[0].date));
  }, [assignments]);

  return (
    <div>
      <h1 className="text-center !m-4">My Calendar dummy</h1>

      <div className="!p-6 flex flex-col">
        <div className="flex justify-between h-8">
          <label htmlFor="file-upload" className="cursor-pointer flex gap-1 items-center">
            <i className="fi fi-br-upload text-black bg-white !p-4 flex justify-center items-center w-10 h-full rounded-sm text-xl" />
            {isLoading && (
              <div className="flex justify-center items-center h-5 w-6 !px-5">
                <div className="relative w-4 h-4">
                  <Image src="/unnamed.gif" alt="Loading" fill style={{ objectFit: 'contain' }} />
                </div>
              </div>
            )}
            <span className="!pl-1 flex items-center">{selectedFile && !isLoading ? selectedFile.name : ''}</span>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <div onClick={() => setIsCalender(!isCalender)} className="cursor-pointer flex">
            {isCalender ? (
              <i className="fi fi-rr-rectangle-list text-black bg-white !p-4 flex justify-center items-center w-10 rounded-sm text-xl" />
            ) : (
              <i className="fi fi-rr-calendar-lines text-black bg-white !p-4 flex justify-center items-center w-10 rounded-sm text-xl" />
            )}
          </div>
        </div>

        {!isCalender ? (
          <div className="h-0.5 w-full bg-white !mt-3 rounded-2" />
        ) : (
          <div className="h-0.5 w-full bg-transparent !mt-3 rounded-2" />
        )}

        {!isCalender && (
          <div className="flex !pt-4">
            <ul className="!space-y-2">
              {assignments.map((a, i) => {
                const detailsText = Array.isArray(a.details)
                  ? a.details.map((d) => (d.startsWith('•') ? `\n${d}` : d)).join(' ')
                  : a.details;

                return (
                  <li key={i}>
                    {a.title} - {!a.topics ? ` ${a.date}:` : a.date} {a.topics && ` ${a.topics}:`}
                    <span style={{ whiteSpace: 'pre-line' }}> {detailsText}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isClient && isCalender && (
          <div style={{ height: '80vh', marginTop: '1rem' }}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              popup
              tooltipAccessor={(event: MyEvent) => event.resource.join('\n')}
              view={view}
              onView={(newView) => setView(newView)}
              date={date}
              onNavigate={(newDate) => setDate(newDate)}
              onSelectEvent={(event: MyEvent) => setSelectedEvent(event)}
            />
          </div>
        )}
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
            <p className="text-gray-700 mb-2" style={{ whiteSpace: 'pre-line' }}>
              <strong>Details:</strong> {selectedEvent.resource.join('\n')}
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
