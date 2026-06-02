// ============================================
// HOLIDAY MANAGEMENT
// ============================================

// Add a new holiday
window.addHoliday = async function() {
    const date = document.getElementById('holidayDate').value;
    const name = document.getElementById('holidayName').value.trim();
    const description = document.getElementById('holidayDescription').value.trim();
    
    if (!date || !name) {
        window.showNotification('Please enter date and holiday name', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, name, description })
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('holidayDate').value = '';
            document.getElementById('holidayName').value = '';
            document.getElementById('holidayDescription').value = '';
            window.showNotification('Holiday added successfully');
        } else {
            window.showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error adding holiday:', error);
        window.showNotification('Failed to add holiday', 'error');
    }
};

// View holidays for current month
window.viewHolidays = async function() {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        
        const response = await fetch(`${window.API_BASE_URL}/holidays?year=${year}&month=${month}`);
         if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }
        const holidays = await response.json();
        
        const holidaysList = document.getElementById('holidaysList');
        holidaysList.innerHTML = '';
        
        holidays.forEach(holiday => {
            const row = holidaysList.insertRow();
            row.innerHTML = `
                <td>${holiday.date}</td>
                <td>${holiday.name}</td>
                <td>${holiday.description || 'N/A'}</td>
                <td>
                    <button onclick="window.deleteHoliday(${holiday.id})" class="btn-danger btn-small">Delete</button>
                </td>
            `;
        });
        
        document.getElementById('holidaysModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading holidays:', error);
        window.showNotification('Failed to load holidays', 'error');
    }
};

// Delete a holiday
window.deleteHoliday = async function(holidayId) {
    if (!confirm('Delete this holiday?')) return;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/holidays?holiday_id=${holidayId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            window.showNotification('Holiday deleted');
            window.viewHolidays(); // refresh the modal
        } else {
            window.showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting holiday:', error);
        window.showNotification('Failed to delete holiday', 'error');
    }
};

// Check if a specific date is a holiday
window.checkHoliday = async function() {
    const date = document.getElementById('attendanceDate').value;
    
    if (!date) {
        window.showNotification('Please select a date first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/check-holiday?date=${date}`);
        const data = await response.json();
        
        if (data.is_holiday) {
            window.showNotification(`⚠️ ${date} is ${data.holiday.name} (Holiday)`, 'warning');
        } else {
            window.showNotification(`✅ ${date} is a working day`, 'success');
        }
    } catch (error) {
        console.error('Error checking holiday:', error);
        window.showNotification('Failed to check holiday', 'error');
    }
};