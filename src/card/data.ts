/**
 * The card's content.
 *
 * The card is three things and nothing else: book a call, find me elsewhere,
 * or tell me what's broken. Email, SMS and WhatsApp rows are deliberately
 * gone — every one of them was a second way to say the thing the form asks
 * for directly, and a card that lists five channels makes the reader choose
 * before they can start.
 */

export const CARD = {
  name: "J. Tyler Ray",
  role: "Founder · Builder · Operator",
  /** the drawing-sheet meta line: where I am, and what the sheet is */
  place: "Phoenix, Arizona",
  zone: "America/Phoenix",
  site: { label: "jtylerray.com", href: "https://jtylerray.com" },
};

export type Call = {
  /** the length, set as the row's own numeral */
  minutes: string;
  title: string;
  note: string;
  href: string;
};

export const CALLS: Call[] = [
  {
    minutes: "30",
    title: "Quick call",
    note: "Networking, intros, a question you want answered",
    href: "https://30cal.jtylerray.com",
  },
  {
    minutes: "60",
    title: "Working session",
    note: "Deep dives, advisory, walking through a system together",
    href: "https://60cal.jtylerray.com",
  },
];

export type Social = { name: string; handle: string; href: string; mark: string };

export const SOCIALS: Social[] = [
  {
    name: "Instagram",
    handle: "@jtylerray",
    href: "https://instagram.com/jtylerray",
    mark: "instagram",
  },
  {
    name: "LinkedIn",
    handle: "in/jtylerray",
    href: "https://linkedin.com/in/jtylerray",
    mark: "linkedin",
  },
  {
    name: "Facebook",
    handle: "jtylerray",
    href: "https://www.facebook.com/jtylerray",
    mark: "facebook",
  },
];

/** where the form posts. Same origin in production: the card ships into
 *  jtylerray.com/card and the handler sits at jtylerray.com/api/book. */
export const BOOK_ENDPOINT = "/api/book";

/** the one select on the form. Kept to four coarse answers: a stranger can
 *  pick one without checking a calendar, which a time picker would force. */
export const TIME_SLOTS = [
  "Mornings",
  "Afternoons",
  "Evenings",
  "Whenever you're free",
];
