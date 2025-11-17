/**
 * Certificate Service
 * Handles certificate verification, parsing, and validation
 */

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

class CertificateService {
  constructor() {
    // Load CA certificate for verification
    const caCertPath = path.join(__dirname, '..', 'certs', 'ca-cert.pem');
    if (fs.existsSync(caCertPath)) {
      const caCertPem = fs.readFileSync(caCertPath, 'utf8');
      this.caCert = forge.pki.certificateFromPem(caCertPem);
    }
  }

  /**
   * Parse certificate from PEM
   */
  parseCertificate(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      
      return {
        version: cert.version + 1, // Version is 0-indexed
        serialNumber: cert.serialNumber,
        
        // Subject information
        subject: {
          commonName: this.getField(cert.subject, 'CN'),
          emailAddress: this.getField(cert.subject, 'emailAddress'),
          organization: this.getField(cert.subject, 'O'),
          organizationalUnit: this.getField(cert.subject, 'OU'),
          country: this.getField(cert.subject, 'C'),
          locality: this.getField(cert.subject, 'L'),
          state: this.getField(cert.subject, 'ST')
        },
        
        // Issuer information
        issuer: {
          commonName: this.getField(cert.issuer, 'CN'),
          organization: this.getField(cert.issuer, 'O'),
          organizationalUnit: this.getField(cert.issuer, 'OU'),
          country: this.getField(cert.issuer, 'C')
        },
        
        // Validity period
        validity: {
          notBefore: cert.validity.notBefore,
          notAfter: cert.validity.notAfter,
          isValid: this.isValidDate(cert.validity.notBefore, cert.validity.notAfter)
        },
        
        // Public key information
        publicKey: {
          algorithm: cert.publicKey.n ? 'RSA' : 'Unknown',
          bits: cert.publicKey.n ? cert.publicKey.n.bitLength() : 0,
          modulus: cert.publicKey.n ? cert.publicKey.n.toString(16).substring(0, 32) + '...' : '',
          exponent: cert.publicKey.e ? cert.publicKey.e.toString(10) : ''
        },
        
        // Signature
        signatureAlgorithm: cert.signatureOid ? this.getSignatureAlgorithm(cert.signatureOid) : 'Unknown',
        
        // Extensions
        extensions: this.parseExtensions(cert.extensions),
        
        // Certificate fingerprints
        fingerprints: {
          sha1: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex(),
          sha256: forge.md.sha256.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex()
        },
        
        // PEM format
        pem: certPem,
        
        // Original certificate object
        _cert: cert
      };
    } catch (error) {
      throw new Error(`Failed to parse certificate: ${error.message}`);
    }
  }

  /**
   * Get field from certificate subject/issuer
   */
  getField(entity, fieldName) {
    try {
      const field = entity.getField(fieldName);
      return field ? field.value : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse certificate extensions
   */
  parseExtensions(extensions) {
    if (!extensions) return [];
    
    return extensions.map(ext => {
      const parsed = {
        name: ext.name,
        critical: ext.critical || false
      };
      
      // Parse specific extensions
      switch (ext.name) {
        case 'keyUsage':
          parsed.value = {
            digitalSignature: ext.digitalSignature || false,
            nonRepudiation: ext.nonRepudiation || false,
            keyEncipherment: ext.keyEncipherment || false,
            dataEncipherment: ext.dataEncipherment || false,
            keyAgreement: ext.keyAgreement || false,
            keyCertSign: ext.keyCertSign || false,
            cRLSign: ext.cRLSign || false
          };
          break;
          
        case 'extKeyUsage':
          parsed.value = {
            serverAuth: ext.serverAuth || false,
            clientAuth: ext.clientAuth || false,
            codeSigning: ext.codeSigning || false,
            emailProtection: ext.emailProtection || false,
            timeStamping: ext.timeStamping || false
          };
          break;
          
        case 'basicConstraints':
          parsed.value = {
            cA: ext.cA || false,
            pathLen: ext.pathLen
          };
          break;
          
        case 'subjectAltName':
          parsed.value = ext.altNames ? ext.altNames.map(alt => ({
            type: this.getAltNameType(alt.type),
            value: alt.value || alt.ip
          })) : [];
          break;
          
        default:
          parsed.value = ext.value;
      }
      
      return parsed;
    });
  }

  /**
   * Get alternative name type
   */
  getAltNameType(type) {
    const types = {
      1: 'email',
      2: 'DNS',
      6: 'URI',
      7: 'IP'
    };
    return types[type] || 'other';
  }

  /**
   * Get signature algorithm name
   */
  getSignatureAlgorithm(oid) {
    const algorithms = {
      '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
      '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
      '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
      '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption'
    };
    return algorithms[oid] || oid;
  }

  /**
   * Check if certificate dates are valid
   */
  isValidDate(notBefore, notAfter) {
    const now = new Date();
    return now >= notBefore && now <= notAfter;
  }

  /**
   * Verify certificate signature against CA
   */
  verifyCertificate(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      
      // Check if CA cert is loaded
      if (!this.caCert) {
        return {
          valid: false,
          error: 'CA certificate not found'
        };
      }
      
      // Verify signature
      const caStore = forge.pki.createCaStore([this.caCert]);
      
      try {
        forge.pki.verifyCertificateChain(caStore, [cert]);
        
        // Check validity dates
        if (!this.isValidDate(cert.validity.notBefore, cert.validity.notAfter)) {
          return {
            valid: false,
            error: 'Certificate expired or not yet valid'
          };
        }
        
        return {
          valid: true,
          subject: this.getField(cert.subject, 'CN'),
          email: this.getField(cert.subject, 'emailAddress')
        };
      } catch (verifyError) {
        return {
          valid: false,
          error: `Certificate verification failed: ${verifyError.message}`
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Invalid certificate: ${error.message}`
      };
    }
  }

  /**
   * Extract user information from certificate
   */
  getUserFromCertificate(cert) {
    if (!cert) return null;
    
    // Get certificate subject info
    const subject = cert.subject;
    const issuer = cert.issuer;
    
    // Extract relevant fields
    const getSubjectField = (fieldName) => {
      try {
        return subject.getField(fieldName)?.value || null;
      } catch {
        return null;
      }
    };
    
    return {
      commonName: getSubjectField('CN'),
      email: getSubjectField('emailAddress'),
      organization: getSubjectField('O'),
      organizationalUnit: getSubjectField('OU'),
      country: getSubjectField('C'),
      issuerCommonName: issuer.getField('CN')?.value || null,
      serialNumber: cert.serialNumber,
      fingerprint: forge.md.sha256.create()
        .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
        .digest()
        .toHex(),
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      isValid: this.isValidDate(cert.validity.notBefore, cert.validity.notAfter)
    };
  }

  /**
   * Get certificate details for display
   */
  getCertificateDetails(certPem) {
    try {
      const parsed = this.parseCertificate(certPem);
      const verification = this.verifyCertificate(certPem);
      
      return {
        ...parsed,
        verification
      };
    } catch (error) {
      throw new Error(`Failed to get certificate details: ${error.message}`);
    }
  }

  /**
   * Generate certificate info summary
   */
  getCertificateSummary(cert) {
    const user = this.getUserFromCertificate(cert);
    
    return {
      authenticated: true,
      method: 'certificate',
      user: {
        name: user.commonName,
        email: user.email,
        organization: user.organization
      },
      certificate: {
        serialNumber: user.serialNumber,
        fingerprint: user.fingerprint.substring(0, 16) + '...',
        validFrom: user.validFrom.toISOString(),
        validTo: user.validTo.toISOString(),
        issuer: user.issuerCommonName
      }
    };
  }

  /**
   * Validate client certificate from request
   */
  validateClientCertificate(req) {
    // Check if client certificate is present
    if (!req.client.authorized) {
      return {
        valid: false,
        error: 'Client certificate not authorized'
      };
    }
    
    const cert = req.connection.getPeerCertificate();
    
    if (!cert || !cert.subject) {
      return {
        valid: false,
        error: 'No client certificate provided'
      };
    }
    
    // Extract user info
    const user = this.getUserFromCertificate(cert);
    
    if (!user.isValid) {
      return {
        valid: false,
        error: 'Certificate expired or not yet valid'
      };
    }
    
    return {
      valid: true,
      user
    };
  }
}

module.exports = new CertificateService();
