
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



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string = body.text;
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

                From the text below, extract EVERY class meeting with:
                - date (if listed)
                - class number or week
                - topics covered
                - readings or materials listed

                Return ONLY as a JSON array with this format:
                [
                {
                  "date": "2021-08-24",
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
        assignments.push(...parsed);
      } catch (err) {
        console.error("Failed to parse JSON:", raw, err);
      }
    }

    return NextResponse.json({ assignments });
  } catch (err: any) {
    console.error("Error in POST /parse-pdf:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
