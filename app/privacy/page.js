'use client'

export default function PrivacyPage() {
  return (
    <div style={{ background:'#0d1117', minHeight:'100vh', padding:'60px 20px', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#8b949e', fontSize:13, textDecoration:'none', marginBottom:40 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Flashfo
        </a>

        <div style={{ marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700, color:'#a78bfa', marginBottom:16, letterSpacing:'0.04em' }}>LEGAL</div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#e6edf3', letterSpacing:'-0.02em', margin:'0 0 8px' }}>Privacy Policy</h1>
          <p style={{ fontSize:14, color:'#8b949e', margin:0 }}>Effective Date: May 1, 2026 · Last Updated: May 1, 2026</p>
        </div>

        <div style={{ borderTop:'1px solid #21262d', paddingTop:40 }}>
          {[
            ["1. Introduction", `Welcome to Flashfo. We operate the Flashfo platform — an AI-powered study and teaching workspace at flashfo.com — including all related web pages, features, and services (the "Service").

This Privacy Policy explains what information we collect, how we use it, who we share it with, and the choices you have. By using Flashfo, you agree to the practices described in this policy.

If you are under 13, please review Section 10 (Children's Privacy). If you are a teacher or school administrator, also review Section 11 (Educational Institution Users).`],
            ["2. Information We Collect", `Account information — When you sign up we collect your email address, password (hashed via Supabase Auth), display name, and role (student, teacher, parent/guardian).

Profile information — You may optionally add a photo, banner image, school name, or grade level.

Content you create — We store flashcard decks, quizzes, study guides, summaries, curriculum entries, lesson plans, and any text you paste or upload.

Usage data — Pages visited, features used, session duration, and study activity (e.g. which cards you reviewed and your performance).

Device and technical data — Browser type, OS, device type, truncated IP address, and general geographic region.

Cookies — We use essential cookies to keep you logged in. We do not use advertising cookies.`],
            ["3. How We Use Your Information", `We use information to: provide and operate the Service; personalise your experience (study progress, spaced-repetition scheduling, preferences); improve the Service using aggregated anonymous analytics; communicate with you about your account and, where opted in, product updates; ensure security and prevent abuse; and comply with legal obligations.

We do not use your content to train AI models. We do not sell your personal data. We do not serve targeted advertisements.`],
            ["4. How We Share Your Information", `We do not sell, rent, or trade your personal information. We share it only with:

Service providers — Supabase (auth and database), OpenAI (Nova AI generation), and Vercel (hosting). All providers are contractually bound to protect your data.

Teachers and class features — If you join a teacher's class or live quiz, your teacher can see your name and quiz scores. They cannot see your private decks unless you share them.

Publicly shared content — Decks you make public or share via link are accessible to anyone with the link.

Legal requirements — We may disclose information when required by law or to protect rights and safety.

Business transfers — In a merger or acquisition, your data may transfer. We will notify you before any material policy change.`],
            ["5. Data Retention", `We retain your data while your account is active. If you delete your account, we delete or anonymise your personal data within 30 days, except where required by law. Anonymised aggregate analytics may be retained indefinitely.`],
            ["6. Your Rights and Choices", `Depending on your location you may request: access to your data; correction of inaccurate information; deletion of your account and data; a portable copy of your data; and restriction of certain processing.

To exercise any right, email privacy@flashfo.com. We respond within 30 days. You may unsubscribe from non-essential emails at any time.`],
            ["7. Data Security", `We use HTTPS/TLS encryption for all data in transit. Passwords are hashed and never stored in plain text. Database access is restricted to authorised personnel. We conduct periodic security reviews.

For security concerns: security@flashfo.com`],
            ["8. Cookies", `We use only essential cookies required for the Service to function (session management, login state). We do not use third-party advertising cookies or build advertising profiles.`],
            ["9. International Data Transfers", `Flashfo is operated primarily from the United States. If you access the Service from outside the US, your information may be transferred to and processed in the US or other countries where our service providers operate. We use appropriate safeguards including standard contractual clauses where required.`],
            ["10. Children's Privacy", `Flashfo is intended for users 13 and older. We do not knowingly collect data from children under 13 without verifiable parental consent. If a school creates accounts for students under 13, the school is responsible for obtaining required parental consents under COPPA.

If you believe we have inadvertently collected data from a child under 13, contact privacy@flashfo.com and we will promptly delete it.`],
            ["11. Educational Institution Users (FERPA)", `When used by US schools, we operate as a "school official" with legitimate educational interest under FERPA. We use student data only to provide the Service, never for advertising, and allow schools to access, correct, and delete student records on request.`],
            ["12. California Privacy Rights (CCPA/CPRA)", `California residents have the right to know what data we collect, request deletion, and opt out of the sale of personal information. We do not sell personal information. To exercise your rights, email privacy@flashfo.com. We respond within 45 days.`],
            ["13. Changes to This Policy", `We may update this policy and will notify you of material changes by posting on the Service and, where required by law, by email. Continued use after a change takes effect constitutes acceptance.`],
            ["14. Contact Us", `Flashfo · privacy@flashfo.com · flashfo.com

Security concerns: security@flashfo.com`],
          ].map(([heading, body], i) => (
            <div key={i} style={{ marginBottom:36 }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:'#e6edf3', marginBottom:10 }}>{heading}</h2>
              <div style={{ fontSize:14, color:'#8b949e', lineHeight:1.8, whiteSpace:'pre-line' }}>{body}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px solid #21262d', paddingTop:24, marginTop:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#484f58' }}>© 2026 Flashfo. All rights reserved.</span>
          <a href="/terms" style={{ fontSize:12, color:'#8b949e', textDecoration:'none' }}>Terms of Service →</a>
        </div>
      </div>
    </div>
  )
}
