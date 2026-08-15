import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Globe, Save } from "lucide-react";

const DOMAIN_STORAGE_KEY = "mun-apex-custom-domain";

/** DNS rows shown in the mapping table. Values are the general notation —
 *  the exact targets appear in the Freebuff dashboard after publishing. */
const DNS_ROWS = [
  {
    type: "CNAME",
    name: "www",
    value: "[your-app].freebuff.dev",
    note: "Points the www subdomain to your live Freebuff deployment.",
  },
  {
    type: "A Record",
    name: "@",
    value: "[platform-ip]",
    note: "Points the apex (root) domain — exact IP shown after publish.",
  },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied to clipboard.");
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Clipboard unavailable in this browser.");
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-card/60 p-5 sm:p-6">
      <h2 className="eyebrow text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProductionSettings() {
  const [domain, setDomain] = useState("");

  useEffect(() => {
    setDomain(localStorage.getItem(DOMAIN_STORAGE_KEY) ?? "");
  }, []);

  const saveDomain = () => {
    const clean = domain.trim().toLowerCase();
    if (!clean) {
      localStorage.removeItem(DOMAIN_STORAGE_KEY);
      toast.success("Custom domain cleared.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) {
      toast.error("Enter a valid domain, e.g. debate.yourname.in");
      return;
    }
    localStorage.setItem(DOMAIN_STORAGE_KEY, clean);
    toast.success(`Custom domain saved: ${clean}`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Masthead */}
        <div className="border-b border-white/10 pb-6">
          <p className="eyebrow text-accent">Production</p>
          <h1 className="mt-1.5 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            Production Settings
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Publish the app to a permanent live URL, then map a premium
            budget-friendly domain (₹100 .in or .com from Hostinger or
            GoDaddy) to it.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {/* Live endpoints */}
          <Section title="Live endpoints">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Backend (Convex) — live
                  </p>
                  <p className="mt-1 break-all font-mono text-[12.5px] text-foreground">
                    {import.meta.env.VITE_CONVEX_URL}
                  </p>
                </div>
                <CopyButton text={import.meta.env.VITE_CONVEX_URL} />
              </div>
              <p className="text-[12px] leading-5 text-muted-foreground">
                The frontend is served from your Freebuff project preview. To
                get the permanent{" "}
                <span className="font-mono text-foreground">.freebuff.dev</span>{" "}
                URL, open the Freebuff project dashboard and hit{" "}
                <span className="text-foreground">Publish</span>. That URL is
                what you point your domain at — steps below.
              </p>
            </div>
          </Section>

          {/* Custom domain mapping */}
          <Section title="Custom Domain Mapping">
            <label
              htmlFor="custom-domain"
              className="text-[13px] font-medium text-foreground"
            >
              Custom domain
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="custom-domain"
                  type="text"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveDomain();
                  }}
                  placeholder="debate.yourname.in"
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent/50 focus:bg-white/[0.05]"
                />
              </div>
              <button
                type="button"
                onClick={saveDomain}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Save className="size-3.5" />
                Save mapping
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              Saved locally on this device. The domain is linked in the
              Freebuff dashboard once you've added the DNS records below.
            </p>

            {/* DNS notation */}
            <div className="mt-5 overflow-hidden rounded-xl border border-white/8">
              <div className="grid grid-cols-[64px_1fr_1.2fr_auto] gap-2 border-b border-white/8 bg-white/[0.03] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>Type</span>
                <span>Name / Host</span>
                <span>Value</span>
                <span />
              </div>
              {DNS_ROWS.map((row) => (
                <div
                  key={row.type}
                  className="grid grid-cols-[64px_1fr_1.2fr_auto] items-center gap-2 border-b border-white/5 px-4 py-3 last:border-b-0"
                >
                  <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-center font-mono text-[11px] font-bold text-accent">
                    {row.type}
                  </span>
                  <span className="font-mono text-[12.5px] text-foreground">
                    {row.name}
                  </span>
                  <span className="break-all font-mono text-[12px] text-muted-foreground">
                    {row.value}
                  </span>
                  <CopyButton text={row.value} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
              Notation instructions: after publishing, replace the bracketed
              placeholders with the exact values from your Freebuff project
              dashboard. Add both records at your registrar (Hostinger /
              GoDaddy → DNS settings), then enter the custom domain above and
              confirm the link in Freebuff. Propagation takes 5 minutes to 24
              hours.
            </p>
          </Section>

          {/* Registrar guide */}
          <Section title="Buying the domain (₹100 .in / .com)">
            <ol className="flex list-none flex-col gap-3">
              {[
                "Purchase the domain at Hostinger or GoDaddy — .in domains start around ₹100/year.",
                "Open DNS settings and add the CNAME and A Record rows exactly as shown above.",
                "Wait for propagation, then open the Freebuff dashboard and link the domain to your published app.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-[13px] leading-6">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://www.hostinger.in/domain-name-search"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent transition-opacity hover:opacity-80"
            >
              Search domains at Hostinger
              <ExternalLink className="size-3.5" />
            </a>
          </Section>
        </div>
      </div>
    </div>
  );
}
