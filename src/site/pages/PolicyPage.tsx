import { useMemo } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import { WHATSAPP_NUMBER, WHATSAPP_NUMBER_DISPLAY } from "@/site/lib/constants";

// ---------- Block model ----------
type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "h3"; text: string }
  | { type: "callout"; tone?: "info" | "warning"; title?: string; text: string }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
      note?: string;
    };

interface Section {
  id: string;
  heading: string;
  blocks: Block[];
}

interface PolicyProps {
  title: string;
  eyebrow?: string;
  description: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
  contact: {
    email: string;
    addressLines: string[];
  };
  related: { label: string; href: string }[];
  canonicalPath: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------- Inline formatter (handles **bold** + [text](url)) ----------
function renderInline(text: string) {
  // Split by markdown link first
  const parts: Array<string | JSX.Element> = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = linkRe.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const href = m[2];
    const isExternal = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
    parts.push(
      isExternal ? (
        <a key={`l${key++}`} href={href} className="text-blaze underline underline-offset-2 hover:text-blaze/80" target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
          {m[1]}
        </a>
      ) : (
        <Link key={`l${key++}`} to={href} className="text-blaze underline underline-offset-2 hover:text-blaze/80">
          {m[1]}
        </Link>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  // Then bold within string parts
  return parts.flatMap((p, i) => {
    if (typeof p !== "string") return [p];
    const out: Array<string | JSX.Element> = [];
    const boldRe = /\*\*([^*]+)\*\*/g;
    let l = 0;
    let bm: RegExpExecArray | null;
    let k = 0;
    while ((bm = boldRe.exec(p))) {
      if (bm.index > l) out.push(p.slice(l, bm.index));
      out.push(
        <strong key={`b${i}-${k++}`} className="font-semibold text-abyss">
          {bm[1]}
        </strong>,
      );
      l = bm.index + bm[0].length;
    }
    if (l < p.length) out.push(p.slice(l));
    return out;
  });
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <p className="font-body text-[15px] leading-[1.75] text-ink/75">{renderInline(block.text)}</p>
      );
    case "h3":
      return (
        <h3 className="font-display font-bold text-[17px] text-abyss mt-2">{block.text}</h3>
      );
    case "ul":
      return (
        <ul className="space-y-2.5 pl-1">
          {block.items.map((it, i) => (
            <li key={i} className="font-body text-[15px] leading-[1.7] text-ink/75 flex gap-3">
              <span className="mt-[10px] inline-block w-1.5 h-1.5 rounded-full bg-blaze flex-shrink-0" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-2.5 list-none counter-reset-policy">
          {block.items.map((it, i) => (
            <li key={i} className="font-body text-[15px] leading-[1.7] text-ink/75 flex gap-3">
              <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blaze/10 text-blaze text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
    case "callout": {
      const tone = block.tone ?? "info";
      const styles =
        tone === "warning"
          ? "bg-blaze/5 border-blaze/30"
          : "bg-lagoon/5 border-lagoon/30";
      return (
        <div className={`rounded-xl border ${styles} p-4 sm:p-5`}>
          {block.title && (
            <div className="font-display font-bold text-[15px] text-abyss mb-1.5 flex items-center gap-2">
              <span aria-hidden>{tone === "warning" ? "⚠️" : "ℹ️"}</span>
              {block.title}
            </div>
          )}
          <p className="font-body text-[14.5px] leading-[1.7] text-ink/80">
            {renderInline(block.text)}
          </p>
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-ink/10">
          <table className="w-full text-left">
            <thead className="bg-drift">
              <tr>
                {block.headers.map((h) => (
                  <th key={h} className="font-display font-bold text-[13px] uppercase tracking-wider text-abyss px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-ink/10">
                  {r.map((c, j) => (
                    <td key={j} className="font-body text-[14.5px] text-ink/80 px-4 py-3">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.note && (
            <p className="font-body text-[13px] text-ink/55 italic px-4 py-2.5 border-t border-ink/10 bg-drift/50">
              {block.note}
            </p>
          )}
        </div>
      );
  }
}

// ---------- Page shell ----------
function PolicyPage(props: PolicyProps) {
  const { title, eyebrow, description, lastUpdated, intro, sections, contact, related, canonicalPath } = props;

  const tocItems = useMemo(
    () => sections.map((s) => ({ id: s.id || slug(s.heading), label: s.heading })),
    [sections],
  );

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: title,
          description,
          url: `https://adventourist.in${canonicalPath}`,
          dateModified: lastUpdated,
          isPartOf: { "@type": "WebSite", name: "Adventourist", url: "https://adventourist.in" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://adventourist.in/" },
            { "@type": "ListItem", position: 2, name: title, item: `https://adventourist.in${canonicalPath}` },
          ],
        },
      ],
    }),
    [title, description, canonicalPath, lastUpdated],
  );

  return (
    <SiteLayout title={`${title} | Adventourist`} description={description} jsonLd={jsonLd}>
      {/* Hero */}
      <section className="bg-gradient-to-b from-drift to-white border-b border-ink/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <nav className="font-body text-[13px] text-ink/60 mb-5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-blaze">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-abyss font-medium">{title}</span>
          </nav>
          {eyebrow && (
            <span className="inline-block font-display text-[11px] font-bold tracking-[0.18em] uppercase text-blaze bg-blaze/10 px-3 py-1.5 rounded-full mb-4">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-abyss leading-[1.05] tracking-tight max-w-3xl">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 font-body text-[14px] text-ink/60">
            <span>Last updated: <span className="text-abyss font-medium">{lastUpdated}</span></span>
            <span className="hidden sm:inline">·</span>
            <span>~{Math.max(3, Math.round(sections.length * 1.2))} min read</span>
          </div>
          <p className="font-body text-[16px] sm:text-[17px] leading-[1.7] text-ink/70 mt-6 max-w-3xl">
            {intro}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-14">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="font-display text-[11px] font-bold tracking-[0.18em] uppercase text-ink/50 mb-3">
                On this page
              </p>
              <ul className="space-y-1.5 border-l border-ink/10 pl-4">
                {tocItems.map((t, i) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="block font-body text-[13.5px] text-ink/65 hover:text-blaze leading-snug py-1"
                    >
                      <span className="text-ink/40 mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Content */}
          <article className="min-w-0 max-w-3xl">
            {sections.map((s, idx) => {
              const id = s.id || slug(s.heading);
              return (
                <section key={id} id={id} className="scroll-mt-24 mb-10 lg:mb-12">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="font-display text-[13px] font-bold text-blaze tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-display font-black text-2xl sm:text-[28px] text-abyss leading-tight">
                      {s.heading}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {s.blocks.map((b, i) => (
                      <BlockRenderer key={i} block={b} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Contact card */}
            <div className="mt-12 rounded-2xl bg-abyss text-white p-6 sm:p-8">
              <h2 className="font-display font-black text-2xl mb-2">Questions about this policy?</h2>
              <p className="font-body text-[15px] text-white/75 leading-relaxed mb-5">
                We're real humans in Mumbai. Reach out and we'll respond within 2 hours, Mon–Sat.
              </p>
              <div className="grid sm:grid-cols-2 gap-5 font-body text-[14.5px] text-white/85 mb-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1.5">Email</div>
                  <a href={`mailto:${contact.email}`} className="text-horizon hover:text-horizon/80 underline-offset-2 hover:underline">
                    {contact.email}
                  </a>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1.5">WhatsApp</div>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-horizon hover:text-horizon/80 underline-offset-2 hover:underline">
                    +91 9930 4006 94
                  </a>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1.5">Office</div>
                  <address className="not-italic leading-relaxed">
                    {contact.addressLines.map((l) => (
                      <div key={l}>{l}</div>
                    ))}
                  </address>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1.5">GST</div>
                  <span className="font-mono text-[13px]">27ABMFA3990N1ZQ</span>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1.5">PAN</div>
                  <span className="font-mono text-[13px]">ABMFA3990N</span>
                </div>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I have a question about your ${title.toLowerCase()}. [src:policy_${slug(title)}]`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold text-[14px] px-5 py-3 rounded-full transition-colors"
              >
                <span aria-hidden>💬</span> Chat with us on WhatsApp
              </a>
            </div>

            {/* Related */}
            {related.length > 0 && (
              <div className="mt-10 pt-8 border-t border-ink/10">
                <p className="font-display text-[11px] font-bold tracking-[0.18em] uppercase text-ink/50 mb-3">
                  Related policies
                </p>
                <div className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <Link
                      key={r.href}
                      to={r.href}
                      className="inline-flex items-center font-body text-[14px] text-abyss bg-drift hover:bg-drift/70 px-4 py-2 rounded-full transition-colors"
                    >
                      {r.label} <span className="ml-1.5 text-blaze">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>
      </section>
    </SiteLayout>
  );
}

// ---------- Shared content ----------
const CONTACT_DEFAULT = {
  addressLines: ["1 Madhav Kunj, South Pond Road", "Vile Parle, Mumbai 400056", "Maharashtra, India"],
};

const RELATED_ALL = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Refund & Cancellation", href: "/refund-and-cancellation-policy" },
  { label: "Payment Policy", href: "/payment-policy" },
];
const relatedExcept = (path: string) => RELATED_ALL.filter((r) => r.href !== path);

const LAST_UPDATED = "April 1, 2026";

// ---------- Privacy ----------
export const PrivacyPolicy = () => (
  <PolicyPage
    title="Privacy Policy"
    eyebrow="Legal"
    description="How Adventourist collects, uses, and protects your personal information when planning your trip."
    canonicalPath="/privacy-policy"
    lastUpdated={LAST_UPDATED}
    intro={`At Adventourist ("we," "us," or "our"), we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (adventourist.in) or use our services.`}
    contact={{ email: "privacy@adventourist.in", ...CONTACT_DEFAULT }}
    related={relatedExcept("/privacy-policy")}
    sections={[
      {
        id: "info-we-collect",
        heading: "Information We Collect",
        blocks: [
          { type: "p", text: "We collect information that you provide directly to us, including:" },
          {
            type: "ul",
            items: [
              "**Contact Information:** Name, email address, phone number, and WhatsApp number when you inquire about trips or contact us.",
              "**Travel Preferences:** Destination interests, travel dates, group size, budget range, and special requirements you share with us.",
              "**Identity Documents:** Passport details, visa information, and ID copies required for booking accommodations and transport.",
              "**Payment Information:** Billing details processed securely through our payment partners (we do not store full card numbers).",
              "**Communication Records:** Emails, WhatsApp messages, and call records related to your trip planning and support.",
            ],
          },
          { type: "p", text: "We also automatically collect certain technical information when you visit our website, including IP address, browser type, device information, and pages visited, through cookies and similar technologies." },
        ],
      },
      {
        id: "how-we-use",
        heading: "How We Use Your Information",
        blocks: [
          { type: "p", text: "We use the information we collect to:" },
          {
            type: "ul",
            items: [
              "Process and fulfill your travel bookings and reservations",
              "Communicate with you about your trips, inquiries, and customer service",
              "Send you travel updates, itinerary changes, and important notifications",
              "Personalize your experience and provide tailored recommendations",
              "Process payments and prevent fraudulent transactions",
              "Comply with legal obligations and protect our legal rights",
              "Improve our website, services, and customer experience",
              "Send marketing communications (only with your consent, and you can opt-out anytime)",
            ],
          },
        ],
      },
      {
        id: "info-sharing",
        heading: "Information Sharing",
        blocks: [
          { type: "p", text: "We do not sell your personal information. We may share your information with:" },
          {
            type: "ul",
            items: [
              "**Travel Partners:** Hotels, airlines, transport providers, and local guides necessary to fulfill your bookings.",
              "**Payment Processors:** Secure third-party payment services to process transactions.",
              "**Service Providers:** Technology and support services that help us operate (hosting, analytics, customer support tools).",
              "**Legal Requirements:** When required by law, court order, or to protect our rights and safety.",
            ],
          },
          { type: "p", text: "All third parties are required to maintain the confidentiality and security of your information." },
        ],
      },
      {
        id: "data-security",
        heading: "Data Security",
        blocks: [
          { type: "p", text: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encrypted connections (HTTPS), secure payment processing, and limited access to personal data by authorized personnel only. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security." },
        ],
      },
      {
        id: "data-retention",
        heading: "Data Retention",
        blocks: [
          { type: "p", text: "We retain your personal information for as long as necessary to fulfill the purposes for which it was collected, including legal, accounting, and reporting requirements. Booking records are typically retained for 7 years for compliance purposes. You may request deletion of your data subject to our legal obligations." },
        ],
      },
      {
        id: "your-rights",
        heading: "Your Rights",
        blocks: [
          { type: "p", text: "You have the right to:" },
          {
            type: "ul",
            items: [
              "Access the personal information we hold about you",
              "Request correction of inaccurate information",
              "Request deletion of your data (subject to legal requirements)",
              "Opt-out of marketing communications at any time",
              "Withdraw consent where processing is based on consent",
            ],
          },
          { type: "p", text: "To exercise these rights, contact us at [privacy@adventourist.in](mailto:privacy@adventourist.in)." },
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          { type: "p", text: "Our website uses cookies and similar tracking technologies to enhance your browsing experience, analyze website traffic, and understand user behavior. You can control cookie preferences through your browser settings. Note that disabling certain cookies may affect website functionality." },
        ],
      },
      {
        id: "third-party-links",
        heading: "Third-Party Links",
        blocks: [
          { type: "p", text: "Our website may contain links to third-party websites (hotels, airlines, payment portals). We are not responsible for the privacy practices of these external sites. We encourage you to read the privacy policies of any third-party sites you visit." },
        ],
      },
      {
        id: "childrens-privacy",
        heading: "Children's Privacy",
        blocks: [
          { type: "p", text: "Our services are not directed to children under 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately." },
        ],
      },
      {
        id: "changes",
        heading: "Changes to This Policy",
        blocks: [
          { type: "p", text: 'We may update this Privacy Policy from time to time. The updated version will be indicated by the "Last updated" date at the top of this page. We encourage you to review this policy periodically.' },
        ],
      },
    ]}
  />
);

// ---------- Terms ----------
export const TermsConditions = () => (
  <PolicyPage
    title="Terms & Conditions"
    eyebrow="Legal"
    description="The terms that govern your use of Adventourist's website and travel planning services."
    canonicalPath="/terms-and-conditions"
    lastUpdated={LAST_UPDATED}
    intro={`These Terms and Conditions ("Terms") govern your use of Adventourist's website and travel planning services. By accessing our website or booking services with us, you agree to be bound by these Terms. Please read them carefully.`}
    contact={{ email: "hello@adventourist.in", ...CONTACT_DEFAULT }}
    related={relatedExcept("/terms-and-conditions")}
    sections={[
      {
        id: "definitions",
        heading: "Definitions",
        blocks: [
          {
            type: "ul",
            items: [
              `**"Adventourist," "we," "us," "our"** refers to Adventourist, a travel planning company registered in Mumbai, India.`,
              `**"You," "your," "traveler," "customer"** refers to the individual or entity using our services or website.`,
              `**"Services"** refers to travel planning, booking, coordination, and related services provided by Adventourist.`,
              `**"Booking"** refers to any reservation or arrangement made through Adventourist for travel services.`,
              `**"Suppliers"** refers to third-party providers including hotels, airlines, transport operators, and activity providers.`,
            ],
          },
        ],
      },
      {
        id: "our-role",
        heading: "Our Role",
        blocks: [
          { type: "p", text: "Adventourist acts as a travel planning and booking intermediary. We coordinate with various suppliers (hotels, airlines, transport providers, guides) to create and fulfill your travel itinerary. The actual travel services are provided by these third-party suppliers under their own terms and conditions. While we carefully select our partners, we are not directly responsible for their services, acts, or omissions." },
        ],
      },
      {
        id: "booking",
        heading: "Booking and Confirmation",
        blocks: [
          {
            type: "ul",
            items: [
              "**Inquiry:** Your initial inquiry does not constitute a booking. A booking is only confirmed when you receive written confirmation from us and pay the required advance amount.",
              "**Accuracy:** You are responsible for providing accurate information including names (as per passport/ID), dates, and contact details. Errors in spelling may result in additional charges or denied boarding.",
              "**Confirmation:** All bookings are subject to availability. We will confirm bookings as soon as we receive confirmation from suppliers.",
              "**Changes:** Any changes to confirmed bookings are subject to availability and may incur additional charges from suppliers.",
            ],
          },
        ],
      },
      {
        id: "pricing",
        heading: "Pricing and Payment",
        blocks: [
          {
            type: "ul",
            items: [
              "**Quoted Prices:** All prices quoted are in Indian Rupees (INR) unless otherwise specified. Prices are subject to change until booking is confirmed with advance payment.",
              "**What's Included:** The inclusions and exclusions for each trip are clearly mentioned in your itinerary document. Please review carefully before booking.",
              "**Advance Payment:** A non-refundable advance (typically 30-50% of total cost) is required to confirm bookings. Balance payment is due 15-20 days before departure.",
              "**Late Payment:** Failure to pay balance by the due date may result in cancellation of bookings and forfeiture of advance paid.",
              "**Price Changes:** In case of significant currency fluctuations, fuel surcharges, or tax changes, we reserve the right to adjust prices with prior notice.",
            ],
          },
          { type: "p", text: "For detailed payment terms, please refer to our [Payment Policy](/payment-policy)." },
        ],
      },
      {
        id: "cancellation",
        heading: "Cancellation and Refunds",
        blocks: [
          { type: "p", text: "Cancellation charges apply based on how far in advance you cancel and the specific suppliers involved. Our standard cancellation policy is outlined in detail on our [Refund & Cancellation Policy](/refund-and-cancellation-policy) page. Each booking confirmation will also include trip-specific cancellation terms that may vary based on supplier policies." },
        ],
      },
      {
        id: "documents",
        heading: "Travel Documents and Visas",
        blocks: [
          {
            type: "ul",
            items: [
              "You are responsible for ensuring valid passports, visas, and travel documents required for your trip.",
              "Passport must be valid for at least 6 months beyond your return date for most international destinations.",
              "While we provide visa assistance, obtaining the visa is ultimately your responsibility. We are not liable for visa rejections.",
              "Check entry requirements, vaccination requirements, and travel advisories for your destination before travel.",
            ],
          },
        ],
      },
      {
        id: "insurance",
        heading: "Travel Insurance",
        blocks: [
          { type: "p", text: "We strongly recommend purchasing comprehensive travel insurance covering trip cancellation, medical emergencies, evacuation, lost baggage, and personal liability. This is especially important for adventure activities, international travel, and high-altitude destinations. We can assist you in obtaining suitable coverage." },
        ],
      },
      {
        id: "health",
        heading: "Health and Fitness",
        blocks: [
          {
            type: "ul",
            items: [
              "You must inform us of any medical conditions, allergies, dietary requirements, or mobility limitations that may affect your trip.",
              "Certain trips (trekking, high-altitude, adventure activities) require a reasonable level of fitness. Please assess your capability honestly.",
              "We reserve the right to refuse participation in activities if we believe it poses a safety risk to you or others.",
              "Consult your doctor before traveling to high-altitude destinations or undertaking strenuous activities.",
            ],
          },
        ],
      },
      {
        id: "liability",
        heading: "Liability Limitations",
        blocks: [
          {
            type: "ul",
            items: [
              "Adventourist acts as an intermediary and is not liable for acts, omissions, or defaults of suppliers, including flight delays, hotel overbookings, or service quality issues.",
              "We are not responsible for losses due to force majeure events including natural disasters, pandemics, political unrest, strikes, or government actions.",
              "Our total liability in any circumstance shall not exceed the total amount paid by you for the booking in question.",
              "We are not liable for any indirect, consequential, or incidental damages including loss of enjoyment or business losses.",
            ],
          },
        ],
      },
      {
        id: "conduct",
        heading: "Conduct and Behavior",
        blocks: [
          { type: "p", text: "You agree to conduct yourself in a reasonable and respectful manner throughout your trip. We reserve the right to terminate services without refund if your behavior endangers yourself, others, property, or causes distress to other travelers or service providers. You must comply with local laws and customs of the destinations visited." },
        ],
      },
      {
        id: "ip",
        heading: "Intellectual Property",
        blocks: [
          { type: "p", text: "All content on the Adventourist website — including text, images, logos, itineraries, and designs — is our intellectual property or used with permission. You may not copy, reproduce, distribute, or use our content without written consent." },
        ],
      },
      {
        id: "feedback",
        heading: "Feedback and Reviews",
        blocks: [
          { type: "p", text: "We value your feedback. By submitting reviews, testimonials, or photos, you grant us permission to use them on our website and marketing materials. We may edit submissions for length or clarity while preserving the meaning." },
        ],
      },
      {
        id: "disputes",
        heading: "Disputes and Governing Law",
        blocks: [
          { type: "p", text: "These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra. We encourage resolving disputes amicably through direct communication before pursuing legal action." },
        ],
      },
      {
        id: "changes",
        heading: "Changes to Terms",
        blocks: [
          { type: "p", text: "We may update these Terms from time to time. The current version will always be available on our website with the last updated date. Continued use of our services after changes constitutes acceptance of the updated Terms." },
        ],
      },
    ]}
  />
);

// ---------- Refund & Cancellation ----------
export const RefundPolicy = () => (
  <PolicyPage
    title="Refund & Cancellation Policy"
    eyebrow="Legal"
    description="How cancellations and refunds are handled at Adventourist — fair, transparent and aligned with supplier commitments."
    canonicalPath="/refund-and-cancellation-policy"
    lastUpdated={LAST_UPDATED}
    intro="We understand that plans can change. This policy outlines how cancellations and refunds are handled at Adventourist. We aim to be fair and transparent while accounting for the commitments we make to our supplier partners on your behalf."
    contact={{ email: "bookings@adventourist.in", ...CONTACT_DEFAULT }}
    related={relatedExcept("/refund-and-cancellation-policy")}
    sections={[
      {
        id: "standard-charges",
        heading: "Standard Cancellation Charges",
        blocks: [
          {
            type: "callout",
            tone: "info",
            title: "Important Notice",
            text: "Each booking may have specific cancellation terms based on supplier policies (especially flights, peak season hotels, and special events). The terms in your booking confirmation supersede this general policy where they differ.",
          },
          { type: "p", text: "Cancellation charges are calculated based on how far in advance you cancel before your scheduled departure date:" },
          {
            type: "table",
            headers: ["Days Before Departure", "Cancellation Fee"],
            rows: [
              ["45+ days", "10% of trip cost (or advance paid, whichever is lower)"],
              ["30–44 days", "25% of trip cost"],
              ["15–29 days", "50% of trip cost"],
              ["7–14 days", "75% of trip cost"],
              ["Less than 7 days / No-show", "100% of trip cost (no refund)"],
            ],
            note: "* These are standard guidelines. Actual charges may vary based on supplier policies, peak season bookings, and special circumstances. Your booking confirmation will specify applicable terms.",
          },
        ],
      },
      {
        id: "non-refundable",
        heading: "Non-Refundable Components",
        blocks: [
          { type: "p", text: "Certain components of your booking may be non-refundable regardless of cancellation timing:" },
          {
            type: "ul",
            items: [
              "Flight tickets (governed by airline policies)",
              "Train tickets (governed by railway policies)",
              "Visa fees and processing charges",
              "Travel insurance premiums",
              "Special event tickets or permits (festivals, restricted areas)",
              "Peak season or promotional hotel bookings marked as non-refundable",
              "Service fees and booking charges",
            ],
          },
        ],
      },
      {
        id: "how-to-cancel",
        heading: "How to Cancel",
        blocks: [
          { type: "p", text: "To request a cancellation:" },
          {
            type: "ol",
            items: [
              `**Contact us immediately** via WhatsApp ([${WHATSAPP_NUMBER_DISPLAY}](https://wa.me/${WHATSAPP_NUMBER})) or email ([bookings@adventourist.in](mailto:bookings@adventourist.in)) with your booking reference.`,
              "**Submit in writing:** Cancellation requests must be made in writing (WhatsApp or email). Verbal requests cannot be processed.",
              "**Cancellation date:** The date we receive your written request determines the applicable cancellation charges.",
              "**Confirmation:** We will acknowledge your request within 24–48 hours and provide details of any refund due.",
            ],
          },
        ],
      },
      {
        id: "refund-processing",
        heading: "Refund Processing",
        blocks: [
          {
            type: "ul",
            items: [
              "**Timeline:** Refunds are processed within 7–10 business days after cancellation is confirmed and refund amount calculated.",
              "**Bank Processing:** Your bank may take an additional 3–5 business days to credit the amount to your account.",
              "**Refund Method:** Refunds are issued to the original payment method. For bank transfers, ensure your account details are correct.",
              "**Currency:** Refunds are processed in INR. Any currency conversion differences or bank charges are borne by you.",
              "**Partial Cancellations:** If canceling for some travelers in a group, remaining travelers may face increased per-person costs (e.g., single room supplements).",
            ],
          },
        ],
      },
      {
        id: "rescheduling",
        heading: "Rescheduling Instead of Cancelling",
        blocks: [
          { type: "p", text: "If you need to change your travel dates, rescheduling may be possible with lower fees than cancellation. This depends on supplier availability and policies. Contact us as early as possible to explore rescheduling options. Date changes are subject to availability and any price differences between old and new dates." },
        ],
      },
      {
        id: "cancellation-by-us",
        heading: "Cancellation by Adventourist",
        blocks: [
          { type: "p", text: "In rare circumstances, we may need to cancel a trip due to:" },
          {
            type: "ul",
            items: [
              "Force majeure events (natural disasters, pandemics, political unrest)",
              "Government travel restrictions or advisories",
              "Minimum group size not being met (for group departures)",
              "Safety concerns at the destination",
            ],
          },
          { type: "p", text: "In such cases, you will be offered a full refund or the option to reschedule to alternative dates at no additional cost. We will provide as much advance notice as possible." },
        ],
      },
      {
        id: "no-show",
        heading: "No-Show Policy",
        blocks: [
          { type: "p", text: "If you fail to show up for your trip without prior cancellation notice, you will not be eligible for any refund. This includes missing flights, failing to check in at hotels, or not joining scheduled activities. We strongly recommend informing us of any delays or changes." },
        ],
      },
      {
        id: "insurance",
        heading: "Travel Insurance",
        blocks: [
          { type: "p", text: "We strongly recommend purchasing comprehensive travel insurance that includes trip cancellation coverage. Insurance can protect you against financial loss if you need to cancel due to illness, family emergencies, or other covered reasons. We can help you find suitable coverage." },
        ],
      },
      {
        id: "special",
        heading: "Special Circumstances",
        blocks: [
          { type: "p", text: "We understand that sometimes cancellations happen due to genuine emergencies (serious illness, bereavement, etc.). While we must recover costs paid to suppliers, we will work with you sympathetically and:" },
          {
            type: "ul",
            items: [
              "Explore rescheduling options with suppliers",
              "Try to recover what we can from suppliers",
              "Offer travel credits where possible",
              "Provide documentation for insurance claims",
            ],
          },
        ],
      },
      {
        id: "disputes",
        heading: "Disputes",
        blocks: [
          { type: "p", text: "If you disagree with a cancellation charge or refund amount, please contact us to discuss. We will review the circumstances and supplier costs involved. Our goal is to find a fair resolution. All disputes are subject to the jurisdiction of courts in Mumbai, Maharashtra." },
        ],
      },
    ]}
  />
);

// ---------- Payment Policy ----------
export const PaymentPolicy = () => (
  <PolicyPage
    title="Payment Policy"
    eyebrow="Legal"
    description="How payments work at Adventourist — methods accepted, schedules, security and invoicing."
    canonicalPath="/payment-policy"
    lastUpdated={LAST_UPDATED}
    intro="This policy outlines how payments work at Adventourist. We aim to make the payment process simple, secure, and transparent. All transactions are conducted in Indian Rupees (INR) unless otherwise specified."
    contact={{ email: "payments@adventourist.in", ...CONTACT_DEFAULT }}
    related={relatedExcept("/payment-policy")}
    sections={[
      {
        id: "methods",
        heading: "Payment Methods Accepted",
        blocks: [
          { type: "h3", text: "Bank Transfer (NEFT/IMPS/RTGS)" },
          { type: "p", text: "Our preferred payment method for larger amounts. Bank details will be shared on your invoice. Please include your booking reference in the transfer remarks." },
          { type: "h3", text: "UPI" },
          { type: "p", text: "Pay instantly using Google Pay, PhonePe, Paytm, BHIM, or any UPI app. We'll share our UPI ID on the invoice. Great for quick advance payments." },
          { type: "h3", text: "Credit/Debit Cards" },
          { type: "p", text: "We accept Visa, Mastercard, and RuPay cards through our secure payment gateway. A payment link will be shared for card transactions. Note: Credit card payments may attract a convenience fee (typically 2–2.5%)." },
          { type: "h3", text: "International Payments" },
          { type: "p", text: "For NRI or international customers, we can accept payments in USD or other currencies via wire transfer or international cards. Exchange rates will be specified at the time of booking." },
        ],
      },
      {
        id: "schedule",
        heading: "Payment Schedule",
        blocks: [
          {
            type: "table",
            headers: ["Stage", "Amount", "When"],
            rows: [
              ["Advance Payment", "30–50% of trip cost", "At time of booking to confirm reservations"],
              ["Balance Payment", "Remaining amount", "15–20 days before departure (exact date in your confirmation)"],
            ],
          },
          {
            type: "ul",
            items: [
              "**Booking Confirmation:** Your booking is confirmed only after we receive the advance payment and send you written confirmation.",
              "**Balance Due Date:** The exact balance due date will be mentioned in your booking confirmation. This is typically 15–20 days before departure.",
              "**Last-Minute Bookings:** For bookings made less than 20 days before departure, full payment may be required upfront.",
              "**Group Bookings:** Large groups or corporate bookings may have customized payment schedules discussed during booking.",
            ],
          },
        ],
      },
      {
        id: "delayed",
        heading: "What Happens If Balance Payment Is Delayed?",
        blocks: [
          {
            type: "ul",
            items: [
              "We will send reminders before the balance due date via WhatsApp and email.",
              "If payment is not received by the due date, we may need to release your reservations (hotels, transport) to avoid cancellation charges from suppliers.",
              "In case of delays, please communicate with us proactively. We'll try to work out a solution where possible.",
              "Bookings cancelled due to non-payment are subject to our standard cancellation policy.",
            ],
          },
        ],
      },
      {
        id: "invoices",
        heading: "Invoices and Receipts",
        blocks: [
          {
            type: "ul",
            items: [
              "**Proforma Invoice:** Sent after your itinerary is finalized, showing total cost, inclusions/exclusions, and payment schedule.",
              "**Payment Receipts:** Issued after each payment is received. Please retain these for your records.",
              "**Tax Invoice:** Final GST invoice issued after full payment is received. Includes all applicable taxes.",
              "**GST:** GST is charged as per applicable rates on our service fees. Hotel and transport bookings may have separate GST components as per supplier invoices.",
            ],
          },
        ],
      },
      {
        id: "validity",
        heading: "Price Validity",
        blocks: [
          {
            type: "ul",
            items: [
              "Quoted prices are valid for 48–72 hours unless otherwise specified.",
              "Hotel and flight prices may fluctuate based on availability and seasonal demand. Prices are locked once advance payment is received.",
              "In case of significant currency fluctuations (for international trips), fuel price changes, or new taxes, we reserve the right to adjust prices with advance notice.",
            ],
          },
        ],
      },
      {
        id: "security",
        heading: "Payment Security",
        blocks: [
          { type: "p", text: "Your payments are secure. We follow industry-standard practices for handling all transactions:" },
          {
            type: "ul",
            items: [
              "All card payments processed through RBI-compliant payment gateways",
              "SSL/TLS encryption for all transactions",
              "We never store your full card details",
              "PCI-DSS compliant payment processing",
              "All payments backed by proper invoices with GST",
            ],
          },
        ],
      },
      {
        id: "refunds",
        heading: "Refunds",
        blocks: [
          { type: "p", text: "Refunds for cancellations are processed as per our [Refund & Cancellation Policy](/refund-and-cancellation-policy). Refunds are issued to the original payment method within 7–10 business days after the refund amount is confirmed. Your bank may take additional time to credit the amount." },
        ],
      },
      {
        id: "on-trip",
        heading: "On-Trip Payments",
        blocks: [
          {
            type: "ul",
            items: [
              "Items not included in your package (meals at non-included restaurants, personal shopping, tips, optional activities) are paid directly by you.",
              "We recommend carrying sufficient cash for destinations with limited card/UPI acceptance (remote areas, small towns).",
              "International trips: Carry a forex card or foreign currency as backup.",
            ],
          },
        ],
      },
      {
        id: "bank-details",
        heading: "Our Bank Details",
        blocks: [
          { type: "p", text: "Official bank details are shared only on your personalized invoice. Please verify account details before making any transfer. We are not responsible for transfers made to incorrect accounts." },
          {
            type: "callout",
            tone: "warning",
            title: "Beware of Fraud",
            text: `Always confirm bank details with us via WhatsApp or phone before making large transfers. We will never ask you to pay to personal accounts or via unusual methods. Our official WhatsApp number is [${WHATSAPP_NUMBER_DISPLAY}](https://wa.me/${WHATSAPP_NUMBER}).`,
          },
        ],
      },
    ]}
  />
);

export default PolicyPage;
