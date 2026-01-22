import { ApiKeysTable } from "@/components/dashboard/ApiKeysTable";

export default function ApiKeysPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your account settings, API keys, and developer preferences.
          </p>
        </div>

        <div className="grid gap-8">
          <ApiKeysTable />

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Usage Policy
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
              All API keys are subject to our developer usage policy. Please
              ensure you keep your secret keys secure and never share them in
              client-side code or public repositories.
            </p>
            <a
              href="#"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline inline-flex items-center gap-1"
            >
              Read documentation
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
