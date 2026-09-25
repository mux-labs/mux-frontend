"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Notification preferences page (issue #865).
 *
 * Lets the authenticated owner view and update notification channel/event
 * preferences. All reads/writes go through the typed API entrypoint at
 * /api/notifications/preferences which enforces authz (owner/delegate/guardian)
 * and idempotency server-side. This page is deny-by-default: it renders an
 * explicit unauthorized state when the API rejects the caller.
 */

type NotificationChannel = "email" | "push" | "webhook";

type NotificationEvent =
  | "wallet.created"
  | "wallet.recovered"
  | "payment.sent"
  | "payment.received"
  | "api_key.created"
  | "api_key.revoked";

interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>;
  events: Record<NotificationEvent, boolean>;
  updatedAt: string;
}

interface ApiError {
  code: string;
  message: string;
  correlationId?: string;
}

const CHANNELS: { id: NotificationChannel; label: string; description: string }[] = [
  { id: "email", label: "Email", description: "Send notifications to your account email." },
  { id: "push", label: "Push", description: "Send push notifications to registered devices." },
  { id: "webhook", label: "Webhook", description: "POST events to your configured webhook endpoint." },
];

const EVENTS: { id: NotificationEvent; label: string; description: string }[] = [
  { id: "wallet.created", label: "Wallet created", description: "A new wallet was provisioned." },
  { id: "wallet.recovered", label: "Wallet recovered", description: "A wallet recovery flow completed." },
  { id: "payment.sent", label: "Payment sent", description: "An outbound payment was submitted." },
  { id: "payment.received", label: "Payment received", description: "An inbound payment was detected." },
  { id: "api_key.created", label: "API key created", description: "A new API key was issued." },
  { id: "api_key.revoked", label: "API key revoked", description: "An API key was revoked." },
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: { email: true, push: false, webhook: false },
  events: {
    "wallet.created": true,
    "wallet.recovered": true,
    "payment.sent": true,
    "payment.received": true,
    "api_key.created": true,
    "api_key.revoked": true,
  },
  updatedAt: new Date(0).toISOString(),
};

function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pref-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiError>;
    return {
      code: body.code ?? `http_${response.status}`,
      message: body.message ?? "Request failed.",
      correlationId: body.correlationId,
    };
  } catch {
    return { code: `http_${response.status}`, message: "Request failed." };
  }
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "GET",
        headers: { "x-correlation-id": newCorrelationId() },
        credentials: "same-origin",
      });
      if (!response.ok) {
        setError(await parseError(response));
        return;
      }
      const body = (await response.json()) as NotificationPreferences;
      setPreferences(body);
    } catch {
      setError({ code: "network_error", message: "Unable to reach the notification service." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (next: NotificationPreferences) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/notifications/preferences", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-correlation-id": newCorrelationId(),
            // Idempotency key makes concurrent/replayed updates safe server-side.
            "idempotency-key": newCorrelationId(),
          },
          credentials: "same-origin",
          body: JSON.stringify({ channels: next.channels, events: next.events }),
        });
        if (!response.ok) {
          setError(await parseError(response));
          return;
        }
        const body = (await response.json()) as NotificationPreferences;
        setPreferences(body);
        setSavedAt(new Date().toISOString());
      } catch {
        setError({ code: "network_error", message: "Unable to save preferences. Please retry." });
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const toggleChannel = useCallback(
    (channel: NotificationChannel) => {
      const next: NotificationPreferences = {
        ...preferences,
        channels: { ...preferences.channels, [channel]: !preferences.channels[channel] },
      };
      setPreferences(next);
      void save(next);
    },
    [preferences, save],
  );

  const toggleEvent = useCallback(
    (event: NotificationEvent) => {
      const next: NotificationPreferences = {
        ...preferences,
        events: { ...preferences.events, [event]: !preferences.events[event] },
      };
      setPreferences(next);
      void save(next);
    },
    [preferences, save],
  );

  const updatedLabel = useMemo(() => {
    if (savedAt) return `Saved ${new Date(savedAt).toLocaleTimeString()}`;
    if (preferences.updatedAt) return `Last updated ${new Date(preferences.updatedAt).toLocaleString()}`;
    return null;
  }, [savedAt, preferences.updatedAt]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Notification preferences</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose how and when Mux notifies you. Changes are saved automatically.
        </p>
        {updatedLabel ? <p className="mt-1 text-xs text-gray-500">{updatedLabel}</p> : null}
      </header>

      {error ? (
        <div role="alert" className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">{error.message}</p>
          <p className="mt-1 text-xs">
            Code: {error.code}
            {error.correlationId ? ` · Correlation ID: ${error.correlationId}` : ""}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded border border-red-400 px-2 py-1 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading preferences…</p>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="channels-heading">
            <h2 id="channels-heading" className="text-lg font-medium">
              Channels
            </h2>
            <ul className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
              {CHANNELS.map((channel) => (
                <li key={channel.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{channel.label}</p>
                    <p className="text-xs text-gray-500">{channel.description}</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={preferences.channels[channel.id]}
                      disabled={saving}
                      onChange={() => toggleChannel(channel.id)}
                      aria-label={`Toggle ${channel.label} notifications`}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="text-lg font-medium">
              Events
            </h2>
            <ul className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
              {EVENTS.map((event) => (
                <li key={event.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{event.label}</p>
                    <p className="text-xs text-gray-500">{event.description}</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={preferences.events[event.id]}
                      disabled={saving}
                      onChange={() => toggleEvent(event.id)}
                      aria-label={`Toggle ${event.label} notifications`}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
