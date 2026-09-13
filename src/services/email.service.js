const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Banking Backend Team" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

async function sendRegistrationEmail(userEmail, userName) {
  const subject = "Welcome to Banking Backend App";
  const text = `Hi ${userName},\n\nWelcome to our app! We're excited to have you on board.`;
  const html = `
    <p>Hi ${userName},</p>
    <p>Welcome to Banking Backend! We're excited to have you on board.</p>
    <p>Best Regards,</p>
    <p>The Banking Backend Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
}
async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Confirmation";
  const text = `Hi ${name},\n\nYour transaction of ${amount} to account ${toAccount} has been processed successfully.`;
  const html = `
    <p>Hi ${name},</p>
    <p>Your transaction of <strong>${amount}</strong> to account <strong>${toAccount}</strong> has been processed successfully.</p>
    <p>Best Regards,</p>
    <p>The Banking Backend Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = { sendRegistrationEmail, sendTransactionEmail };
