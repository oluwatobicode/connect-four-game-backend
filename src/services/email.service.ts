import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (email: string, otp: string) => {
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
