
import { NextResponse } from 'next/server';

export async function POST() {
  const data = [
    { title: "Homework 1", dueDate: "2025-09-15" },
    { title: "Exam 1", dueDate: "2025-09-20" }
  ];

  return NextResponse.json(data);
}

export async function GET() {
  const data = [
    { title: "Homework 1", dueDate: "2025-09-15" },
    { title: "Exam 1", dueDate: "2025-09-20" }
  ];

  return NextResponse.json(data);
}
