module.exports = app => {
  const mongoose = app.mongoose
  const Schema = mongoose.Schema

  const UserSchma = new Schema({
    __v: {type: Number, select: false},
    email: {type: String, required: true},
    passwd: {type: String, required: true, select: false},
    nickname: {type: String, required: true},
    avatar: {type: String, required: false, default: ''}
  }, {timestamps: true})

  return mongoose.model('User',UserSchma )
}