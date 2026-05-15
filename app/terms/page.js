'use client'

const SECTIONS = [
  ["1. Agreement to Terms", `These Terms of Service ("Terms") form a legally binding agreement between you ("you" or "user") and Flashfo ("Flashfo," "we," "us," or "our") governing your access to and use of the Flashfo platform at flashfo.org and all related services, features, and applications (the "Service").

By creating an account, clicking "I agree," or otherwise accessing or using the Service, you confirm that:
(a) you have read and understood these Terms and our Privacy Policy;
(b) you are of legal age to form a binding contract in your jurisdiction (or have parental/guardian consent if under 18); and
(c) you agree to be bound by these Terms.

If you are using the Service on behalf of an educational institution, you represent that you have authority to bind that institution to these Terms.

If you do not agree to these Terms, do not create an account or use the Service.`],

  ["2. Eligibility", `To use the Service, you must:

— Be at least 13 years old. Users between 13 and 17 must have the consent of a parent or legal guardian. By using the Service, users under 18 represent that they have obtained such consent.
— Users under 13 may only access the Service through a verified school arrangement where the school has obtained all required parental consents under COPPA and applicable law. See Section 13 (Educational Institutions and COPPA).
— Provide accurate, current, and complete information when registering and keep it up to date.
— Not have been previously banned from the Service for violating these Terms.

We reserve the right to refuse registration or terminate accounts at our discretion where eligibility requirements are not met.`],

  ["3. Accounts", `Account responsibility: You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately at support@flashfo.org if you suspect any unauthorised access to or use of your account.

Accurate information: You agree to provide accurate registration information and keep it current. We may suspend or terminate accounts with demonstrably false information.

Account security: Do not share your password with others. We will never ask for your password by email. Flashfo is not liable for any loss or damage arising from your failure to comply with these security obligations.

Account types: The Service offers student, teacher, and parent/guardian account types. Teacher accounts carry additional responsibilities described in Section 14.`],

  ["4. The Service", `Flashfo is an AI-powered educational platform that enables users to create and study flashcard decks, quizzes, study guides, summaries, lesson plans, and other educational materials using our Nova AI assistant. The Service also includes live quiz hosting for teachers, collaborative decks, assignment tracking, spaced-repetition study sessions, and related educational tools.

Service availability: We aim for high availability but do not guarantee uninterrupted access. We may perform maintenance that temporarily limits access, and we will endeavour to provide advance notice for planned downtime.

Feature changes: We may modify, add, or remove features at any time. For paid plan features, we will provide at least 30 days' notice before removing a material feature.

Third-party services: The Service integrates with third-party providers including Supabase (database), OpenAI, and Anthropic (AI generation), and Vercel (hosting). Your use of the Service is subject to the terms of those providers where applicable.`],

  ["5. Nova AI — Important Disclaimers", `Nova is an AI assistant powered by large language models. Before relying on any AI-generated content, please understand the following:

Accuracy: AI-generated content may contain errors, inaccuracies, outdated information, or hallucinations. Nova does not have access to real-time information and is not a substitute for expert advice, verified textbooks, or primary sources. Always review AI-generated content before using it for academic, professional, or high-stakes purposes.

No professional advice: Nova is a study tool. Nothing Nova generates constitutes medical, legal, financial, psychological, or other professional advice. Do not rely on Nova for decisions that require professional expertise.

AI training: We do not use your content or prompts to train AI models. Your inputs are transmitted to AI providers only to generate your requested output and are subject to our AI providers' API usage policies.

Curriculum accuracy: Nova is not aligned to any specific school curriculum, exam board, or educational standard unless you explicitly provide that context. Generated content may not match your teacher's expectations or exam requirements.

Academic integrity: Flashfo is a study aid. Submitting AI-generated content as your own original work in violation of your school's or institution's academic integrity or honour code policies is prohibited and is your sole responsibility. We encourage using Nova to understand concepts and practise, not to produce work for submission without disclosure.`],

  ["6. Acceptable Use", `You agree not to use the Service to:

Prohibited content:
— Upload, generate, transmit, or store content that is illegal, defamatory, harassing, threatening, obscene, hateful, or that violates the rights of others.
— Infringe any third-party intellectual property rights, including copyrights, trademarks, or trade secrets.
— Generate content designed to deceive, manipulate, or harm others, including misinformation, phishing, or social engineering material.

Prohibited conduct:
— Attempt to gain unauthorised access to the Service, other user accounts, or our systems.
— Use automated tools, bots, or scripts to scrape, crawl, or extract data from the Service without our written consent.
— Reverse engineer, decompile, or attempt to derive the source code of the Service or Nova AI.
— Resell, sublicense, or commercialise access to the Service or AI-generated outputs without our prior written consent.
— Interfere with or disrupt the integrity or performance of the Service or servers.
— Impersonate any person or entity, or misrepresent your affiliation with any person or entity.
— Use the Service in any way that violates applicable local, state, national, or international law or regulation.

We reserve the right to remove content and suspend or terminate accounts for violations of these policies, with or without notice, at our sole discretion.`],

  ["7. Your Content", `Ownership: You retain all ownership rights in content you create, upload, or save on Flashfo ("Your Content"), including flashcard decks, quiz questions, lesson plans, notes, and any other materials.

Licence to Flashfo: By submitting Your Content, you grant Flashfo a non-exclusive, worldwide, royalty-free, sublicensable licence to host, store, reproduce, process, display, and distribute Your Content solely to the extent necessary to provide, maintain, and improve the Service for you and, where applicable, your class. This licence terminates when you delete Your Content or close your account, subject to our data retention obligations.

AI-generated content: Content generated by Nova in response to your prompts becomes Your Content once generated. We do not assert ownership over AI outputs.

Shared and public content: If you make content public or share it with a class or the Flashfo community, other users may view, study, and clone it for their own educational use. You represent that you have the right to share any content you make public.

Content removal: We reserve the right to remove any content that violates these Terms, applicable law, or third-party rights, with or without prior notice.`],

  ["8. Intellectual Property", `Flashfo's intellectual property: The Flashfo name, logo, Nova AI branding, platform design, software, code, algorithms, documentation, and all related materials are owned by or licensed to Flashfo and are protected by copyright, trademark, trade secret, and other intellectual property laws. You may not use our trademarks, logos, or other proprietary marks without our prior written consent.

Restrictions: You may not copy, modify, distribute, sell, or lease any part of our Service or software, nor attempt to extract or reverse engineer our source code or AI models.

Feedback: If you provide feedback, suggestions, or ideas about the Service, you grant us a perpetual, irrevocable, royalty-free licence to use, incorporate, and commercialise that feedback without any compensation or obligation to you.

DMCA: If you believe that content on the Service infringes your copyright, please send a notice to legal@flashfo.org with the information required under 17 U.S.C. § 512(c)(3).`],

  ["9. Subscriptions, Billing, and Payments", `Free and paid plans: Flashfo offers a free tier and paid subscription plans (including Pro and Team plans, as described at flashfo.org/pricing). Paid plan features are available only during an active paid subscription.

Free trials: We may offer free trial periods. At the end of a trial, your subscription will automatically convert to a paid plan unless you cancel before the trial ends.

Auto-renewal: Paid subscriptions renew automatically at the end of each billing period (monthly or annual, as selected) at the then-current price. By subscribing, you authorise us to charge your payment method on a recurring basis. We will provide advance notice of any price increase.

Cancellation: You may cancel your subscription at any time through your account settings or by emailing billing@flashfo.org. Cancellation takes effect at the end of the current billing period. We do not offer prorated refunds for unused subscription time, except where required by applicable law.

Refunds: Refund requests for billing errors or duplicate charges must be submitted within 30 days of the charge to billing@flashfo.org. We will evaluate requests at our discretion and as required by law.

Price changes: We may change subscription pricing at any time with at least 30 days' prior notice. Continued use after the effective date of a price change constitutes acceptance of the new pricing.

Taxes: Prices are exclusive of applicable taxes (VAT, GST, sales tax, etc.) unless otherwise stated. You are responsible for any applicable taxes on your subscription.`],

  ["10. Disclaimers and Limitation of Liability", `THE SERVICE AND ALL CONTENT (INCLUDING AI-GENERATED CONTENT) ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

WE DO NOT WARRANT THAT:
(A) THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE;
(B) AI-GENERATED CONTENT IS ACCURATE, COMPLETE, RELIABLE, OR SUITABLE FOR ANY EDUCATIONAL, ACADEMIC, OR PROFESSIONAL PURPOSE;
(C) ANY DEFECTS OR ERRORS WILL BE CORRECTED; OR
(D) THE SERVICE IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FLASHFO, ITS OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, AGENTS, OR AFFILIATES BE LIABLE FOR ANY:
— INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES;
— LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR BUSINESS OPPORTUNITIES;
— ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL FEES YOU PAID TO FLASHFO IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (USD $100).

Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so the above limitations may not apply to you in full.`],

  ["11. Indemnification", `You agree to defend, indemnify, and hold harmless Flashfo and its officers, directors, employees, contractors, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to:

(a) your use of or access to the Service;
(b) Your Content or your violation of any third party's intellectual property or other rights;
(c) your violation of these Terms or applicable law;
(d) any content you generate using Nova that causes harm to a third party; or
(e) your use of the Service in an educational context, including any claims related to student data or parental consent.

We reserve the right, at our expense, to assume exclusive defence and control of any matter otherwise subject to indemnification by you, and you agree to cooperate with our defence.`],

  ["12. Privacy", `Your use of the Service is governed by our Privacy Policy, available at flashfo.org/privacy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.`],

  ["13. Educational Institutions and COPPA", `Schools, districts, and teachers using Flashfo for classroom purposes represent and warrant that:

(a) They have obtained all necessary parental or guardian consents required by the Children's Online Privacy Protection Act (COPPA), the Family Educational Rights and Privacy Act (FERPA), and any applicable state student privacy laws before inviting or creating accounts for students, particularly students under 13.
(b) They have authority to enter into these Terms on behalf of their institution.
(c) They will only use the Service for lawful educational purposes consistent with their institution's policies.
(d) They will promptly notify Flashfo at support@flashfo.org if they become aware of any unauthorised use of the Service by students.

Teacher class code responsibility: Teachers who create class codes or live quiz sessions are responsible for the appropriate distribution and use of those codes. Do not post class codes publicly. Disable or regenerate codes if you believe they have been shared inappropriately.

Student data: We process student data only as directed by and for the benefit of the school. We do not use student data for advertising or non-educational commercial purposes. See our Privacy Policy for full details.`],

  ["14. Teacher and Administrator Responsibilities", `Teacher accounts have elevated capabilities within the Service, including creating classes, distributing assignments, hosting live quizzes, and viewing student performance data. Teachers and administrators agree to:

— Use student data only for legitimate educational purposes.
— Not share student performance data with unauthorised parties.
— Supervise appropriate use of the Service by students in their classes.
— Promptly report any suspected misuse, data breach, or inappropriate content to support@flashfo.org.
— Ensure their use of the Service complies with their institution's policies and applicable law.

Flashfo reserves the right to suspend teacher accounts found to be misusing student data or violating these responsibilities.`],

  ["15. Termination", `By you: You may delete your account at any time from Settings → Account. Account deletion triggers our data deletion process as described in the Privacy Policy.

By Flashfo: We may suspend or terminate your access to the Service at any time, with or without cause, including for:
— Violation of these Terms or our Acceptable Use Policy.
— Non-payment of applicable subscription fees.
— Extended account inactivity (12+ months on free tier).
— Conduct that we determine is harmful to the Service, other users, or third parties.

We will endeavour to provide advance notice of termination except where the violation is severe or requires immediate action.

Effect of termination: On termination, your right to access and use the Service ceases immediately. Sections 7 (Your Content), 8 (Intellectual Property), 10 (Disclaimers), 11 (Indemnification), 16 (Governing Law), and 17 (General Provisions) survive termination.`],

  ["16. Force Majeure", `Neither party shall be liable for any delay or failure to perform its obligations under these Terms to the extent such delay or failure is caused by circumstances beyond that party's reasonable control, including but not limited to natural disasters, pandemic, acts of government, strikes, internet or infrastructure outages, or acts of third parties. Flashfo will use commercially reasonable efforts to restore the Service as quickly as possible following any such event.`],

  ["17. Governing Law and Dispute Resolution", `Governing law: These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.

Informal resolution: Before initiating any formal legal proceeding, you agree to contact us at legal@flashfo.org and provide a written description of the dispute. We will attempt to resolve it informally within 30 days.

Binding arbitration: If informal resolution fails, any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration shall be conducted in English, and the arbitrator's decision shall be final and binding, subject to limited judicial review.

Class action waiver: YOU AND FLASHFO EACH WAIVE THE RIGHT TO PARTICIPATE IN CLASS ACTION LAWSUITS OR CLASS-WIDE ARBITRATION. All claims must be brought in your individual capacity.

Exceptions: Either party may seek emergency injunctive or other equitable relief in a court of competent jurisdiction to prevent irreparable harm pending arbitration. Claims related to Flashfo's intellectual property may be brought in court without prior arbitration.

EU/UK users: Nothing in this section limits your rights as a consumer under applicable EU or UK law, including your right to bring claims before your local courts or supervisory authority.`],

  ["18. Changes to These Terms", `We may update these Terms from time to time. For material changes, we will provide at least 14 days' prior notice by posting the updated Terms on the Service and, where required, by email. Your continued use of the Service after the effective date of any change constitutes acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service and may delete your account.

We maintain an archive of prior versions of these Terms, available on request at legal@flashfo.org.`],

  ["19. General Provisions", `Entire agreement: These Terms and the Privacy Policy constitute the entire agreement between you and Flashfo regarding the Service and supersede all prior agreements.

Severability: If any provision of these Terms is found to be unenforceable, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force.

No waiver: Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.

Assignment: You may not assign or transfer your rights under these Terms without our prior written consent. Flashfo may assign its rights without restriction.

Notices: Legal notices to Flashfo must be sent to legal@flashfo.org. We may send notices to you via email or by posting on the Service.

Language: These Terms are written in English. Any translations are provided for convenience only, and the English version shall prevail in the event of any conflict.`],

  ["20. Contact Us", `Flashfo
legal@flashfo.org
flashfo.org

Support: support@flashfo.org
Billing: billing@flashfo.org
Privacy: privacy@flashfo.org
Security: security@flashfo.org`],
]

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
          <p style={{ fontSize:14, color:'#8b949e', margin:0 }}>Effective Date: May 15, 2026 · Last Updated: May 15, 2026</p>
        </div>

        <div style={{ borderTop:'1px solid #21262d', paddingTop:40 }}>
          {SECTIONS.map(([heading, body], i) => (
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
