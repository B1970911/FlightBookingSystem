const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// Regular expression for validating recipient email address format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cache active transporters by host:port:user for connection pooling
const transporterCache = new Map();

/**
 * Validates and retrieves Gmail SMTP configuration from environment variables.
 * @returns {{ host: string, port: number, user: string, pass: string }}
 */
const getGmailConfig = () => {
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_PORT, 10) || 465;
    const user = process.env.EMAIL_USER;
    const rawPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    const pass = rawPass ? rawPass.replace(/\s+/g, "") : "";

    if (!user || !pass) {
        const missing = [];
        if (!user) missing.push("EMAIL_USER");
        if (!pass) missing.push("EMAIL_PASSWORD (or EMAIL_PASS)");
        const error = new Error(
            `Gmail SMTP configuration error: Missing required environment variable(s): ${missing.join(", ")}.`
        );
        error.code = "CONFIG_MISSING";
        throw error;
    }

    return { host, port, user, pass };
};

/**
 * Creates or retrieves a pooled Nodemailer transporter configured for Gmail SMTP.
 * Enforces SSL on port 465 or STARTTLS on port 587, with connection pooling
 * to prevent connection drops, socket exhaustion, or Google anti-abuse rate limits.
 *
 * @param {Object} [options]
 * @param {number} [options.portOverride] - Optional port override (e.g. 465 or 587)
 * @param {boolean} [options.forceNew] - Whether to recreate the transporter instance
 * @returns {nodemailer.Transporter}
 */
const getGmailTransporter = ({ portOverride = null, forceNew = false } = {}) => {
    const { host, port: configPort, user, pass } = getGmailConfig();
    const port = portOverride || configPort;
    const isSecurePort = port === 465;
    const cacheKey = `${host}:${port}:${user}`;

    if (!forceNew && transporterCache.has(cacheKey)) {
        return transporterCache.get(cacheKey);
    }

    const transportConfig = {
        pool: true, // Reuse open SMTP connections for subsequent emails
        maxConnections: 3,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        host,
        port,
        secure: isSecurePort, // true for port 465 (SSL), false for port 587 (STARTTLS)
        auth: {
            user,
            pass,
        },
        connectionTimeout: 12000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: true,
            minVersion: "TLSv1.2",
        },
    };

    // When connecting to smtp.gmail.com on port 465, service: 'gmail' provides optimal defaults
    if (host === "smtp.gmail.com" && isSecurePort) {
        transportConfig.service = "gmail";
    }

    const transporter = nodemailer.createTransport(transportConfig);
    transporterCache.set(cacheKey, transporter);
    return transporter;
};

// Alias for backward compatibility
const createGmailTransporter = (options) => getGmailTransporter(options);

/**
 * Formats Gmail/SMTP errors into clear, actionable messages.
 * Detects common cloud host port blocks (e.g. Render, AWS free tier),
 * Google App Password authentication failures, and recipient rejections.
 *
 * @param {Error} error
 * @param {string} host
 * @param {number} port
 * @returns {Error}
 */
const formatSmtpError = (error, host = "smtp.gmail.com", port = 465) => {
    const code = error.code || "";
    const response = error.response || "";
    const message = error.message || "";

    if (
        code === "EAUTH" ||
        response.includes("535") ||
        message.includes("535") ||
        message.includes("Username and Password not accepted")
    ) {
        const authError = new Error(
            "Gmail SMTP Authentication Failed (535): Invalid username or 16-character App Password. " +
            "Ensure 2-Step Verification is enabled on your Google account and you have generated a valid App Password " +
            "at https://myaccount.google.com/apppasswords (do not use your regular Google account password)."
        );
        authError.code = "EAUTH";
        authError.originalError = error;
        return authError;
    }

    if (
        code === "ECONNREFUSED" ||
        code === "ETIMEDOUT" ||
        code === "ESOCKET" ||
        code === "ENOTFOUND" ||
        code === "ECONNRESET" ||
        code === "EDNS" ||
        code === "EAI_AGAIN" ||
        message.includes("ENOTFOUND") ||
        message.includes("ETIMEDOUT") ||
        message.includes("ECONNREFUSED") ||
        message.includes("Greeting never received") ||
        message.includes("handshake") ||
        message.includes("self signed certificate")
    ) {
        const connError = new Error(
            `Gmail SMTP Connection Failure: Unable to connect to ${host}:${port} (${code || message}). ` +
            "NOTE: Free cloud hosting tiers (such as Render Free Tier) completely block outbound SMTP ports (25, 465, 587). " +
            "If deployed on Render, upgrade to a paid instance or use an HTTPS API email service. " +
            "If running locally, check your local firewall/antivirus or try switching EMAIL_PORT between 465 and 587."
        );
        connError.code = code || "CONNECTION_FAILED";
        connError.originalError = error;
        return connError;
    }

    if (code === "EENVELOPE" || message.toLowerCase().includes("recipient")) {
        const recipientError = new Error(
            `Gmail SMTP Delivery Error: Recipient address was rejected by the server (${message}).`
        );
        recipientError.code = "EENVELOPE";
        recipientError.originalError = error;
        return recipientError;
    }

    return error;
};

