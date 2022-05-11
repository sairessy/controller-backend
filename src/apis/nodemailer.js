"use strict";
import { config } from "dotenv"
import nodemailer from "nodemailer"
const env = config().parsed

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.email",
  port: 587,
  secure: false,
  auth: {
    user: env.NODEMAILER_EMAIL,
    pass: env.NODEMAILER_PASS,
  },
});

export default transporter