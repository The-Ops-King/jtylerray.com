import { useState } from 'react';

// Submissions are emailed via the /api/apply serverless function (Resend).
const FORM_ENDPOINT = '/api/apply';

const POSITIONS = ['Closer', 'DM Setter', 'Phone Setter'] as const;

type FormState = {
  name: string;
  email: string;
  facebook: string;
  position: string;
  commissionTarget: string;
  topRevenueMonth: string;
  closingExperience: string;
  realEstateExperience: string;
  loomUrl: string;
  anythingElse: string;
};

const EMPTY: FormState = {
  name: '',
  email: '',
  facebook: '',
  position: '',
  commissionTarget: '',
  topRevenueMonth: '',
  closingExperience: '',
  realEstateExperience: '',
  loomUrl: '',
  anythingElse: '',
};

const labelCls = 'block text-small font-medium uppercase tracking-wider text-fg-muted mb-8';
const fieldCls =
  'w-full px-16 py-12 bg-bg-elevated border border-border rounded-card text-fg placeholder-fg-muted/50 ' +
  'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors';

export default function RealEstate() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  const update = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!emailOk) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'real-estate', submittedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
      setForm(EMPTY);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section className="min-h-screen flex items-center justify-center bg-bg px-16 py-96 md:px-32">
        <div className="max-w-xl text-center">
          <h1 className="text-h2 md:text-h1 font-black text-fg mb-16">Application Received.</h1>
          <p className="text-body-lg text-fg-muted">
            Thanks for applying. If it's a fit, you'll hear from us. Keep an eye on your inbox.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-bg px-16 py-64 md:px-32 md:py-96">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-40 text-center">
          <span className="inline-block px-16 py-8 text-small font-medium tracking-wider uppercase bg-accent/10 border border-accent/20 rounded-full text-accent mb-24">
            REAL ESTATE
          </span>
          <h1 className="text-h2 md:text-h1 font-black text-fg leading-tight mb-16">
            Apply to Join the Team
          </h1>
          <p className="text-body-lg text-fg-muted max-w-xl mx-auto">
            Tell us who you are and what you've closed. The strong ones rise fast.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
            <div>
              <label className={labelCls} htmlFor="name">Name *</label>
              <input id="name" required value={form.name} onChange={update('name')}
                className={fieldCls} placeholder="Your full name" />
            </div>
            <div>
              <label className={labelCls} htmlFor="email">Email *</label>
              <input id="email" type="text" inputMode="email" autoComplete="email" required
                value={form.email}
                onChange={(e) => { setEmailError(''); setForm((f) => ({ ...f, email: e.target.value })); }}
                className={fieldCls} placeholder="you@email.com" />
              {emailError && (
                <p className="text-danger text-small mt-8">{emailError}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="facebook">Facebook Profile *</label>
            <input id="facebook" required value={form.facebook} onChange={update('facebook')}
              className={fieldCls} placeholder="facebook.com/yourprofile" />
          </div>

          <div>
            <label className={labelCls} htmlFor="position">Position You Want *</label>
            <select id="position" required value={form.position} onChange={update('position')}
              className={fieldCls + (form.position ? '' : ' text-fg-muted/50')}>
              <option value="" disabled>Select a position</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p} className="text-fg bg-bg-elevated">{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
            <div>
              <label className={labelCls} htmlFor="commissionTarget">Monthly Commission Target *</label>
              <input id="commissionTarget" required value={form.commissionTarget} onChange={update('commissionTarget')}
                className={fieldCls} placeholder="$10,000" />
            </div>
            <div>
              <label className={labelCls} htmlFor="topRevenueMonth">Top Revenue Generated (Month) *</label>
              <input id="topRevenueMonth" required value={form.topRevenueMonth} onChange={update('topRevenueMonth')}
                className={fieldCls} placeholder="$100,000" />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="closingExperience">Closing Experience *</label>
            <textarea id="closingExperience" required rows={3} value={form.closingExperience} onChange={update('closingExperience')}
              className={fieldCls} placeholder="What have you sold, for how long, what offers/price points?" />
          </div>

          <div>
            <label className={labelCls} htmlFor="realEstateExperience">Real Estate Experience *</label>
            <textarea id="realEstateExperience" required rows={3} value={form.realEstateExperience} onChange={update('realEstateExperience')}
              className={fieldCls} placeholder="Any real estate sales, investing, or industry background?" />
          </div>

          <div>
            <label className={labelCls} htmlFor="loomUrl">Loom Intro (paste link)</label>
            <input id="loomUrl" value={form.loomUrl} onChange={update('loomUrl')}
              className={fieldCls} placeholder="https://www.loom.com/share/..." />
          </div>

          <div>
            <label className={labelCls} htmlFor="anythingElse">Anything Else You'd Like to Add?</label>
            <textarea id="anythingElse" rows={3} value={form.anythingElse} onChange={update('anythingElse')}
              className={fieldCls} placeholder="Optional" />
          </div>

          {status === 'error' && (
            <p className="text-danger text-body">
              Something went wrong. Please try again or email jt@jtylerray.com directly.
            </p>
          )}

          <button type="submit" disabled={status === 'submitting'}
            className="w-full px-28 py-16 bg-accent hover:bg-accent-dark text-bg font-semibold rounded-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
            {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </section>
  );
}
