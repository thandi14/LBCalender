
import { NextResponse } from 'next/server';
import OpenAI from "openai";


export const runtime = "nodejs";


export async function GET() {
  const data = [
    { title: "Homework 1", dueDate: "2025-09-15" },
    { title: "Exam 1", dueDate: "2025-09-20" }
  ];

  return NextResponse.json(data);
}

export interface Syllabus {
  title: string;
  date: string;
  topics: string;
  details: string;
}

export interface Parser {
  text: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkText(text: string, chunkSize = 2000) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function extractTerm(text: string): string | null {
  const match = text.match(/\b(Fall|Spring|Summer|Winter)\s+(\d{4})\b/i);
  return match ? `${match[1]} ${match[2]}` : null;
}

function getCalendarWeek(dateStr: string): number {
  const date = new Date(dateStr);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24);

  return Math.floor((pastDaysOfYear + firstDayOfYear.getDay()) / 7) + 1;
}

// function normalizeDetails(details: string | string[]): string {
//   let text = "";

//   if (Array.isArray(details)) {
//     text = details.join(" ");
//   } else if (typeof details === "string") {
//     text = details;
//   } else {
//     return "";
//   }

//   const hasBullets = text.includes("•");

//   if (hasBullets) {
//     text = text.replace(/(^|\S)\s*•/g, "$1\n•");
//   } else {
//     text = text.replace(/;\s*/g, ";\n");
//   }

//   const parts = text
//     .split("\n")
//     .map(t => t.trim())
//     .filter(Boolean);

//   return parts.join("\n");
// }







export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string = body.text;
    const pdfTerm = extractTerm(text) || "Fall 2025";
    console.log("server side syllabus text:", text);

    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "No syllabus text provided" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);

    let assignments: Syllabus[] = [];

    for (const chunk of chunks) {

      console.log("server side:", chunk)
      const completion = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `You are an assistant that extracts a full class schedule from a syllabus.

                Syllabus term: ${pdfTerm}  // e.g., "Fall 2021"

                Dates in the syllabus may appear in short or long formats, such as:
                - Aug. 17
                - Aug 17
                - August 17

                From the text below, extract EVERY class meeting with:
                - date (in YYYY-MM-DD format)
                - class number or week
                - topics covered
                - readings or materials listed

                IMPORTANT:
                - If the syllabus uses bullet points (•), ENSURE each bullet point is on its own line in the output.
                - If bullets are mashed up or bullets and line breaks are missing, INSERT line breaks so each bullet is on its own line.
                - FIX spacing errors inside words and between words (e.g., "Sa mple Motion s" → "Sample Motions").
                - Preserve each bullet character (•), slashes (/), semicolons (;), and dashes (– or -).
                - Keep an empty line between bullets in the "details" array for readability.
                - Do NOT paraphrase or summarize bullet points — just fix spacing and line breaks and copy text as is.
                - Do NOT combine bullets or collapse lines.
                - Do NOT create a new object unless a new class date is present.
                - If multiple bullet points appear on the same line, insert a line break so each bullet point starts on its own line.
                - For example, this:
                  "• Item one • Item two"
                  should become:
                  "• Item one"

                  "• Item two"
                - Treat any day-of-week prefix (M, T, W, Th, F, Mon, Tue, Wed, Thu, Fri) as a separate class date.
                - If multiple day prefixes appear on the same line or paragraph, split them into separate class objects.
                - If the assignment does not have a separate topic, return topics as an empty string ("") rather than copying details.



                Return ONLY as a JSON array with this format:
                [
                {
                  "date": "YYYY-MM-DD",
                  "title": "Class 1 (Week 1)",
                  "topics": "Introduction, course expectations",
                  "details": [
                    "Our Constitution and Form of Government (A Primer)",
                    "R. Beeman, The Constitutional Convention of 1787: A Revolution in Government",
                    "How to Read Our Constitution...",
                    "U.S. Constitution, Article ..."
                  ]
                }
                ]

                Syllabus text:
                ${chunk}
                `,
      });

      let raw = completion.output_text ?? "[]";
      raw = raw.replace(/```json|```/g, "").trim();



      try {
        const parsed = JSON.parse(raw) as Syllabus[];
        // parsed.forEach(entry => {
        //   if (entry.details) {
        //     entry.details = normalizeDetails(entry.details);
        //   }
        // });
        assignments.push(...parsed);
      } catch (err) {
        console.error("Failed to parse JSON:", raw, err);
      }
    }

    if (assignments.length > 0) {
      let currentWeekNumber = 1;
      let lastClassWeek = getCalendarWeek(assignments[0].date);

      assignments.forEach((cls, i) => {
        const clsWeek = getCalendarWeek(cls.date);

        if (clsWeek > lastClassWeek) {
          currentWeekNumber++;
        }

        cls.title = `Class ${i + 1} (Week ${currentWeekNumber})`;
        lastClassWeek = clsWeek;
      });
    }


    return NextResponse.json({ assignments });
  } catch (err: any) {
    console.error("Error in POST /parse-pdf:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
