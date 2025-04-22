const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || '0d67b9077b2dab687e3c3b746370dbff4c7bbf1dae6bdad9417ca114792670e662e21275cc5ca30e7328e79a1b87e3ee8da502f79dcd0607db82e499d0b3d9ef';

module.exports = (req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, SECRET_KEY, (err, user) => {
      res.locals.user = !err ? user : null;
      next();
    });
  } else {
    res.locals.user = null;
    next();
  }
};
