"use client";

import { useMemo, useState } from "react";
import { UIInput } from "@/components/ui/input";

type Template = {
  id: string;
  title: string;
  body: (vars: Record<string, string>) => string;
  extraVars?: { key: string; label: string; placeholder: string }[];
};

const TEMPLATES: Template[] = [
  {
    id: "welcome",
    title: "Welcome Message",
    body: ({ clientName, agentName }) => `Dear ${clientName || "[Client Name]"},

I hope you're doing well!

At More Homes Group, we're dedicated to elevating the Rental Experience for Landlords and Tenants Alike. Whether you're looking for shared or individual accommodation, we offer tailored options to suit your lifestyle and preferences.

Thank you for choosing More Homes Group. We're excited to help you find your ideal home!

Best regards,
${agentName} (Property Letting Expert)
More Homes Group
🌐 www.morehomesgroup.co.uk
📞 0203 355 1412
📍 31 Pepper Street, Canary Wharf, London`,
  },
  {
    id: "enquiry",
    title: "Tenant Enquiry Form",
    body: ({ clientName, agentName }) => `Dear ${clientName || "[Client Name]"},

Thank you for your interest in More Homes Group Ltd! To help us find the ideal accommodation for you, we'd love to get some more details. Could you kindly provide the following information?

Full Name:
Email Address:
Accommodation Type: (Separate/Shared)
Room Type: (e.g., single, double, etc.)
Number of Occupants: (Single/Couple)
Number of Children:
On DSS: (Yes/No)
Age:
Gender:
Country Of Origin:
Nationality:
Currently Employed: (Yes/No)
Annual Income:
Current Living Postcode:
Workplace Postcode:
Maximum Budget:
Working Profession:
Move-In Date:

This information will help us tailor our search and offer you the best accommodation options. Looking forward to assisting you!

Best regards,
${agentName} (Property Letting Expert)
More Homes Group Ltd
📍 31 Pepper Street, Canary Wharf, London
📞 0203 355 1412
🌐 www.morehomesgroup.co.uk`,
  },
  {
    id: "viewing",
    title: "Viewing Confirmation",
    extraVars: [
      { key: "viewingDateTime", label: "Date & Time", placeholder: "e.g. 31-01-2026 at 5:00 pm" },
      { key: "propertyAddress", label: "Property Address", placeholder: "e.g. 297 Preston Road, Harrow, HA3 0QQ" },
    ],
    body: ({ clientName, agentName, viewingDateTime, propertyAddress }) => `Hi ${clientName || "[Client Name]"},

This is to confirm your viewing appointment for the property.

Viewing Details:

Date & Time: ${viewingDateTime || "[Date & Time]"}

Property Address: ${propertyAddress || "[Property Address]"}

Best regards,
${agentName}
Property Letting Expert
More Homes Group Ltd
📞 0203 355 1412
🌐 www.morehomesgroup.co.uk`,
  },
  {
    id: "documents",
    title: "Document Request",
    body: ({ clientName, agentName }) => `Dear ${clientName || "[Client Name]"},

Please provide the following information via email at info@morehomesgroup.co.uk at your earliest convenience.

• National Insurance Number (NI)
• Passport
• eVisa
• Right to Rent Share Code
• Last Three Months' Bank Statements
• Last Three Months' Payslips
• Job Offer Letter / University Offer Letter

These documents are essential for us to complete the verification process and ensure a smooth tenancy agreement. Please let us know if you need assistance or have any questions about the requested documents.

Thank you for your cooperation.

Best regards,
${agentName}
Property Letting Expert
More Homes Group Ltd
📞 0203 355 1412
🌐 www.morehomesgroup.co.uk`,
  },
];

type Props = {
  agentName: string;
};

export function TemplatesClient({ agentName }: Props) {
  const [clientName, setClientName] = useState("");
  const [extraVars, setExtraVars] = useState<Record<string, Record<string, string>>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function getVars(template: Template): Record<string, string> {
    return {
      clientName,
      agentName,
      ...(extraVars[template.id] ?? {}),
    };
  }

  async function handleCopy(template: Template) {
    const text = template.body(getVars(template));
    await navigator.clipboard.writeText(text);
    setCopied(template.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function setExtraVar(templateId: string, key: string, value: string) {
    setExtraVars((prev) => ({
      ...prev,
      [templateId]: { ...(prev[templateId] ?? {}), [key]: value },
    }));
  }

  const filledTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => template.body(getVars(template)).trim().length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, extraVars, agentName]);

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Message studio
            </p>
            <h1 className="page-title">Message Templates</h1>
            <p className="page-subtitle">
              Fill in a client name once, preview the message, and copy a polished template instantly.
            </p>
          </div>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Templates</p>
            <p className="stat-value">{TEMPLATES.length}</p>
            <p className="stat-sub">Pre-built responses ready to copy</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Ready to send</p>
            <p className="stat-value">{filledTemplates.length}</p>
            <p className="stat-sub">Currently populated previews</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Personalisation</p>
            <p className="stat-value">{clientName.trim() ? 1 : 0}</p>
            <p className="stat-sub">Client name applied across templates</p>
          </article>
        </div>
      </header>

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Global context</h2>
          <span className="badge badge-active">Shared variables</span>
        </div>
        <label className="field" style={{ maxWidth: "420px", marginBottom: 0 }}>
          <span className="label" style={{ fontWeight: 700 }}>
            Client Name
          </span>
          <UIInput
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Iris, Christina, John..."
            autoFocus
          />
          <span className="hint-text">Applied to every template preview automatically.</span>
        </label>
      </section>

      <div className="stack">
        {TEMPLATES.map((template) => {
          const vars = getVars(template);
          const preview = template.body(vars);
          const isCopied = copied === template.id;

          return (
            <article key={template.id} className="dialer-card">
              <div className="dialer-card-head">
                <div>
                  <h2 className="dialer-card-title">{template.title}</h2>
                  <p className="dialer-agent-meta" style={{ marginTop: "0.35rem" }}>
                    Ready to copy with the current client context
                  </p>
                </div>

                <button
                  onClick={() => void handleCopy(template)}
                  className={`btn ${isCopied ? "btn-secondary" : "btn-primary"} btn-sm`}
                >
                  {isCopied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="dialer-dialer-wrap">
                {template.extraVars && template.extraVars.length > 0 && (
                  <div className="field-grid-2">
                    {template.extraVars.map((v) => (
                      <label key={v.key} className="field">
                        <span className="label">{v.label}</span>
                        <UIInput
                          value={extraVars[template.id]?.[v.key] ?? ""}
                          onChange={(e) => setExtraVar(template.id, v.key, e.target.value)}
                          placeholder={v.placeholder}
                        />
                      </label>
                    ))}
                  </div>
                )}

                <pre
                  style={{
                    margin: 0,
                    fontFamily: "inherit",
                    fontSize: "0.84rem",
                    lineHeight: 1.75,
                    color: "var(--text-muted)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "0.85rem",
                    padding: "1rem 1.1rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  {preview}
                </pre>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}