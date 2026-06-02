// ============================================
// AUTHENTICATION & PASSWORD RESET
// ============================================

// ---------- Login ----------
window.login = async function() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        window.showNotification('Please enter username and password', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('teacherToken', data.token);
            window.currentTeacher = data.teacher;
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appContainer').classList.remove('hidden');
            document.getElementById('loginError').textContent = '';
            window.loadClasses();
            window.loadQuickStats();
            window.showNotification(`Welcome, ${data.teacher.full_name}!`);
        } else {
            document.getElementById('loginError').textContent = data.message || 'Login failed';
            window.showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        window.showNotification('Failed to connect to server', 'error');
    }
};

// ---------- Logout ----------
window.logout = function() {
    localStorage.removeItem('teacherToken');
    window.currentTeacher = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').textContent = '';
    window.showNotification('Logged out successfully');
};

// ---------- Forgot Password Modal ----------
window.showForgotPassword = function() {
    document.getElementById('forgotPasswordModal').classList.remove('hidden');
};

window.closeForgotPassword = function() {
    document.getElementById('forgotPasswordModal').classList.add('hidden');
    document.getElementById('resetEmail').value = '';
    document.getElementById('resetToken').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('resetMessage').textContent = '';
    document.getElementById('resetMessage').style.display = 'none';
    document.getElementById('resetTokenGroup').classList.add('hidden');
    document.getElementById('newPasswordGroup').classList.add('hidden');
    document.getElementById('completeBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'block';
};

// ---------- Initiate Password Reset ----------
window.initiatePasswordReset = async function() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        window.showMessage('Please enter your email', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        if (data.success) {
            window.showMessage(`Reset token: ${data.reset_token}`, 'success');
            document.getElementById('resetTokenGroup').classList.remove('hidden');
            document.getElementById('newPasswordGroup').classList.remove('hidden');
            document.getElementById('completeBtn').style.display = 'block';
            document.getElementById('resetBtn').style.display = 'none';
        } else {
            window.showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Reset error:', error);
        window.showMessage('Failed to initiate reset', 'error');
    }
};

// ---------- Complete Password Reset ----------
window.completePasswordReset = async function() {
    const token = document.getElementById('resetToken').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    
    if (!token || !newPassword) {
        window.showMessage('All fields are required', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        window.showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });
        
        const data = await response.json();
        if (data.success) {
            window.showMessage('Password reset successful! You can now login.', 'success');
            setTimeout(() => {
                window.closeForgotPassword();
                window.showNotification('Password reset successful');
            }, 2000);
        } else {
            window.showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Reset error:', error);
        window.showMessage('Failed to reset password', 'error');
    }
};

// ---------- Helper for modal messages ----------
window.showMessage = function(message, type) {
    const messageDiv = document.getElementById('resetMessage');
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    messageDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
};