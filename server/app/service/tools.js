const {Service} = require('egg')
const nodemailer = require('nodemailer')

const userEmail = 'randyqin0423@126.com'
const transporter = nodemailer.createTransport({
  service: '126',
  secureConnection: true,
  auth: {
    user: userEmail,
    pass:'qinran0423'
  }
})



class ToolService extends Service{
  async sendMail(email, subject, text, html) {
    console.log(email, subject, html)
    const mailOptions = {
      from: userEmail,
      cc: userEmail,
      to: email,
      subject,
      text,
      html,
    }
    try {
      console.log('xxxxxxxxxxxxxxxxxxxxxxxx');
      let ret =  await transporter.sendMail(mailOptions)
      console.log('ret', ret);
      return true
    } catch (err) {
      console.log('email error', err)
      return false
    }
  }
}


module.exports = ToolService