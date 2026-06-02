// Load quick statistics for the dashboard
window.loadQuickStats = async function() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/today-stats`);
        const data = await response.json();
        
        const statsDiv = document.getElementById('quickStats');
        
        if (data.success) {
            statsDiv.innerHTML = `
                <div class="stat-card stat-total">
                    <h3 style="margin: 0; font-size: 24px;">${data.total_classes}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Total Classes</p>
                </div>
                <div class="stat-card stat-present">
                    <h3 style="margin: 0; font-size: 24px;">${data.present}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Present Today</p>
                </div>
                <div class="stat-card stat-absent">
                    <h3 style="margin: 0; font-size: 24px;">${data.absent}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Absent Today</p>
                </div>
                <div class="stat-card stat-late">
                    <h3 style="margin: 0; font-size: 24px;">${data.late}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Late Today</p>
                </div>
            `;
        } else {
            statsDiv.innerHTML = window.fallbackStatsHTML();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('quickStats').innerHTML = window.fallbackStatsHTML();
    }
};

// Helper to generate fallback stats HTML (not exposed to window, internal)
window.fallbackStatsHTML = function() {
    return `
        <div class="stat-card stat-total">
            <h3 style="margin: 0; font-size: 24px;">0</h3>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Total Classes</p>
        </div>
        <div class="stat-card stat-present">
            <h3 style="margin: 0; font-size: 24px;">0</h3>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Present Today</p>
        </div>
        <div class="stat-card stat-absent">
            <h3 style="margin: 0; font-size: 24px;">0</h3>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Absent Today</p>
        </div>
        <div class="stat-card stat-late">
            <h3 style="margin: 0; font-size: 24px;">0</h3>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Late Today</p>
        </div>
    `;
};

// Toggle attendance status: Absent → Present → Late → Absent
window.toggleStatus = async function(cell, studentId) {
    const currentStatus = cell.textContent.trim();
    let newStatus;
    
    if (currentStatus === 'Absent') newStatus = 'Present';
    else if (currentStatus === 'Present') newStatus = 'Late';
    else newStatus = 'Absent';
    
    const date = document.getElementById('attendanceDate').value;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                date: date,
                status: newStatus
            })
        });
        
        const data = await response.json();
        if (data.success) {
            cell.textContent = newStatus;
            cell.className = `${newStatus.toLowerCase()} status-toggle`;
            window.loadQuickStats();   // refresh stats
        } else {
            window.showNotification('Failed to update attendance', 'error');
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        window.showNotification('Failed to update attendance', 'error');
    }
};

// ============================================
// BULK ACTIONS & NOTIFICATIONS
// ============================================

// Bulk mark (exposed)
window.markAllPresent = async function() { await bulkUpdateStatus('Present'); };
window.markAllAbsent  = async function() { await bulkUpdateStatus('Absent'); };
window.markAllLate    = async function() { await bulkUpdateStatus('Late'); };

// Internal bulk update helper – NOT exposed to window
async function bulkUpdateStatus(status) {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/students?class_id=${classId}`);
        const students = await response.json();
        
        for (const student of students) {
            await fetch(`${window.API_BASE_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: student.id,
                    date: date,
                    status: status
                })
            });
        }
        
        window.loadStudents();
        window.loadQuickStats();
        window.showNotification(`All students marked as ${status}`);
    } catch (error) {
        console.error('Error bulk updating:', error);
        window.showNotification('Failed to update attendance', 'error');
    }
}

// Single student notification
window.sendNotification = async function(studentId) {
    const date = document.getElementById('attendanceDate').value;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                date: date,
                type: 'absence'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            window.showNotification('Notification sent successfully');
        } else {
            window.showNotification(data.message || 'Failed to send notification', 'error');
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        window.showNotification('Failed to send notification', 'error');
    }
};

// Notify all absent students
window.sendAllNotifications = async function() {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    if (!confirm('Send absence notifications to all parents of absent students?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance?class_id=${classId}&date=${date}`);
        const attendanceData = await response.json();
        
        let sentCount = 0;
        let errorCount = 0;
        
        for (const student of attendanceData) {
            if (student.status === 'Absent' && student.parent_email) {
                try {
                    const notifyResponse = await fetch(`${window.API_BASE_URL}/send-notification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            student_id: student.id,
                            date: date,
                            type: 'absence'
                        })
                    });
                    
                    const notifyData = await notifyResponse.json();
                    if (notifyData.success) {
                        sentCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }
        }
        
        window.showNotification(`Notifications sent: ${sentCount} successful, ${errorCount} failed`);
    } catch (error) {
        console.error('Error sending notifications:', error);
        window.showNotification('Failed to send notifications', 'error');
    }
};

// ============================================
// AUTO-MARK ATTENDANCE
// ============================================

window.autoMarkAttendance = async function() {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    if (!confirm('Automatically mark attendance based on current time?')) {
        return;
    }
    
    try {
        await window.markAllPresent();   // reuse bulk action
        window.showNotification('Attendance auto-marked as present');
    } catch (error) {
        console.error('Error auto-marking:', error);
        window.showNotification('Failed to auto-mark attendance', 'error');
    }
};

// ============================================
// CLEAR ATTENDANCE
// ============================================

window.clearAttendance = async function() {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    if (!confirm(`Clear all attendance for ${date}? This cannot be undone.`)) {
        return;
    }
    
    try {
        await window.markAllAbsent();
        window.showNotification('Attendance cleared for selected date');
    } catch (error) {
        console.error('Error clearing attendance:', error);
        window.showNotification('Failed to clear attendance', 'error');
    }
};