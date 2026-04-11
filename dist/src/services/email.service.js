import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export const sendOtpEmail = async (email, otp) => {
    return await resend.emails.send({
        from: "Oluwatobi <Codingninja@oluwatobii.xyz>",
        to: email,
        subject: "Otp verification",
        html: `
    <div>
    <h1>Otp verification</h1>
    <p>Your otp is ${otp}</p>
    </div>
    `,
    });
};
export const sendResetPasswordLinkEmail = async (email, resetPasswordToken) => {
    return await resend.emails.send({
        from: "Oluwatobi <Codingninja@oluwatobii.xyz>",
        to: email,
        subject: "Reset password",
        html: `
    <div>
    <h1>Reset password</h1>
    <p>Click on the link to reset your password</p>
    <a href="http://localhost:5173/reset-password/${resetPasswordToken}">Reset password</a>
    </div>
    `,
    });
};
