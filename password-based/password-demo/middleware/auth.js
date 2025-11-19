// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.error = 'Please log in to access this page';
  res.redirect('/login');
};

const requireNoAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};

module.exports = { requireAuth, requireNoAuth };
