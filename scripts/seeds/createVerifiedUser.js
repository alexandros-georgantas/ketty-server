const { logger } = require('@coko/server')
const Identity = require('@coko/server/src/models/identity/identity.model')
const User = require('../../models/user/user.model')

;(async ()=>{
    try{
      const email=process.argv[2]
      const username=process.argv[3]

      const result = await User.insert({
        username: username,
        password: 'Password@123',
        agreedTc: true,
        isActive: true,
      })
      console.log(result)

      const random = await Identity.insert({
        userId: result.id,
        email: email,
        isVerified: true,
        isDefault: true,
      })
    
      console.log(random)
      
    }catch(err){
      logger.error(err)
    }
})()
