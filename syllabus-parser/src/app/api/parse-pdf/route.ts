
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
  details: string;
}

export interface Parser {
  text: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });




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

    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `You are a helpful assistant. Extract **all assignments, quizzes, and exams** from the syllabus below.
      Return the data ONLY as a JSON array with this format:
      [
        {
          "title": "Assignment title",
          "date": "YYYY-MM-DD or descriptive",
          "details": "Any extra info about the assignment"
        }
      ]

      Do NOT include reading chapters, class prep, or general notes. Include every graded item mentioned.

      Syllabus text:${text}
      `,
    });

    // @ts-ignore: typings are weird here
    let raw = completion.output_text ?? "[]";

    raw = raw.replace(/```json|```/g, "").trim();

    console.log(raw)

    let assignments: Syllabus[] = [];
    try {
      assignments = JSON.parse(raw) as Syllabus[];
    } catch (err) {
      console.error("Failed to parse JSON:", raw, err);
      assignments = [];
    }

    return NextResponse.json({ assignments });
  } catch (err: any) {
    console.error("Error in POST /parse-pdf:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
