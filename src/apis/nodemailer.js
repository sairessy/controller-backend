"use strict";
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.email",
  port: 587,
  secure: false,
  auth: {
    user:  "brokenrock.mailer@gmail.com",
    pass: "brokenrock47",
  },
});

export default transporter