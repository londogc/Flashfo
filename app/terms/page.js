'use client'

export default function TermsPage() {
  return (
    <div style={{ background:'#0d1117', minHeight:'100vh', padding:'60px 20px', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#8b949e', fontSize:13, textDecoration:'none', marginBottom:40 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Flashfo
        </a>

        <div style={{ marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700, color:'#a78bfa', marginBottom:16, letterSpacing:'0.04em' }}>LEGAL</div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#e6edf3', letterSpacing:'-0.02em', margin:'0 0 8px' }}>Terms of Service</h1>
          <p style={{ fontSize:14, color:'#8b949e', margin:0 }}>Effective Date: May 1, 2026 · Last Updated: May 1, 2026</p>
        </div>

        <div style={{ borderTop:'1px solid #21262d', paddingTop:40 }}>
          {[
            ["1. Agreement to Terms", `These Terms of Service form a legally binding agreement between you and Flashfo governing your access to and use of the Flashfo platform at flashfo.org and all related services (the "Service").

By creating an account or using the Service, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.`],
            ["2. Eligibility", `You must be at least 13 years old to create an account. Users under 18 must have parental or guardian consent. Users under 13 may only access the Service through a verified school arrangement with appropriate parental consents. You must provide accurate and complete information when registering.`],
            ["3. Accounts", `You are responsible for maintaining the confidentiality of your login credentials and all activity under your account. Notify us immediately at support@flashfo.org if you suspect unauthorised access.

Teachers who create class codes or live quiz sessions are responsible for appropriate use by students they invite. We may suspend or terminate accounts for violations of these Terms.`],
            ["4. The Service", `Flashfo is an AI-powered educational platform enabling users to create flashcards, quizzes, study guides, summaries, and other study materials using our Nova AI assistant. The Service also includes live quiz tools for teachers, collaborative decks, and spaced-repetition study modes.

AI-generated content is produced algorithmically and may not always be accurate. You are responsible for reviewing AI-generated content before using it for academic or high-stakes purposes. We do not guarantee that Nova's outputs are error-free or suitable for any particular curriculum.`],
            ["5. Acceptable Use", `You must not: upload or generate illegal, defamatory, harassing, obscene, or harmful content; infringe third-party intellectual property; attempt unauthorised access to the Service or other accounts; scrape data using automated tools; reverse engineer the Service; or use Nova AI to generate content intended to deceive or harm others.

Regarding academic integrity: Flashfo is a study tool. Submitting AI-generated work as your own in violation of your institution's academic integrity policy is prohibited.

You must not resell or commercialise the Service or generated content without our written consent.`],
            ["6. Your Content", `You retain ownership of content you create or save on Flashfo. By submitting content, you grant Flashfo a non-exclusive, worldwide, royalty-free licence to host, store, and display it solely to provide the Service. AI-generated outputs become your content once generated.

If you share content publicly or with a class, other users may view and use it for educational purposes. We may remove content that violates these Terms.`],
            ["7. Intellectual Property", `The Flashfo name, logo, Nova AI branding, platform design, and software are owned by or licensed to Flashfo and protected by intellectual property laws. You may not use our trademarks without prior written consent. Feedback you provide may be used by us without compensation.`],
            ["8. Subscription Plans and Payments", `Flashfo offers a free tier and paid plans (Pro, Team, and others as described at flashfo.org/pricing). Paid subscriptions are billed on a recurring basis. You may cancel at any time; cancellation takes effect at period end with no refund for unused time except where required by law.

For billing errors, contact billing@flashfo.org within 30 days. We may change pricing with 30 days' notice.`],
            ["9. Disclaimers and Limitation of Liability", `THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE, OR THAT AI-GENERATED CONTENT IS ACCURATE OR SUITABLE FOR ANY PURPOSE.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLASHFO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID US IN THE PRECEDING 12 MONTHS OR USD $100.`],
            ["10. Indemnification", `You agree to indemnify and hold harmless Flashfo and its officers, directors, employees, and agents from claims arising out of your use of the Service, Your Content, or your violation of these Terms.`],
            ["11. Privacy", `Your use of the Service is governed by our Privacy Policy, incorporated into these Terms by reference.`],
            ["12. Educational Institutions and COPPA", `School administrators using Flashfo for classrooms represent that they have obtained all required consents under COPPA, FERPA, and applicable state laws before creating accounts for or inviting students. For students under 13, the school acts as agent of parental consent.`],
            ["13. Termination", `You may delete your account at any time. We may suspend or terminate your access for violation of these Terms, non-payment, or extended inactivity. On termination, your right to use the Service ceases and data will be deleted per our Privacy Policy.`],
            ["14. Governing Law and Dispute Resolution", `These Terms are governed by Delaware law. Before any legal claim, contact legal@flashfo.org to attempt informal resolution within 30 days. Unresolved disputes will be resolved through binding individual arbitration under AAA Consumer Arbitration Rules. Class action claims are waived.`],
            ["15. General Provisions", `These Terms and the Privacy Policy constitute the entire agreement between you and Flashfo. If any provision is unenforceable, the rest remains in effect. Our failure to enforce any provision is not a waiver. You may not assign your rights without our consent.`],
            ["16. Changes to These Terms", `We may update these Terms and will provide at least 14 days' notice of material changes. Continued use after the effective date constitutes acceptance.`],
            ["17. Contact Us", `Flashfo · legal@flashfo.org · flashfo.org

Support: support@flashfo.org · Billing: billing@flashfo.org`],
          ].map(([heading, body], i) => (
            <div key={i} style={{ marginBottom:36 }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:'#e6edf3', marginBottom:10 }}>{heading}</h2>
              <div style={{ fontSize:14, color:'#8b949e', lineHeight:1.8, whiteSpace:'pre-line' }}>{body}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px solid #21262d', paddingTop:24, marginTop:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#484f58' }}>© 2026 Flashfo. All rights reserved.</span>
          <a href="/privacy" style={{ fontSize:12, color:'#8b949e', textDecoration:'none' }}>Privacy Policy →</a>
        </div>
      </div>
    </div>
  )
}
