let debounceTimer;

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('registerBtn');
  const messageContainer = document.getElementById('message-container');
  
  btn.disabled = true;
  btn.textContent = 'Creating account...';
  
  const formData = {
    username: document.getElementById('username').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value
  };
  
  if (formData.password !== formData.confirmPassword) {
    showMessage('error', 'Passwords do not match');
    btn.disabled = false;
    btn.textContent = 'Create Account';
    return;
  }
  
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showMessage('success', 'Account created successfully!');
      setTimeout(() => window.location.href = data.redirect, 1000);
    } else {
      showMessage('error', data.error || 'Registration failed');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  } catch (error) {
    showMessage('error', 'Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

// Password strength meter
document.getElementById('password').addEventListener('input', (e) => {
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

function showMessage(type, message) {
  const container = document.getElementById('message-container');
  const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
  container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
}
