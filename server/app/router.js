

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app
  router.get('/', controller.home.index)
  
  // 验证码
  router.get('/captcha', controller.util.captcha)
  
  router.group({name: 'user', prefix: '/user'}, router => {
    const {info, register, login, verify} = controller.user
    
    router.post('/register', register)
    router.get('/info', info)
    router.post('/login', login)
    router.get('/verify', verify)
  })

}
