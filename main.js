// ============================================
// APPLICATION INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme (dark/light)
    window.loadTheme();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    window.updateDateDisplay();
    
    // Event listeners for class & date changes
    document.getElementById('className').addEventListener('change', window.loadStudents);
    document.getElementById('attendanceDate').addEventListener('change', window.updateDateDisplay);
    
    // Auto-login if token exists
    const token = localStorage.getItem('teacherToken');
    if (token) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        window.loadClasses();
        window.loadQuickStats();
    }
});