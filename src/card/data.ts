/**
 * The card's content, lifted from card.jtylerray.com. Everything the old card
 * carried except the payment group, which does not belong on jtylerray.com.
 */

export const CARD = {
  name: "J. Tyler Ray",
  role: "Founder · Builder · Operator",
  /** the drawing-sheet meta line: where I am, and what the sheet is */
  place: "Phoenix, Arizona",
  zone: "America/Phoenix",
  site: { label: "jtylerray.com", href: "https://jtylerray.com" },
  /** for the downloadable contact file */
  vcard: {
    first: "Tyler",
    last: "Ray",
    org: "J. Tyler Ray",
    title: "Founder · Builder · Operator",
    email: "jt@jtylerray.com",
    phone: "+14805163213",
  },
};

export type Row = {
  /** the kind of thing this is. Socials do not need one: the name is the row */
  label?: string;
  value: string;
  note?: string;
  href: string;
  /** filename in card/marks, drawn beside the value */
  mark?: string;
  /** open in a new tab: true for the web, false for mail, sms and WhatsApp */
  external?: boolean;
};

export type Group = { n: string; title: string; sub: string; rows: Row[] };

export const GROUPS: Group[] = [
  {
    n: "01",
    title: "Contact",
    sub: "Email · SMS · WhatsApp",
    rows: [
      {
        label: "Email",
        value: "jt@jtylerray.com",
        note: "Best for anything serious",
        href: "mailto:jt@jtylerray.com",
        mark: "gmail",
      },
      {
        label: "SMS",
        value: "+1 (480) 516-3213",
        note: "Text only, I won't answer calls",
        href: "sms:+14805163213",
      },
      {
        label: "WhatsApp",
        value: "+1 (480) 516-3213",
        href: "https://wa.me/14805163213",
        mark: "whatsapp",
        external: true,
      },
    ],
  },
  {
    n: "02",
    title: "Book a call",
    sub: "30 or 60 min",
    rows: [
      {
        label: "30 minutes",
        value: "Networking, intros, quick chats",
        href: "https://30cal.jtylerray.com",
        mark: "googlecalendar",
        external: true,
      },
      {
        label: "60 minutes",
        value: "Deep dives, advisory, working sessions",
        href: "https://60cal.jtylerray.com",
        mark: "googlecalendar",
        external: true,
      },
    ],
  },
  {
    n: "03",
    title: "Socials",
    sub: "IG · LinkedIn · FB",
    rows: [
      {
        value: "Instagram",
        href: "https://instagram.com/jtylerray",
        mark: "instagram",
        external: true,
      },
      {
        value: "LinkedIn",
        href: "https://linkedin.com/in/jtylerray",
        mark: "linkedin",
        external: true,
      },
      {
        value: "Facebook",
        href: "https://www.facebook.com/jtylerray",
        mark: "facebook",
        external: true,
      },
    ],
  },
];
