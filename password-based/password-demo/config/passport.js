/**
 * Passport.js Configuration for OAuth Alternative Auth
 * Supports Google and GitHub as alternatives to password auth
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const database = require('../database/Database');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
  const user = database.getUserById(id);
  done(null, user);
});

// ============================================
// GOOGLE OAUTH STRATEGY
// ============================================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3009/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let user = database.getUserByOAuthProvider('google', profile.id);
      
      if (!user) {
        // Check if user exists with same email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        user = email ? database.getUserByEmail(email) : null;
        
        if (user) {
          // Link Google account to existing user
          database.linkOAuthProvider(user.id, 'google', profile.id, profile);
        } else {
          // Create new user
          const userData = {
            username: profile.emails[0].value.split('@')[0] + '_google',
            email: profile.emails[0].value,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            passwordHash: 'OAUTH_USER',  // No password for OAuth users
            passwordSalt: 'OAUTH',
            isVerified: true  // Email verified by Google
          };
          
          user = database.createUser(userData);
          database.linkOAuthProvider(user.id, 'google', profile.id, profile);
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
  
  console.log('✓ Google OAuth strategy configured');
} else {
  console.log('⚠ Google OAuth not configured');
}

// ============================================
// GITHUB OAUTH STRATEGY
// ============================================

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3009/auth/github/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = database.getUserByOAuthProvider('github', profile.id);
      
      if (!user) {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.local`;
        user = database.getUserByEmail(email);
        
        if (user) {
          database.linkOAuthProvider(user.id, 'github', profile.id, profile);
        } else {
          const userData = {
            username: profile.username + '_github',
            email: email,
            firstName: profile.displayName || profile.username,
            lastName: '',
            passwordHash: 'OAUTH_USER',
            passwordSalt: 'OAUTH',
            isVerified: true
          };
          
          user = database.createUser(userData);
          database.linkOAuthProvider(user.id, 'github', profile.id, profile);
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
  
  console.log('✓ GitHub OAuth strategy configured');
} else {
  console.log('⚠ GitHub OAuth not configured');
}

module.exports = passport;
