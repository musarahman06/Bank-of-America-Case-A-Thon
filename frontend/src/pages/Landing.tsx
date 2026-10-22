import { useEffect, useState } from 'react'
import { Reveal } from '../hooks/useReveal'
import type { Meta } from '../types'

interface Props {
  meta: Meta | null
  onStart: (mode: 'offers' | 'evaluate') => void
}

// Illustrative offers for the ticker (synthetic, not real BofA loans).
const SAMPLE_OFFERS = [
  ['$12.5M', '7 YR', '6.42%', 91],
  ['$4.2M', '3 YR', '6.10%', 88],
  ['$38.0M', '10 YR', '7.05%', 79],
  ['$9.8M', '5 YR', '6.77%', 94],
  ['$21.3M', '15 YR', '6.25%', 86],
  ['$2.6M', '2 YR', '7.40%', 72],
  ['$57.8M', '7 YR', '6.49%', 95],
] as const

const WORDS = ['Instant offers', 'Scored 1–100', 'Risk 1–5', 'Explainable AI', 'Funding transparency', 'Mid-market ready', 'Seconds, not weeks', 'Reverse evaluation']

const STEPS = [
  ['Share your financials', 'Revenue, margins, debt, collateral, credit. Eight numbers you already know — no document upload to get started.'],
  ['The model checks history', 'Gradient-boosted models trained on 6,000 historical mid-market loans estimate approval odds and default risk for every option.'],
  ['Get three scored offers', 'Best Match, Maximum Capacity and Lowest Cost — each scored 1–100 and rated for risk 1–5, with the reasons spelled out.'],
  ['Bring your own loan', 'Already know what you want? Evaluate it, see exactly what holds it back, and get alternatives that score higher.'],
  ['See where the money comes from', 'Every offer shows how it is funded across Bank of America’s balance sheet — deposits, debt and capital.'],
] as const

const FAQ = [
  ['What is Loan Clarity?', 'A Case-A-Thon prototype that gives mid-market businesses an instant, explainable view of what they can borrow from Bank of America, instead of waiting weeks for a decision.'],
  ['How is the 1–100 score calculated?', 'It blends approval likelihood (30%), affordability after the loan (25%), cost (20%), fit to the amount you need (15%) and low risk (10%). Higher is better for you.'],
  ['What does the 1–5 risk rating mean?', 'It buckets the model’s predicted default probability: under 2% is 1 (very low), and above 20% is 5 (high).'],
  ['Is this real Bank of America loan data?', 'No. BofA’s internal loan history is not public, so the models are trained on a synthetic, seeded dataset designed to behave like a real mid-market loan book.'],
  ['Where do the funding numbers come from?', 'From Bank of America’s 4Q25 investor presentation. The loan is allocated across that funding mix for illustration, plus the capital regulators require for its risk.'],
  ['Is this a credit decision?', 'No. It is a decision-support demo. A relationship manager and full underwriting would confirm any real offer.'],
] as const

