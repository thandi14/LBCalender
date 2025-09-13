
'use client';

import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import 'pdfjs-dist/legacy/build/pdf.worker.mjs'


export default function Calendar() {
  const [assignments, setAssignments] = useState<{ title: string; date: string; topics: string; details: string }[]>([]);

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
    </div>
  );
}
