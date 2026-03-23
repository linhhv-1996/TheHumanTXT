<script>
    import { fade } from 'svelte/transition';
</script>

<div class="legal-page" transition:fade={{duration: 300}}>
    <div class="legal-header">
        <a href="/" class="btn-ghost" style="text-decoration: none; display: inline-block;">← RETURN TO CANVAS</a>
    </div>

    <div class="legal-content">
        <span class="manifest-label">The Human TXT</span>
        <h1 class="manifest-title" style="margin-bottom: 8px;">Terms of Service</h1>
        <p class="manifest-label" style="color: #555; margin-bottom: 40px;">EFFECTIVE DATE: MARCH 2026</p>

        <div class="legal-body">
            <p>Welcome to The Human TXT. By accessing our website and utilizing our services, you agree to be bound by the following Terms of Service. Please read them carefully before making a purchase or submitting any content.</p>

            <h2>1. Description of Service</h2>
            <p>The Human TXT provides a finite digital canvas where users can purchase a digital slot to publish a text entry (a "Thought"). There are exactly 50,000 slots available. Once a slot is claimed and a Thought is submitted, it becomes a permanent part of the digital archive, anchored to the Base L2 decentralized ledger. The service is operated at thehumannebula.xyz.</p>

            <h2>2. Account Registration</h2>
            <p>To purchase a slot, you may be required to sign in using a Google account via Firebase Authentication. By signing in, you represent that you are at least 18 years of age (or the age of majority in your jurisdiction) and that the information you provide is accurate. You are responsible for all activity that occurs under your account.</p>

            <h2>3. Digital Goods and Non-Refundable Policy</h2>
            <p>By purchasing a slot on The Human TXT, you are acquiring a permanent digital service and publication space.</p>
            <ul>
                <li><strong>All Sales Are Final:</strong> Due to the immediate and immutable nature of digital publishing on our platform, <strong>we do not offer refunds, exchanges, or cancellations</strong> under any circumstances once a payment is processed and a Thought is submitted.</li>
                <li>By completing your purchase, you explicitly consent to the immediate performance of the service and acknowledge that you waive your right of withdrawal or refund upon submission of your Thought.</li>
                <li>If a payment is processed but a technical error prevents your Thought from being published, please contact us and we will investigate and resolve the issue.</li>
            </ul>

            <h2>4. Payments</h2>
            <p>All payments are securely processed through our merchant of record, Dodo Payments. By completing a transaction, you also agree to Dodo Payments's terms and conditions regarding payment processing. We do not store your credit card or billing details. In the event of a dispute or chargeback, Dodo Payments's policies will govern the resolution process.</p>

            <h2>5. Permanence and Immutability</h2>
            <p>The core concept of The Human TXT is permanence. Once you confirm your submission and payment is processed, your text, Name, Location, and Link (if provided) <strong>cannot be edited, modified, or deleted</strong> from the decentralized ledger by you or by us. Your entry in our Firestore database may be modifiable under limited circumstances (see our Privacy Policy), but the on-chain record is permanent.</p>
            <p>Please ensure your submission is exactly as you intend it to be before confirming your purchase. We are not responsible for typographical errors or submissions made in error.</p>

            <h2>6. User Conduct and Content Restrictions</h2>
            <p>While The Human TXT is designed as a raw digital monument for authentic human expression, you agree not to submit content that:</p>
            <ul>
                <li>Violates any applicable laws or regulations.</li>
                <li>Contains doxxing information, unauthorized private data of third parties, or any content that violates another person's privacy.</li>
                <li>Constitutes hate speech, harassment, threats, or content that promotes violence or discrimination against any individual or group.</li>
                <li>Contains child sexual abuse material (CSAM) or any content that sexually exploits minors.</li>
                <li>Is intended to disrupt the platform or spread malicious links, spam, or phishing content.</li>
                <li>Infringes the intellectual property rights of any third party.</li>
            </ul>
            <p>We reserve the right (though not the obligation) to hide or obscure entries from the primary web interface if they severely violate these terms or applicable legal requirements. The underlying on-chain record may remain on the decentralized ledger and outside our ability to remove.</p>
            <p>As stated in our manifest: <em>If you used AI to write your entry, this place isn't for you. No one checks, but you know.</em></p>

            <h2>7. Intellectual Property</h2>
            <p>By submitting your Thought, you confirm that you own or have the right to publish the content. You retain ownership of your words. However, you grant The Human TXT a perpetual, irrevocable, royalty-free license to display, archive, and reference your submission as part of the permanent public canvas.</p>

            <h2>8. Limitation of Liability</h2>
            <p>The Human TXT and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use or inability to use the service, including but not limited to the permanent nature of published content, service outages, or third-party actions. Our total liability to you for any claim shall not exceed the amount you paid for your slot.</p>

            <h2>9. Disclaimer of Warranties</h2>
            <p>The service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that the decentralized ledger will remain accessible in perpetuity. We will make reasonable efforts to maintain the platform but cannot guarantee permanent uptime.</p>

            <h2>10. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the service shall be resolved through good-faith negotiation first, and if unresolved, through binding arbitration or the courts of competent jurisdiction.</p>

            <h2>11. Changes to Terms</h2>
            <p>We reserve the right to update these Terms at any time. For material changes, we will make reasonable efforts to notify users via the website. Continued use of the website after such changes constitutes your acceptance of the revised Terms. The effective date at the top of this document will reflect the date of the most recent update.</p>

            <h2>12. Contact Us</h2>
            <p>For any questions regarding these terms, please contact us at: <strong>[hvlinh.tptn@gmail.com]</strong></p>
        </div>
    </div>
</div>

<style>
    .legal-page {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        background: #000;
        overflow-y: auto;
        z-index: 50;
        padding: 40px 20px;
    }

    .legal-header {
        max-width: 680px;
        margin: 0 auto 40px auto;
    }

    .legal-content {
        max-width: 680px;
        margin: 0 auto 80px auto;
        padding-bottom: 60px;
    }

    .legal-body {
        font-family: 'IM Fell English', Georgia, serif;
        font-size: 1.05rem;
        font-style: italic;
        color: #b0b0b0;
        line-height: 1.8;
    }

    .legal-body h2 {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.75rem;
        letter-spacing: 0.15rem;
        color: #fff;
        text-transform: uppercase;
        font-style: normal;
        margin: 40px 0 16px 0;
        border-bottom: 1px solid #222;
        padding-bottom: 8px;
    }

    .legal-body p {
        margin-bottom: 16px;
    }

    .legal-body ul {
        margin-bottom: 16px;
        padding-left: 20px;
    }

    .legal-body li {
        margin-bottom: 10px;
    }

    .legal-body a {
        color: #b0b0b0;
        text-decoration: underline;
        text-underline-offset: 3px;
    }

    .legal-body a:hover {
        color: #fff;
    }

    .manifest-label {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.7rem;
        letter-spacing: 0.2rem;
        color: #555;
        text-transform: uppercase;
        display: block;
        margin-bottom: 12px;
    }

    .manifest-title {
        font-family: 'IM Fell English', Georgia, serif;
        font-size: 2.5rem;
        color: #fff;
        font-weight: normal;
    }

    .btn-ghost {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.7rem;
        letter-spacing: 0.15rem;
        color: #555;
        text-transform: uppercase;
        transition: color 0.2s ease;
    }

    .btn-ghost:hover {
        color: #fff;
    }
</style>
