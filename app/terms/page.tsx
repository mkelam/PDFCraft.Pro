import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PDF Lab Pro
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last Updated: <span className="font-medium">October 27, 2025</span>
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using pdflab.pro (&quot;the Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We reserve the right to modify these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              pdflab.pro provides online PDF conversion and manipulation services, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>PDF to PowerPoint conversion</li>
              <li>PDF to Word conversion</li>
              <li>PDF to Excel conversion</li>
              <li>PDF merging</li>
              <li>OCR (Optical Character Recognition) services</li>
            </ul>
          </section>

          {/* 3. User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update your account information as necessary</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          {/* 4. Usage Limits */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Usage Limits and Plans</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service offers different subscription tiers with varying limits:
            </p>
            <div className="bg-card border rounded-lg p-6 mt-4 space-y-3">
              <div>
                <h3 className="font-semibold">Free Plan</h3>
                <p className="text-sm text-muted-foreground">3 conversions per day, 10MB file limit</p>
              </div>
              <div>
                <h3 className="font-semibold">Starter Plan ($7/month)</h3>
                <p className="text-sm text-muted-foreground">100 conversions per month, 25MB file limit</p>
              </div>
              <div>
                <h3 className="font-semibold">Pro Plan ($19/month)</h3>
                <p className="text-sm text-muted-foreground">Unlimited conversions, 100MB file limit</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You agree not to exceed your plan&apos;s limits or attempt to circumvent usage restrictions.
            </p>
          </section>

          {/* 5. Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree NOT to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Upload or process files containing illegal, harmful, or offensive content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Distribute malware, viruses, or malicious code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          {/* 6. File Processing and Storage */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. File Processing and Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you upload files to the Service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Files are processed temporarily on our servers</li>
              <li>Uploaded and converted files are automatically deleted within 1 hour</li>
              <li>We do not permanently store your files unless explicitly stated</li>
              <li>You retain all ownership rights to your uploaded content</li>
              <li>You grant us a limited license to process your files to provide the Service</li>
            </ul>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its design, code, logos, and content, is owned by pdflab.pro and protected by
              intellectual property laws. You may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Copy, modify, or distribute our software or content</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use our trademarks or branding without permission</li>
              <li>Create derivative works based on the Service</li>
            </ul>
          </section>

          {/* 8. Payment and Refunds */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Payment and Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              For paid subscriptions:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Payments are processed securely through Stripe</li>
              <li>Subscriptions renew automatically unless cancelled</li>
              <li>You may cancel your subscription at any time</li>
              <li>Refunds are provided on a case-by-case basis within 14 days of purchase</li>
              <li>No refunds for partial usage of subscription periods</li>
            </ul>
          </section>

          {/* 9. Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Warranties of merchantability or fitness for a particular purpose</li>
              <li>Warranties regarding accuracy, reliability, or availability</li>
              <li>Warranties that the Service will be uninterrupted or error-free</li>
              <li>Warranties that conversion quality will meet your specific requirements</li>
            </ul>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, pdflab.pro SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Any indirect, incidental, special, or consequential damages</li>
              <li>Loss of data, profits, or business opportunities</li>
              <li>Damages resulting from use or inability to use the Service</li>
              <li>Damages from unauthorized access to your files or account</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our total liability shall not exceed the amount you paid for the Service in the past 12 months, or $100,
              whichever is greater.
            </p>
          </section>

          {/* 11. Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless pdflab.pro, its affiliates, and employees from any claims,
              damages, or expenses arising from:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your use or misuse of the Service</li>
              <li>Content you upload to the Service</li>
            </ul>
          </section>

          {/* 12. Termination */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice,
              for violations of these Terms or for any other reason. You may terminate your account at any time by
              contacting support.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Upon termination:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Your right to access the Service ceases immediately</li>
              <li>Your uploaded files will be deleted</li>
              <li>Sections of these Terms that should survive will remain in effect</li>
            </ul>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law and Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction],
              without regard to conflict of law principles.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Any disputes arising from these Terms or the Service shall be resolved through:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Good faith negotiations between parties</li>
              <li>Binding arbitration if negotiations fail</li>
              <li>Courts of [Your Jurisdiction] as a last resort</li>
            </ol>
          </section>

          {/* 14. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li>Email notification to registered users</li>
              <li>Notice on the Service website</li>
              <li>Update to the &quot;Last Updated&quot; date above</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Your continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* 15. Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-card border rounded-lg p-6 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> legal@pdflab.pro
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Website:</strong> https://pdflab.pro
              </p>
            </div>
          </section>

          {/* 16. Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Miscellaneous</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining
              provisions will remain in full effect.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and pdflab.pro
              regarding the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>No Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be
              considered a waiver of those rights.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            By using pdflab.pro, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
          <div className="flex justify-center gap-6 mt-6">
            <Link href="/privacy" className="text-sm text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link href="/" className="text-sm text-primary hover:underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