/**
 * Validates a recipient email address.
 * @param {string} to
 */
const validateRecipient = (to) => {
    if (!to || typeof to !== "string" || !to.trim()) {
        const error = new Error("Validation Error: Recipient email address ('to') is required.");
        error.code = "INVALID_RECIPIENT";
        throw error;
    }

    const trimmed = to.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
        const error = new Error(`Validation Error: Invalid recipient email address '${trimmed}'.`);
        error.code = "INVALID_RECIPIENT";
        throw error;
    }
};

/**
 * Sends an email using Gmail SMTP and Google 16-character App Password.
 * Automatically tries primary port (e.g. 465 SSL or 587 STARTTLS) and fails over
 * to the alternate port if a connection or socket timeout occurs.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - Optional HTML body
 * @returns {Promise<{ success: boolean, provider: string, messageId: string, response: string, recipient: string, port: number }>}
 */
const sendGmailEmail = async ({ to, subject, text, html }) => {
    validateRecipient(to);

    const config = getGmailConfig();
    const fromAddress = process.env.EMAIL_FROM || `SkyLink Ethiopia <${config.user}>`;

    const mailOptions = {
        from: fromAddress,
        to: to.trim(),
        subject: subject || "SkyLink Ethiopia Notification",
        ...(text ? { text } : {}),
        ...(html ? { html } : {}),
    };

    // If only HTML is provided, generate a basic plain-text fallback
    if (!mailOptions.text && mailOptions.html) {
        mailOptions.text = mailOptions.html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    const primaryPort = config.port;
    const alternatePort = primaryPort === 465 ? 587 : 465;

    // Attempt 1: Primary port (with connection pooling)
    try {
        const transporter = getGmailTransporter({ portOverride: primaryPort });
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [Gmail SMTP] Email sent successfully to ${to} via port ${primaryPort}. Message ID: ${info.messageId}`);
        return {
            success: true,
            provider: "gmail",
            messageId: info.messageId,
            response: info.response,
            recipient: to,
            port: primaryPort,
        };
    } catch (primaryError) {
        console.warn(
            `⚠️ [Gmail SMTP] Send attempt via port ${primaryPort} failed: ${primaryError.message}. Retrying via alternate port ${alternatePort}...`
        );

        // Invalidate cached transporter on failure to recreate connection
        transporterCache.delete(`${config.host}:${primaryPort}:${config.user}`);

        // Attempt 2: Alternate port (465 <-> 587)
        try {
            const alternateTransporter = getGmailTransporter({ portOverride: alternatePort, forceNew: true });
            const info = await alternateTransporter.sendMail(mailOptions);
            console.log(`✅ [Gmail SMTP] Email sent successfully to ${to} via alternate port ${alternatePort}. Message ID: ${info.messageId}`);
            return {
                success: true,
                provider: "gmail",
                messageId: info.messageId,
                response: info.response,
                recipient: to,
                port: alternatePort,
            };
        } catch (alternateError) {
            transporterCache.delete(`${config.host}:${alternatePort}:${config.user}`);
            const formatted = formatSmtpError(primaryError, config.host, primaryPort);
            console.error("❌ [Gmail SMTP] Send Error on both ports (465 and 587):", formatted.message);
            throw formatted;
        }
    }
};

/**
 * Verifies Gmail SMTP connection and authentication credentials.
 * Tests both primary and alternate ports.
 *
 * @returns {Promise<{ success: boolean, message: string, host: string, port: number, user: string }>}
 */
const verifyGmailConnection = async () => {
    const config = getGmailConfig();
    const primaryPort = config.port;
    const alternatePort = primaryPort === 465 ? 587 : 465;

    try {
        const transporter = getGmailTransporter({ portOverride: primaryPort, forceNew: true });
        await transporter.verify();
        return {
            success: true,
            message: `Gmail SMTP verified successfully on port ${primaryPort}.`,
            host: config.host,
            port: primaryPort,
            user: config.user,
        };
    } catch (primaryErr) {
        console.warn(`⚠️ Port ${primaryPort} verification failed: ${primaryErr.message}. Trying port ${alternatePort}...`);
        try {
            const altTransporter = getGmailTransporter({ portOverride: alternatePort, forceNew: true });
            await altTransporter.verify();
            return {
                success: true,
                message: `Gmail SMTP verified successfully on alternate port ${alternatePort}.`,
                host: config.host,
                port: alternatePort,
                user: config.user,
            };
        } catch (altErr) {
            const formatted = formatSmtpError(primaryErr, config.host, primaryPort);
            console.error("❌ Gmail SMTP Verification Failed on both ports:", formatted.message);
            throw formatted;
        }
    }
};

/**
 * Sends an email using Resend API (preserves existing Resend implementation).
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - Optional HTML body
 * @returns {Promise<{ success: boolean, provider: string, messageId: string, recipient: string }>}
 */
const sendResendEmail = async ({ to, subject, text, html }) => {
    validateRecipient(to);

    if (!process.env.RESEND_API_KEY) {
        const error = new Error("RESEND_API_KEY is not configured in environment variables.");
        error.code = "CONFIG_MISSING";
        throw error;
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromAddress = process.env.RESEND_FROM || "SkyLink Ethiopia <bookings@flightbooking.de5.net>";

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: [to.trim()],
            subject: subject || "SkyLink Ethiopia Notification",
            ...(html ? { html } : {}),
            ...(text ? { text } : {}),
        });

        if (error) {
            let errorMsg = error.message || "Resend email dispatch failed.";
            if (errorMsg.includes("testing emails to your own email address")) {
                errorMsg = (
                    "Resend API Limitation: Free accounts without a verified custom domain can only send " +
                    "to the account owner's email address. To send to any recipient, verify your domain in Resend dashboard or use Gmail SMTP."
                );
            }
            console.error("❌ Resend Email Error:", errorMsg);
            const resendError = new Error(errorMsg);
            resendError.code = error.name || "RESEND_ERROR";
            throw resendError;
        }

        console.log("✅ [Resend] Email sent successfully:", data.id);
        return {
            success: true,
            provider: "resend",
            messageId: data.id,
            recipient: to,
        };
    } catch (error) {
        console.error("❌ [Resend] Email Error:", error.message);
        throw error;
    }
};

/**
 * Universal email dispatch function.
 * Supports:
 *   1. sendEmail(to, subject, html, text)
 *   2. sendEmail(to, subject, text)
 *   3. sendEmail({ to, subject, text, html, provider })
 *
 * Provider selection:
 *   - Explicit 'provider' parameter ("gmail" or "resend")
 *   - process.env.EMAIL_PROVIDER ("gmail" or "resend")
 *   - Defaults to Gmail SMTP when EMAIL_USER and EMAIL_PASSWORD/EMAIL_PASS are configured
 *   - Falls back to Resend when RESEND_API_KEY is configured
 */
const sendEmail = async (firstArg, secondArg, thirdArg, fourthArg) => {
    let to;
    let subject;
    let text;
    let html;
    let provider;

    if (firstArg && typeof firstArg === "object" && !Array.isArray(firstArg)) {
        // Invocation style: sendEmail({ to, subject, text, html, provider })
        to = firstArg.to || firstArg.recipient;
        subject = firstArg.subject;
        text = firstArg.text;
        html = firstArg.html;
        provider = firstArg.provider;
    } else {
        // Invocation style: sendEmail(to, subject, html, text) or sendEmail(to, subject, text)
        to = firstArg;
        subject = secondArg;

        // Check if third argument is HTML or plain text
        if (typeof thirdArg === "string" && thirdArg.trim().startsWith("<")) {
            html = thirdArg;
            text = fourthArg;
        } else if (fourthArg) {
            html = thirdArg || undefined;
            text = fourthArg;
        } else {
            if (typeof thirdArg === "string" && /<[a-z][\s\S]*>/i.test(thirdArg)) {
                html = thirdArg;
            } else {
                text = thirdArg;
            }
        }
    }

    // Determine target provider
    const chosenProvider = (
        provider ||
        process.env.EMAIL_PROVIDER ||
        ((process.env.EMAIL_USER && (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)) ? "gmail" : "") ||
        (process.env.RESEND_API_KEY ? "resend" : "") ||
        "gmail"
    ).toLowerCase();

    if (chosenProvider === "resend") {
        return await sendResendEmail({ to, subject, text, html });
    }

    try {
        return await sendGmailEmail({ to, subject, text, html });
    } catch (gmailError) {
        if (process.env.RESEND_API_KEY) {
            console.warn(
                "⚠️ Gmail SMTP dispatch failed. Attempting fallback to Resend API...",
                gmailError.message
            );
            try {
                return await sendResendEmail({ to, subject, text, html });
            } catch (resendError) {
                console.error("❌ Resend API fallback also failed:", resendError.message);
                const combinedError = new Error(
                    `Email delivery failed on Gmail SMTP (${gmailError.message}). Fallback to Resend also failed (${resendError.message}).`
                );
                combinedError.code = "ALL_PROVIDERS_FAILED";
                throw combinedError;
            }
        }
        throw gmailError;
    }
};

// Attach helper functions to main exported function for flexibility
sendEmail.sendEmail = sendEmail;
sendEmail.sendGmail = sendGmailEmail;
sendEmail.sendResend = sendResendEmail;
sendEmail.verifyGmailConnection = verifyGmailConnection;
sendEmail.createGmailTransporter = createGmailTransporter;
sendEmail.getGmailTransporter = getGmailTransporter;

module.exports = sendEmail;
