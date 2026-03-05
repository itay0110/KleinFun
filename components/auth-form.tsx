"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useKleinFun } from "@/lib/state";

const PHONE_PREFIX = "+972";

export function AuthForm() {
  const { registerUser } = useKleinFun();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPhone = `${PHONE_PREFIX} ${phoneNumber.trim()}`.trim();
  const disabled = !name.trim() || !phoneNumber.trim() || loading;

  const handleContinue = async () => {
    if (disabled) return;
    setError(null);
    setLoading(true);
    try {
      await registerUser({ name: name.trim(), phone: fullPhone });
    } catch (_err) {
      setError("Something went wrong while saving your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center">
      <Card className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">KleinFun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lightweight planning with just your name and phone.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Name
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="גמל"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Phone
            </label>
            <div className="flex gap-2">
              <div className="flex w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-700">
                <span aria-hidden>🇮🇱</span>
                <span>{PHONE_PREFIX}</span>
              </div>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="50 123 4567"
                className="flex-1"
              />
            </div>
          </div>
        </div>
        <Button className="w-full" disabled={disabled} onClick={handleContinue}>
          {loading ? "Continuing..." : "Continue"}
        </Button>
        {error && (
          <p className="text-[11px] text-rose-500">
            {error}
          </p>
        )}
        <p className="text-[11px] leading-snug text-slate-400">
          No passwords, no emails. Just mock local data on this device.
        </p>
      </Card>
    </div>
  );
}

