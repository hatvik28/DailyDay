"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface JournalEditorProps {
  date: string;
  journalText: string;
  onUpdate: () => void;
}

export default function JournalEditor({ date, journalText, onUpdate }: JournalEditorProps) {
  const [text, setText] = useState(journalText);
  const [prevJournalText, setPrevJournalText] = useState(journalText);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(journalText);

  if (journalText !== prevJournalText) {
    setPrevJournalText(journalText);
    setText(journalText);
    lastSavedRef.current = journalText;
  }

  const save = useCallback(
    async (value: string) => {
      if (value === lastSavedRef.current) return;

      setSaveStatus("saving");
      try {
        const res = await fetch("/api/journal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, journalText: value }),
        });
        if (!res.ok) throw new Error("Failed to save journal");
        lastSavedRef.current = value;
        setSaveStatus("saved");
        onUpdate();
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    },
    [date, onUpdate]
  );

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(value), 1500);
    },
    [save]
  );

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(text);
  }, [save, text]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Write about your day…"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        rows={6}
        className="resize-y"
      />
      <p
        className={cn(
          "text-xs transition-opacity",
          saveStatus === "idle"
            ? "opacity-0"
            : "text-zinc-500 opacity-100 dark:text-zinc-400"
        )}
      >
        {saveStatus === "saving" && "Saving…"}
        {saveStatus === "saved" && "Saved"}
      </p>
    </div>
  );
}
