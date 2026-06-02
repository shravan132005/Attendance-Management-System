// ============================================
// SCHEDULE MANAGEMENT
// ============================================

window.addSchedule = async function() {
    const classId = document.getElementById('className').value;
    const day = document.getElementById('scheduleDay').value;
    const start = document.getElementById('scheduleStart').value;
    const end = document.getElementById('scheduleEnd').value;
    const subject = document.getElementById('scheduleSubject').value;
    const room = document.getElementById('scheduleRoom').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    if (!start || !end) {
        window.showNotification('Please enter start and end times', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                class_id: classId,
                day_of_week: day,
                start_time: start,
                end_time: end,
                subject: subject,
                room: room
            })
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('scheduleStart').value = '';
            document.getElementById('scheduleEnd').value = '';
            document.getElementById('scheduleSubject').value = '';
            document.getElementById('scheduleRoom').value = '';
            window.showNotification('Schedule added successfully');
        } else {
            window.showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error adding schedule:', error);
        window.showNotification('Failed to add schedule', 'error');
    }
};

window.viewSchedule = async function() {
    const classId = document.getElementById('className').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/schedule?class_id=${classId}`);
        const schedules = await response.json();
        
        const scheduleList = document.getElementById('scheduleList');
        scheduleList.innerHTML = '';
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        schedules.forEach(schedule => {
            const row = scheduleList.insertRow();
            row.innerHTML = `
                <td>${days[schedule.day_of_week]}</td>
                <td>${schedule.start_time} - ${schedule.end_time}</td>
                <td>${schedule.subject || 'N/A'}</td>
                <td>${schedule.room || 'N/A'}</td>
                <td>
                    <button onclick="window.deleteSchedule(${schedule.id})" class="btn-danger btn-small">Delete</button>
                </td>
            `;
        });
        
        document.getElementById('scheduleModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading schedule:', error);
        window.showNotification('Failed to load schedule', 'error');
    }
};

// ============================================
// SCHEDULE MANAGEMENT
// ============================================


window.deleteSchedule = async function(scheduleId) {
    if (!confirm('Delete this schedule?')) return;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/schedule?schedule_id=${scheduleId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            window.showNotification('Schedule deleted');
            window.viewSchedule(); // refresh the modal
        } else {
            window.showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
        window.showNotification('Failed to delete schedule', 'error');
    }
};