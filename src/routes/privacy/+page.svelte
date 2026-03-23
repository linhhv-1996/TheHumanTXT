<script>
    import { fade } from 'svelte/transition';
</script>

<div class="legal-page" transition:fade={{duration: 300}}>
    <div class="legal-header">
        <a href="/" class="btn-ghost" style="text-decoration: none; display: inline-block;">← RETURN TO CANVAS</a>
    </div>

    <div class="legal-content">
        <span class="manifest-label">The Human TXT</span>
        <h1 class="manifest-title" style="margin-bottom: 8px;">Privacy Policy</h1>
        <p class="manifest-label" style="color: #555; margin-bottom: 40px;">EFFECTIVE DATE: MARCH 2026</p>

        <div class="legal-body">
            <p>The Human TXT ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, and share information when you visit thehumannebula.xyz and use our services. By using our service, you agree to the practices described in this policy.</p>

            <h2>1. Information We Collect</h2>
            <p>We only collect the minimum amount of information necessary to provide our service.</p>
            <ul>
                <li><strong>Publicly Submitted Data:</strong> When you claim a slot, we collect the text of your "Thought", and any optional fields you choose to provide: Name, Location, and Link (e.g., X handle or website). This data is stored in our database (Firebase Firestore, provided by Google) before being permanently anchored to the decentralized ledger.</li>
                <li><strong>Account Data:</strong> If you choose to sign in with Google, we receive your email address, display name, and profile photo URL from your Google account via Firebase Authentication. We do not store your password.</li>
                <li><strong>Payment Information:</strong> We do not collect or store your credit card or payment details. All transactions are handled entirely by our secure third-party payment processor, Dodo Payments. Dodo Payments may collect billing information necessary to process your transaction and comply with global tax regulations.</li>
                <li><strong>Technical Data:</strong> We may automatically collect basic log data such as browser type, device type, IP address, and usage analytics via Firebase to ensure the site functions correctly. This data is used solely for operational purposes and is not sold.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <ul>
                <li><strong>To Provide the Service:</strong> The core purpose of collecting your Thought, Name, Location, and Link is to permanently display it on The Human TXT's public digital canvas and anchor it to the decentralized ledger.</li>
                <li><strong>To Manage Your Account:</strong> Your Google account data is used solely to authenticate you and associate your submission with your session.</li>
                <li><strong>To Process Transactions:</strong> We securely pass the necessary checkout context to Dodo Payments to facilitate your purchase.</li>
                <li><strong>To Maintain the Service:</strong> Technical and log data is used to monitor performance, fix bugs, and ensure the platform operates correctly.</li>
            </ul>

            <h2>3. The Public and Permanent Nature of Your Data</h2>
            <p><strong>IMPORTANT:</strong> The purpose of The Human TXT is to create a permanent digital record. Any information you type into the submission form (your Thought, Name, Location, Link) will be published publicly, stored in Firebase Firestore, and anchored immutably to the Base L2 decentralized ledger. <strong>Do not submit sensitive personal information (such as your home address, phone number, or financial details) into the canvas.</strong> Once anchored to the decentralized ledger, we cannot erase or alter this public record even if requested.</p>

            <h2>4. Cookies</h2>
            <p>We use necessary cookies and similar technologies to operate this website. These include:</p>
            <ul>
                <li><strong>Authentication cookies:</strong> Set by Firebase to maintain your login session.</li>
                <li><strong>Infrastructure cookies:</strong> Set by Cloudflare for security and performance purposes.</li>
            </ul>
            <p>We do not use advertising or third-party tracking cookies. By using this website, you consent to the use of these necessary cookies.</p>

            <h2>5. Third-Party Services</h2>
            <ul>
                <li><strong>Firebase / Google:</strong> We use Firebase Authentication and Firebase Firestore (provided by Google LLC) to manage user sign-in and store submitted data. Google may process this data on servers in the United States. Their use of your data is governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</li>
                <li><strong>Dodo Payments:</strong> We use Dodo Payments as our Merchant of Record for all payments. Their use of your personal and billing data is governed by their own Privacy Policy.</li>
                <li><strong>Base L2 (Decentralized Ledger):</strong> Your submission data is anchored to the Base L2 blockchain to ensure its permanence. This data is public by design and outside of our centralized control once published.</li>
                <li><strong>Cloudflare:</strong> We use Cloudflare for DNS, CDN, and security services. Cloudflare may process request metadata (such as IP addresses) as part of delivering and protecting the service.</li>
            </ul>

            <h2>6. International Data Transfers</h2>
            <p>Our third-party service providers (including Google/Firebase and Dodo Payments) may process your data on servers located outside your country of residence, including in the United States. By using this service, you consent to the transfer of your data internationally. We rely on these providers' compliance frameworks (including Standard Contractual Clauses where applicable) to safeguard your data during such transfers.</p>

            <h2>7. Data Retention</h2>
            <p>Because the service is designed as a permanent monument, the public data you submit to the canvas is retained indefinitely in both our Firestore database and on the Base L2 ledger. Authentication and technical log data is retained for as long as your account is active or as needed to operate the service.</p>

            <h2>8. Your Rights</h2>
            <p>Depending on your jurisdiction (e.g., GDPR, CCPA), you may have certain rights regarding your personal data, including the right to access, correct, or request deletion of your data. To exercise these rights, please contact us at the email below and we will respond within 30 days.</p>
            <p>However, please note an important limitation: by using this service, you are intentionally directing us to anchor your submitted data to a public, immutable blockchain ledger. The right to erasure ("right to be forgotten") cannot be technologically enforced on the decentralized portion of the archive once an entry is inscribed. We can remove your data from our Firestore database upon request, but the on-chain record will remain permanently.</p>

            <h2>9. Data Controller</h2>
            <p>The data controller responsible for your personal data is the operator of The Human TXT (thehumannebula.xyz). For any data-related inquiries, please contact us directly via the email address below.</p>

            <h2>10. Contact Us</h2>
            <p>If you have any questions, concerns, or data requests regarding this Privacy Policy, please contact us at: <strong>[hvlinh.tptn@gmail.com]</strong></p>
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
