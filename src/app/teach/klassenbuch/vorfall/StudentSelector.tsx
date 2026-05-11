"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

interface Student {
  id: string;
  name: string;
}

interface ClassEntry {
  id: string;
  name: string;
  students: Student[];
}

interface StudentSelectorProps {
  classes: ClassEntry[];
}

export function StudentSelector({ classes }: StudentSelectorProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const students = selectedClass?.students ?? [];

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="classId">Klasse</Label>
        <select
          id="classId"
          name="classId"
          required
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
        >
          <option value="">Klasse wählen…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="studentId">Schüler/in</Label>
        <select
          id="studentId"
          name="studentId"
          required
          disabled={students.length === 0}
          className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none disabled:opacity-50"
        >
          <option value="">
            {selectedClassId
              ? students.length === 0
                ? "Keine Schüler in dieser Klasse"
                : "Schüler/in wählen…"
              : "Erst Klasse wählen…"}
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
