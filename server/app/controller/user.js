const md5 = require('md5');
const jwt = require('jsonwebtoken')
const BaseController = require('./base')
const HashSalt = ":Randyqin@hz.@qwe"

const createRule = {
  email: {type:'email'},
  nickname: {type:'string'},
  passwd: {type:'string'},
  captcha: {type:'string'},

}

class UserController extends BaseController {

  async login() {
    // this.success('token')
    const {ctx, app} = this
    const {email, captcha, passwd} = ctx.request.body
    if(captcha.toUpperCase() !== ctx.session.captcha.toUpperCase()) {
      this.error('验证码错误')
    }

    const user  = await ctx.model.User.findOne({
      email,
      passwd: md5(passwd + HashSalt)
    })

    if(!user) {
      return this.error('用户名密码错误')
    }
    // 用户的信息加密成token 返回
    const token = jwt.sign({
     _id: user._id,
      email,
    },app.config.jwt.secret, {
      expiresIn: '1h'
    })

    this.success({token, email, nickname: user.nickname})
  }

  async register() {
    const {ctx} = this
    try{
      ctx.validate(createRule)
    }catch(e) {
      return this.error('参数校验失败', -1, e.errors)
    }

    const {email, passwd, captcha, nickname} = ctx.request.body
    if(captcha.toUpperCase() !== ctx.session.captcha.toUpperCase()) {
      return this.error('验证码错误')
    }
    if(emailcode !== ctx.session.emailcode) {
      return this.error('邮箱验证码错误')
    }
    if(await this.checkEmail(email)) {
      return this.error('邮箱重复')
    } else {
      const ret = await ctx.model.User.create({
        email,
        nickname,
        passwd: md5(passwd + HashSalt)
      })
      if(ret._id) {
        this.message('注册成功')
      }
    }
  }

  async checkEmail(email) {
    const user = await this.ctx.model.User.findOne({email})
    return user
  }

  async verify() {
    // 校验用户名是否存在
  }

  async info() {
    const {ctx} = this
    // 还不知道是哪个邮件，应该从token里读取
    // 有的接口需要从token读取数据，有的不需要
    // const {email} = ctx
  }
}

module.exports = UserController