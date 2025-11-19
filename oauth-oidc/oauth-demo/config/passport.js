/**
 * Passport.js OAuth Strategy Configuration
 * Configures Google, Microsoft, and GitHub OAuth 2.0 strategies
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
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
// GOOGLE OAUTH 2.0 STRATEGY
// ============================================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3008/auth/google/callback',
    scope: ['profile', 'email'],
    state: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth callback received');
      
      // Extract user data from Google profile
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const userData = {
        email: email,
        displayName: profile.displayName,
        givenName: profile.name?.givenName || '',
        familyName: profile.name?.familyName || '',
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        provider: 'google',
        providerId: profile.id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
        scopes: ['profile', 'email'],
        rawProfile: profile._json
      };
      
      // Check if user already exists
      let user = database.getUserByProvider('google', profile.id);
      
      if (!user) {
        // Check if user exists with same email from different provider
        user = database.getUserByEmail(email);
        
        if (user) {
          // Update existing user with Google credentials
          database.updateUser(user.id, {
            provider: 'google',
            providerId: profile.id,
            accessToken: database.encrypt(accessToken),
            refreshToken: refreshToken ? database.encrypt(refreshToken) : null,
            avatar: userData.avatar,
            tokenExpiry: userData.tokenExpiry
          });
          console.log(`Linked Google account to existing user: ${email}`);
        } else {
          // Create new user
          user = database.createUser(userData);
          console.log(`Created new user from Google: ${email}`);
        }
      } else {
        // Update existing Google user
        database.updateUser(user.id, {
          accessToken: database.encrypt(accessToken),
          refreshToken: refreshToken ? database.encrypt(refreshToken) : null,
          avatar: userData.avatar,
          displayName: userData.displayName,
          tokenExpiry: userData.tokenExpiry
        });
        console.log(`Updated existing Google user: ${email}`);
      }
      
      database.recordLogin(user.id, 'google');
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
  
  console.log('✓ Google OAuth strategy configured');
} else {
  console.log('⚠ Google OAuth not configured (missing credentials)');
}

// ============================================
// MICROSOFT OAUTH 2.0 STRATEGY
// ============================================

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3008/auth/microsoft/callback',
    scope: ['user.read', 'openid', 'profile', 'email'],
    tenant: 'common',
    authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Microsoft OAuth callback received');
      
      // Extract user data from Microsoft profile
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : 
                    profile._json?.mail || profile._json?.userPrincipalName || null;
      
      const userData = {
        email: email,
        displayName: profile.displayName || profile._json?.displayName,
        givenName: profile.name?.givenName || profile._json?.givenName || '',
        familyName: profile.name?.familyName || profile._json?.surname || '',
        avatar: null, // Microsoft Graph doesn't provide photo URL directly
        provider: 'microsoft',
        providerId: profile.id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        scopes: ['user.read', 'openid', 'profile', 'email'],
        rawProfile: profile._json
      };
      
      // Check if user already exists
      let user = database.getUserByProvider('microsoft', profile.id);
      
      if (!user) {
        user = database.getUserByEmail(email);
        
        if (user) {
          database.updateUser(user.id, {
            provider: 'microsoft',
            providerId: profile.id,
            accessToken: database.encrypt(accessToken),
            refreshToken: refreshToken ? database.encrypt(refreshToken) : null,
            tokenExpiry: userData.tokenExpiry
          });
          console.log(`Linked Microsoft account to existing user: ${email}`);
        } else {
          user = database.createUser(userData);
          console.log(`Created new user from Microsoft: ${email}`);
        }
      } else {
        database.updateUser(user.id, {
          accessToken: database.encrypt(accessToken),
          refreshToken: refreshToken ? database.encrypt(refreshToken) : null,
          displayName: userData.displayName,
          tokenExpiry: userData.tokenExpiry
        });
        console.log(`Updated existing Microsoft user: ${email}`);
      }
      
      database.recordLogin(user.id, 'microsoft');
      
      return done(null, user);
    } catch (error) {
      console.error('Microsoft OAuth error:', error);
      return done(error, null);
    }
  }));
  
  console.log('✓ Microsoft OAuth strategy configured');
} else {
  console.log('⚠ Microsoft OAuth not configured (missing credentials)');
}

// ============================================
// GITHUB OAUTH 2.0 STRATEGY
// ============================================

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3008/auth/github/callback',
    scope: ['user:email', 'read:user']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GitHub OAuth callback received');
      
      // Extract user data from GitHub profile
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : 
                    profile._json?.email || `${profile.username}@github.local`;
      
      const userData = {
        email: email,
        displayName: profile.displayName || profile.username,
        givenName: profile._json?.name?.split(' ')[0] || '',
        familyName: profile._json?.name?.split(' ').slice(1).join(' ') || '',
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : profile._json?.avatar_url,
        provider: 'github',
        providerId: profile.id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        scopes: ['user:email', 'read:user'],
        rawProfile: profile._json
      };
      
      // Check if user already exists
      let user = database.getUserByProvider('github', profile.id);
      
      if (!user) {
        user = database.getUserByEmail(email);
        
        if (user) {
          database.updateUser(user.id, {
            provider: 'github',
            providerId: profile.id,
            accessToken: database.encrypt(accessToken),
            refreshToken: refreshToken ? database.encrypt(refreshToken) : null,
            avatar: userData.avatar,
            tokenExpiry: userData.tokenExpiry
          });
          console.log(`Linked GitHub account to existing user: ${email}`);
        } else {
          user = database.createUser(userData);
          console.log(`Created new user from GitHub: ${email}`);
        }
      } else {
        database.updateUser(user.id, {
          accessToken: database.encrypt(accessToken),
          refreshToken: refreshToken ? database.encrypt(refreshToken) : null,
          avatar: userData.avatar,
          displayName: userData.displayName,
          tokenExpiry: userData.tokenExpiry
        });
        console.log(`Updated existing GitHub user: ${email}`);
      }
      
      database.recordLogin(user.id, 'github');
      
      return done(null, user);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }));
  
  console.log('✓ GitHub OAuth strategy configured');
} else {
  console.log('⚠ GitHub OAuth not configured (missing credentials)');
}

module.exports = passport;
