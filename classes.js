// ============================================
// CLASS MANAGEMENT
// ============================================

window.loadClasses = async function() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/classes`);
        const classes = await response.json();
        
        const select = document.getElementById('className');
        select.innerHTML = '<option value="">-- Select a Class --</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name}${cls.teacher_name ? ` (${cls.teacher_name})` : ''}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load classes:', error);
        window.showNotification('Failed to load classes', 'error');
    }
};

window.addClass = async function() {
    const className = prompt('Enter new class name:');
    if (!className) return;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: className })
        });
        
        const data = await response.json();
        if (data.success) {
            window.loadClasses();
            window.showNotification('Class added successfully');
        } else {
            window.showNotification(data.message || 'Failed to add class', 'error');
        }
    } catch (error) {
        console.error('Error adding class:', error);
        window.showNotification('Failed to add class', 'error');
    }
};