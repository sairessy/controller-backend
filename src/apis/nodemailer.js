"use strict";
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user:  "brokenrock.mailer@gmail.com",
    pass: "brokenrock,47",
  }
})

export default transporter