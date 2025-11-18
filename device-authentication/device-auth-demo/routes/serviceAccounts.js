/**
 * Service Account Routes
 * Manage service accounts for automated processes
 */

const express = require('express');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// List service accounts
router.get('/', requireAuth, (req, res) => {
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  const serviceAccounts = serviceAccountRegistry.getAll();
  const stats = serviceAccountRegistry.getStats();
  
  res.render('service-accounts', {
    title: 'Service Accounts',
    user: req.session.user,
    serviceAccounts,
    stats
  });
});

// Create service account page
router.get('/create', requireAuth, (req, res) => {
  res.render('service-account-create', {
    title: 'Create Service Account',
    user: req.session.user,
    error: null
  });
});

// Create service account
router.post('/create', requireAuth, async (req, res) => {
  const { name, description, type, permissions, scopes } = req.body;
  
  if (!name) {
    return res.render('service-account-create', {
      title: 'Create Service Account',
      user: req.session.user,
      error: 'Service account name is required'
    });
  }
  
  try {
    const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
    const APIKeyService = require('../services/apiKeyService');
    const apiKeyService = new APIKeyService();
    
    // Create service account
    const account = serviceAccountRegistry.create({
      name,
      description: description || '',
      type: type || 'service',
      permissions: permissions ? permissions.split(',').map(p => p.trim()) : [],
      scopes: scopes ? scopes.split(',').map(s => s.trim()) : ['read'],
      audit: {
        createdBy: req.session.user.username,
        lastModifiedBy: req.session.user.username
      }
    });
    
    // Generate API key
    const keyData = await apiKeyService.generateServiceKey(account.id, {
      scopes: account.scopes,
      permissions: account.permissions
    });
    
    // Update account with key info
    account.credentials.apiKey = keyData.apiKey;
    account.credentials.apiKeyHash = keyData.keyHash;
    account.credentials.keyPrefix = keyData.keyPrefix;
    serviceAccountRegistry.save();
    
    // Redirect to account details with API key displayed
    res.render('service-account-created', {
      title: 'Service Account Created',
      user: req.session.user,
      account,
      apiKey: keyData.apiKey
    });
  } catch (error) {
    console.error('Service account creation error:', error);
    res.render('service-account-create', {
      title: 'Create Service Account',
      user: req.session.user,
      error: 'Failed to create service account'
    });
  }
});

// View service account details
router.get('/:id', requireAuth, (req, res) => {
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  const account = serviceAccountRegistry.getById(req.params.id);
  
  if (!account) {
    return res.status(404).render('404', {
      title: '404 - Service Account Not Found',
      user: req.session.user
    });
  }
  
  res.render('service-account-details', {
    title: `Service Account: ${account.name}`,
    user: req.session.user,
    account
  });
});

// Update service account status
router.post('/:id/status', requireAuth, (req, res) => {
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  const account = serviceAccountRegistry.getById(req.params.id);
  
  if (!account) {
    return res.status(404).json({ success: false, error: 'Service account not found' });
  }
  
  account.updateStatus(req.body.status);
  account.audit.lastModifiedBy = req.session.user.username;
  serviceAccountRegistry.save();
  
  res.json({ success: true, account: account.getSummary() });
});

// Add permission
router.post('/:id/permissions', requireAuth, (req, res) => {
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  const account = serviceAccountRegistry.getById(req.params.id);
  
  if (!account) {
    return res.status(404).json({ success: false, error: 'Service account not found' });
  }
  
  account.addPermission(req.body.permission);
  account.audit.lastModifiedBy = req.session.user.username;
  serviceAccountRegistry.save();
  
  res.json({ success: true, permissions: account.permissions });
});

// Delete service account
router.delete('/:id', requireAuth, (req, res) => {
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  const deleted = serviceAccountRegistry.delete(req.params.id);
  
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Service account not found' });
  }
});

module.exports = router;
