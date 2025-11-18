/**
 * Authentication Middleware
 * Supports multiple HTTP authentication methods
 */

const basicAuthService = require('../services/basicAuthService');
const digestAuthService = require('../services/digestAuthService');
const bearerAuthService = require('../services/bearerAuthService');
const apiKeyService = require('../services/apiKeyService');

/**
 * HTTP Basic Authentication Middleware
 */
const basicAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', basicAuthService.generateChallenge());
    return res.status(401).json({ error: 'Basic authentication required' });
  }
  
  const result = await basicAuthService.authenticate(authHeader);
  
  if (!result.success) {
    res.setHeader('WWW-Authenticate', basicAuthService.generateChallenge());
    return res.status(401).json({ error: result.error });
  }
  
  req.user = result.user;
  req.authMethod = 'basic';
  next();
};

/**
 * HTTP Digest Authentication Middleware
 */
const digestAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Digest ')) {
    const challenge = digestAuthService.generateChallenge();
    res.setHeader('WWW-Authenticate', challenge.header);
    return res.status(401).json({ error: 'Digest authentication required' });
  }
  
  const result = await digestAuthService.authenticate(
    authHeader,
    req.method,
    req.originalUrl
  );
  
  if (!result.success) {
    const challenge = digestAuthService.generateChallenge(result.stale);
    res.setHeader('WWW-Authenticate', challenge.header);
    return res.status(401).json({ error: result.error });
  }
  
  req.user = result.user;
  req.authMethod = 'digest';
  next();
};

/**
 * Bearer Token Authentication Middleware
 */
const bearerAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.setHeader('WWW-Authenticate', bearerAuthService.generateChallenge());
    return res.status(401).json({ error: 'Bearer token required' });
  }
  
  const result = await bearerAuthService.authenticate(authHeader);
  
  if (!result.success) {
    const error = result.expired ? 'invalid_token' : 'invalid_token';
    const description = result.error;
    res.setHeader('WWW-Authenticate', bearerAuthService.generateChallenge(error, description));
    return res.status(401).json({ error: description });
  }
  
  req.user = result.user;
  req.tokenPayload = result.payload;
  req.authMethod = 'bearer';
  next();
};

/**
 * API Key Authentication Middleware
 */
const apiKeyAuth = async (req, res, next) => {
  const result = await apiKeyService.authenticate(req.headers);
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  req.user = result.user;
  req.apiKeyInfo = result.apiKey;
  req.authMethod = 'apikey';
  next();
};

/**
 * Multiple Authentication Methods Middleware
 * Tries multiple auth methods in order
 */
const multiAuth = (...methods) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // Try each authentication method
    for (const method of methods) {
      let result;
      
      switch (method) {
        case 'basic':
          if (authHeader && authHeader.startsWith('Basic ')) {
            result = await basicAuthService.authenticate(authHeader);
            if (result.success) {
              req.user = result.user;
              req.authMethod = 'basic';
              return next();
            }
          }
          break;
          
        case 'digest':
          if (authHeader && authHeader.startsWith('Digest ')) {
            result = await digestAuthService.authenticate(authHeader, req.method, req.originalUrl);
            if (result.success) {
              req.user = result.user;
              req.authMethod = 'digest';
              return next();
            }
          }
          break;
          
        case 'bearer':
          if (authHeader && authHeader.startsWith('Bearer ')) {
            result = await bearerAuthService.authenticate(authHeader);
            if (result.success) {
              req.user = result.user;
              req.authMethod = 'bearer';
              return next();
            }
          }
          break;
          
        case 'apikey':
          result = await apiKeyService.authenticate(req.headers);
          if (result.success) {
            req.user = result.user;
            req.authMethod = 'apikey';
            return next();
          }
          break;
      }
    }
    
    // If no method succeeded, send appropriate challenge
    if (methods.includes('basic')) {
      res.setHeader('WWW-Authenticate', basicAuthService.generateChallenge());
    } else if (methods.includes('bearer')) {
      res.setHeader('WWW-Authenticate', bearerAuthService.generateChallenge());
    }
    
    return res.status(401).json({ error: 'Authentication required' });
  };
};

/**
 * Session Authentication Middleware
 * For web pages
 */
const sessionAuth = (req, res, next) => {
  if (!req.session.authenticated || !req.session.userId) {
    return res.redirect('/login');
  }
  
  req.user = req.session.user;
  req.authMethod = 'session';
  next();
};

/**
 * Optional Authentication Middleware
 * Doesn't fail if not authenticated
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }
  
  // Try to authenticate but don't fail
  if (authHeader.startsWith('Basic ')) {
    const result = await basicAuthService.authenticate(authHeader);
    if (result.success) {
      req.user = result.user;
      req.authMethod = 'basic';
    }
  } else if (authHeader.startsWith('Bearer ')) {
    const result = await bearerAuthService.authenticate(authHeader);
    if (result.success) {
      req.user = result.user;
      req.authMethod = 'bearer';
    }
  } else if (authHeader.startsWith('Digest ')) {
    const result = await digestAuthService.authenticate(authHeader, req.method, req.originalUrl);
    if (result.success) {
      req.user = result.user;
      req.authMethod = 'digest';
    }
  }
  
  // Try API key
  const apiResult = await apiKeyService.authenticate(req.headers);
  if (apiResult.success) {
    req.user = apiResult.user;
    req.authMethod = 'apikey';
  }
  
  next();
};

module.exports = {
  basicAuth,
  digestAuth,
  bearerAuth,
  apiKeyAuth,
  multiAuth,
  sessionAuth,
  optionalAuth
};