const CITIES = [
  ['Charlotte', 'America/New_York'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Hong Kong', 'Asia/Hong_Kong'],
] as const

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Landing({ meta, onStart }: Props) {
  const now = useNow()
  const [openStep, setOpenStep] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="landing">
      {/* ---------- hero ---------- */}
      <section className="l-hero">
        <div className="l-hero-copy">
          <p className="eyebrow">Bank of America · Case-A-Thon · Option A</p>
          <h1 className="display">
            Loan answers
            <br />
            in <span className="accent">seconds.</span>
            <br />
            Not weeks.
          </h1>
          <p className="l-lead">
            Mid-market businesses see what they can borrow, what it will cost, and what might hold them back —
            instantly, with every number explained.
          </p>
          <div className="l-ctas">
            <button className="pill primary" onClick={() => onStart('offers')}>
              Get my offers →
            </button>
            <button className="pill ghost" onClick={() => onStart('evaluate')}>
              Evaluate my loan
            </button>
          </div>
        </div>

        <div className="l-stage" aria-hidden>
          <div className="glow" />
          <div className="float-card">
            <div className="fc-top">
              <span className="fc-brand">Loan Clarity</span>
              <span className="fc-chip">Best Match</span>
            </div>
            <div className="fc-amount">$57.8M</div>
            <div className="fc-meta">Term Loan · 7 years · 6.49%</div>
            <div className="fc-row">
              <div className="fc-ring">
                <span>95</span>
              </div>
              <div className="fc-risk">
                <div>
                  <i className="on" />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <small>Risk 1/5 · Very Low</small>
              </div>
            </div>
          </div>
          <div className="toast t1">
            <b>✓</b> Offer ready · Score 94
          </div>
          <div className="toast t2">
            <b className="g">●</b> Approval odds 92%
          </div>
          <div className="toast t3">
            <b className="o">▲</b> Capacity up to $96.4M
          </div>
        </div>
      </section>

      {/* ---------- marquees ---------- */}
      <section className="marquee-wrap" aria-label="Sample offers (illustrative)">
        <div className="marquee orange">
          <div className="track">
            {[...SAMPLE_OFFERS, ...SAMPLE_OFFERS].map(([amt, term, rate, score], i) => (
              <span key={i} className="tick">
                {amt} <em>·</em> {term} <em>·</em> {rate} <em>·</em> <b>SCORE {score}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="marquee navy reverse">
          <div className="track">
            {[...WORDS, ...WORDS].map((w, i) => (
              <span key={i} className="tick word">
                {w} <em>✦</em>
              </span>
            ))}
          </div>
        </div>
        <p className="marquee-note">Sample offers shown are illustrative.</p>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="l-section">
        <Reveal className="l-head">
          <span className="count">05</span>
          <h2 className="display sm">
            Built for the way
            <br />
            businesses borrow.
          </h2>
        </Reveal>
        <ol className="steps">
          {STEPS.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 70} className={openStep === i ? 'open' : ''}>
              <button
                className="step-btn"
                onClick={() => setOpenStep(i)}
                onMouseEnter={() => setOpenStep(i)}
                aria-expanded={openStep === i}
              >
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <span className="step-title">{title}</span>
                <span className="plus">{openStep === i ? '–' : '+'}</span>
              </button>
              <p className="step-body">{body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- stats + clocks ---------- */}
      <section className="l-stats">
        <div className="stats-grid">
          <Reveal className="stat">
            <b>0.2s</b>
            <span>to generate three scored offers</span>
          </Reveal>
          <Reveal className="stat" delay={80}>
            <b>6,000</b>
            <span>historical loans behind every answer</span>
          </Reveal>
          <Reveal className="stat" delay={160}>
            <b>{meta ? meta.model.approval_auc.toFixed(2) : '0.92'}</b>
            <span>approval model accuracy (AUC)</span>
          </Reveal>
          <Reveal className="stat" delay={240}>
            <b>3</b>
            <span>offers, each scored 1–100 and risk-rated 1–5</span>
          </Reveal>
        </div>
        <div className="clocks">
          <span className="clocks-label">Answers around the clock</span>
          {CITIES.map(([city, tz]) => (
            <div key={city} className="clock">
              <b>{now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b>
              <span>{city}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="l-section">
        <Reveal className="l-head">
          <span className="count">{String(FAQ.length).padStart(2, '0')}</span>
          <h2 className="display sm">
            Frequently
            <br />
            asked questions
          </h2>
        </Reveal>
        <div className="faq">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 50} className={`faq-item${openFaq === i ? ' open' : ''}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                <span>{q}</span>
                <span className="plus">{openFaq === i ? '–' : '+'}</span>
              </button>
              <div className="faq-a">
                <p>{a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- footer CTA ---------- */}
      <section className="l-footer">
        <h2 className="display">
          The offer is
          <br />
          only the <span className="accent">beginning.</span>
        </h2>
        <button className="pill primary" onClick={() => onStart('offers')}>
          Get my offers →
        </button>
        <p className="fine">
          Case-A-Thon prototype · synthetic training data · not a credit decision · funding figures illustrative, from BofA’s 4Q25
          investor presentation.
        </p>
      </section>
    </div>
  )
}
