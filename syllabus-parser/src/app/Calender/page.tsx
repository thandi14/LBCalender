
'use client';

import { useState } from 'react';

export default function Calendar() {
  const [assignments, setAssignments] = useState<{ title: string; dueDate: string }[]>([]);

  const fetchAssignments = async () => {
    const res = await fetch('/api', { method: 'GET' });
    const data = await res.json();
    setAssignments(data);
  };

  console.log(assignments)

  return (
    <div>
      <h1>My Calendar dummy</h1>
      <button onClick={fetchAssignments}>Load Assignments</button>
      <ul>
        {assignments.map((a, i) => (
          <li key={i}>
            {a.title} - {a.dueDate}
          </li>
        ))}
      </ul>
    </div>
  );
}
