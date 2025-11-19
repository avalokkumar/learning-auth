document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('loginBtn');
  const messageContainer = document.getElementById('message-container');
  
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  
  const formData = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value
  };
  
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      if (data.warning) {
        showMessage('success', data.warning);
        setTimeout(() => window.location.href = data.redirect, 1000);
      } else {
        window.location.href = data.redirect;
      }
    } else {
      showMessage('error', data.error || 'Login failed');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  } catch (error) {
    showMessage('error', 'Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

function showMessage(type, message) {
  const container = document.getElementById('message-container');
  const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
  container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
}
