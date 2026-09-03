const { Resend } = require("resend");

const sendEmail = async (to, subject, html) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("⚠️ RESEND_API_KEY not configured. Skipping email dispatch.");
            return;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "SkyLink Ethiopia <noreply@flightbooking.de5.net>",
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error("❌ Resend Email Error:", error);
            throw new Error(error.message);
        }

        console.log("✅ Email sent successfully:", data.id);
    } catch (error) {
        console.error("❌ Email Error:", error.message);
        throw error;
    }
};

module.exports = sendEmail;