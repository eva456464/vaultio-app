"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/server/actions/billing";

/** Opens Stripe's customer portal (all of the workspace's subscriptions, payment methods and invoices). */
export function PortalButton({ label }: { label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await openBillingPortal();
            if ("error" in result) setError(result.error);
            else if ("url" in result) window.location.href = result.url;
          })
        }
      >
        {label}
      </Button>
      {error && <span className="text-xs text-[#9A3412]">{error}</span>}
    </span>
  );
}
