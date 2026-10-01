const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// Regular expression for validating recipient email address format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and retrieves Gmail SMTP configuration from environment variables.
 * @returns {{ host: string, port: number, user: string, pass: string }}
 */
const getGmailConfig = () => {
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
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
 * Creates and returns a Nodemailer transporter configured for Gmail SMTP.
 * Enforces TLS / STARTTLS on port 587.
 * @returns {nodemailer.Transporter}
 */
const createGmailTransporter = () => {
    const { host, port, user, pass } = getGmailConfig();
    const isSecurePort = port === 465;

    return nodemailer.createTransport({
        host,
        port,
        secure: isSecurePort, // true for port 465, false for port 587 (uses STARTTLS)
        requireTLS: !isSecurePort, // enforce TLS upgrade when port is 587
        auth: {
            user,
            pass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
            rejectUnauthorized: true,
        },
    });
};

/**
 * Formats Gmail/SMTP errors into clear, actionable messages.
 * @param {Error} error
 * @param {string} host
 * @param {number} port
 * @returns {Error}
 */
const formatSmtpError = (error, host = "smtp.gmail.com", port = 587) => {
    const code = error.code || "";
    const response = error.response || "";
    const message = error.message || "";

    if (code === "EAUTH" || response.includes("535") || message.includes("535") || message.includes("Username and Password not accepted")) {
        const authError = new Error(
            "Gmail SMTP Authentication Failed (535): Invalid username or 16-character App Password. " +
            "Ensure 2-Step Verification is active on your Google account and you have generated a valid App Password " +
            "at https://myaccount.google.com/apppasswords (no regular Google account passwords)."
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
            `Gmail SMTP Connection/TLS Failure: Unable to connect to ${host}:${port} (${code || message}). ` +
            "Please check network connectivity, firewall settings, or verify that outbound port 587 is not blocked."
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
 * Verifies Gmail SMTP connection and authentication credentials.
 * @returns {Promise<{ success: boolean, message: string, host: string, port: number, user: string }>}
 */
const verifyGmailConnection = async () => {
    const config = getGmailConfig();
    const transporter = createGmailTransporter();

    try {
        await transporter.verify();
        return {
            success: true,
            message: "Gmail SMTP connection and credentials verified successfully.",
            host: config.host,
            port: config.port,
            user: config.user,
        };
    } catch (error) {
        const formatted = formatSmtpError(error, config.host, config.port);
        console.error("❌ Gmail SMTP Verification Failed:", formatted.message);
        throw formatted;
    }
};

/**
 * Sends an email using Gmail SMTP and Google 16-character App Password.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - Optional HTML body
 * @returns {Promise<{ success: boolean, provider: string, messageId: string, response: string, recipient: string }>}
 */
const sendGmailEmail = async ({ to, subject, text, html }) => {
    validateRecipient(to);

    const config = getGmailConfig();
    const transporter = createGmailTransporter();

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

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [Gmail SMTP] Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return {
            success: true,
            provider: "gmail",
            messageId: info.messageId,
            response: info.response,
            recipient: to,
        };
    } catch (error) {
        const formatted = formatSmtpError(error, config.host, config.port);
        console.error("❌ [Gmail SMTP] Send Error:", formatted.message);
        throw formatted;
    }
};

/**
 * Sends an email using Resend API (preserves existing Resend implementation).
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
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM || "SkyLink Ethiopia <bookings@flightbooking.de5.net>",
            to: [to.trim()],
            subject: subject || "SkyLink Ethiopia Notification",
            ...(html ? { html } : {}),
            ...(text ? { text } : {}),
        });

        if (error) {
            console.error("❌ Resend Email Error:", error);
            throw new Error(error.message || "Resend email dispatch failed.");
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
            // e.g. sendEmail(to, subject, htmlOrNull, text) as in paymentController.js
            html = thirdArg || undefined;
            text = fourthArg;
        } else {
            // single body argument: determine if HTML or plain text
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
                "⚠️ Gmail SMTP dispatch failed (possibly due to cloud host port restrictions). Falling back to Resend API...",
                gmailError.message
            );
            return await sendResendEmail({ to, subject, text, html });
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

module.exports = sendEmail;
