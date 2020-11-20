const svgCaptcha = require('svg-captcha')
const BaseController = require('./base')

class UtilController extends BaseController {
  async captcha() {
    const captcha = svgCaptcha.create({
      size: 4,
      fontSize: 50,
      width: 100,
      height: 40,
      noise: 3,
    })

    this.ctx.session.captcha = captcha.text
    this.ctx.response.type = 'image/svg+xml'
    console.log('captcha: ', captcha.text);
    this.ctx.body = captcha.data
    
  }

  async sendcode() {
    const {ctx} = this
    const email = ctx.query.email
    let code = Math.random().toString().slice(2, 6)
    console.log('邮箱'+ email + '验证码：' + code);
    ctx.session.emailcode = code

    const subject = 'randy验证码'
    const text = ''
    const html = `<h2>小冉社区</h2><a href="https://www.haizol.com"><span>${code}</span></a>`
    
    const hasSend = await this.service.tools.sendMail(email, subject, text, html)
    console.log(hasSend);
    if(hasSend) {
      this.message('发送成功')
    } else {
      this.error('发送失败')
    }
  }
}

module.exports = UtilController
