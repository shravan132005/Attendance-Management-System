// Format and display the selected date in the header
window.updateDateDisplay = function() {
    const dateInput = document.getElementById('attendanceDate').value;
    const date = new Date(dateInput);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = date.toLocaleDateString('en-US', options);
};

window.closeEditModal = function() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('photoUpload').value = '';
    window.currentEditStudentId = null;
    window.currentEditStudentPhoto = null;
};

// ============================================
// MODAL CLOSERS
// ============================================

window.closeEditModal = function() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('photoUpload').value = '';
    window.currentEditStudentId = null;
    window.currentEditStudentPhoto = null;
};

window.closeScheduleModal = function() {
    document.getElementById('scheduleModal').classList.add('hidden');
};

window.closeHolidaysModal = function() {
    document.getElementById('holidaysModal').classList.add('hidden');
};

window.closeAnalyticsModal = function() {
    document.getElementById('analyticsModal').classList.add('hidden');
};

window.closeFullReportModal = function() {
    document.getElementById('fullReportModal').classList.add('hidden');
};

window.closeBackupModal = function() {
    document.getElementById('backupModal').classList.add('hidden');
};

window.closeRestoreModal = function() {
    document.getElementById('restoreModal').classList.add('hidden');
    document.getElementById('restoreFile').value = '';
    document.getElementById('restoreWarning').style.display = 'none';
};

window.closeAnalyticsModal = function() {
    document.getElementById('analyticsModal').classList.add('hidden');
};

window.closeFullReportModal = function() {
    document.getElementById('fullReportModal').classList.add('hidden');
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================

window.showNotification = function(message, type = "success") {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    
    // Set background color based on type
    const bgColor = {
        success: "#4CAF50",
        error: "#f44336",
        warning: "#ff9800",
        info: "#2196F3"
    }[type] || "#4CAF50";
    
    notification.style.backgroundColor = bgColor;
    notification.classList.add("show-notification");
    
    setTimeout(() => {
        notification.classList.remove("show-notification");
    }, 3000);
};