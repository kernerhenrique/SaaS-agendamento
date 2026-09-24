"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({
  token,
  onSubmitted,
}: {
  token: string;
  onSubmitted: (review: { rating: number; comment: string | null }) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível enviar a avaliação");
        return;
      }
      onSubmitted({ rating, comment: comment || null });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3 rounded-lg border p-4" onSubmit={handleSubmit}>
      <p className="font-medium">Como foi o atendimento?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
            className="text-2xl"
            style={{ color: value <= rating ? "#f59e0b" : "var(--muted-foreground)" }}
            onClick={() => setRating(value)}
          >
            ★
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="comment">Comentário (opcional)</Label>
        <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
