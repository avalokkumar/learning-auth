let debounceTimer;

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    currentPassword: document.getElementById('currentPassword').value,
    newPassword: document.getElementById('newPassword').value,
    confirmPassword: document.getElementById('confirmPassword').value
  };
  
  if (formData.newPassword !== formData.confirmPassword) {
    showMessage('error', 'New passwords do not match');
    return;
  }
  
  try {
    const response = await fetch('/password/change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showMessage('success', data.message);
      document.getElementById('changePasswordForm').reset();
      resetStrengthMeter();
    } else {
      showMessage('error', data.error || 'Password change failed');
      if (data.warnings && data.warnings.length > 0) {
        showMessage('warning', data.warnings.join(', '));
      }
    }
  } catch (error) {
    showMessage('error', 'Network error. Please try again.');
  }
});

// Password strength meter
document.getElementById('newPassword').addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => checkPasswordStrength(e.target.value), 300);
});

async function checkPasswordStrength(password) {
  if (!password) {
    resetStrengthMeter();
    return;
  }
  
  try {
    const response = await fetch('/password/strength', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    const data = await response.json();
    updateStrengthMeter(data);
  } catch (error) {
    console.error('Strength check failed:', error);
  }
}

function updateStrengthMeter(data) {
  const bar = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');
  const feedback = document.getElementById('password-feedback');
  
  const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997'];
  bar.style.width = data.percentage + '%';
  bar.style.background = colors[data.score];
  label.textContent = data.label;
  label.style.color = colors[data.score];
  
  let feedbackHTML = '';
  if (data.feedback.warning) {
    feedbackHTML += `<div>⚠️ ${data.feedback.warning}</div>`;
  }
  if (data.feedback.suggestions && data.feedback.suggestions.length > 0) {
    feedbackHTML += `<div>💡 ${data.feedback.suggestions.join(' ')}</div>`;
  }
  feedbackHTML += `<div>⏱️ Time to crack: ${data.crackTime}</div>`;
  feedback.innerHTML = feedbackHTML;
}

function resetStrengthMeter() {
  document.getElementById('strength-bar').style.width = '0%';
  document.getElementById('strength-label').textContent = '';
  document.getElementById('password-feedback').innerHTML = '';
}

// Generate password
document.getElementById('generateBtn').addEventListener('click', async () => {
  try {
    const response = await fetch('/password/generate?length=16');
    const data = await response.json();
    
    document.getElementById('generated-password').textContent = data.password;
    document.getElementById('generated-password-container').style.display = 'block';
    
    // Store for use button
    window.generatedPassword = data.password;
  } catch (error) {
    showMessage('error', 'Failed to generate password');
  }
});

// Copy generated password
document.getElementById('copyBtn').addEventListener('click', () => {
  const password = document.getElementById('generated-password').textContent;
  navigator.clipboard.writeText(password).then(() => {
    showMessage('success', 'Password copied to clipboard');
  }).catch(() => {
    showMessage('error', 'Failed to copy password');
  });
});

// Use generated password
document.getElementById('useBtn').addEventListener('click', () => {
  const password = window.generatedPassword;
  document.getElementById('newPassword').value = password;
  document.getElementById('confirmPassword').value = password;
  checkPasswordStrength(password);
  showMessage('success', 'Generated password filled in');
});

function showMessage(type, message) {
  const container = document.getElementById('message-container');
  const alertClass = type === 'error' ? 'alert-danger' : type === 'warning' ? 'alert-warning' : 'alert-success';
  container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
  setTimeout(() => {
    if (type !== 'error') container.innerHTML = '';
  }, 5000);
}
