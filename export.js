// ============================================
// DAILY EXPORT FUNCTIONS (TXT, CSV)
// ============================================

window.saveToNotepad = async function() {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance?class_id=${classId}&date=${date}`);
        const attendanceData = await response.json();
        
        let textData = `ATTENDANCE REPORT\n`;
        textData += `Date: ${date}\n`;
        textData += `Class ID: ${classId}\n`;
        textData += `Generated: ${new Date().toLocaleString()}\n\n`;
        textData += `ID\tName\tStatus\tParent Email\tParent Phone\n`;
        textData += `─`.repeat(80) + `\n`;
        
        attendanceData.forEach(student => {
            textData += `${student.id}\t${student.name}\t${student.status || 'Absent'}\t${student.parent_email || ''}\t${student.parent_phone || ''}\n`;
        });
        
        const blob = new Blob([textData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${date}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('Attendance saved to TXT file');
    } catch (error) {
        console.error('Error exporting:', error);
        window.showNotification('Failed to export data', 'error');
    }
};

window.exportToExcel = async function() {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance?class_id=${classId}&date=${date}`);
        const attendanceData = await response.json();
        
        let csvData = 'ID,Name,Status,Parent Email,Parent Phone\n';
        
        attendanceData.forEach(student => {
            csvData += `${student.id},${student.name},${student.status || 'Absent'},${student.parent_email || ''},${student.parent_phone || ''}\n`;
        });
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('Exported to CSV (Excel) file');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        window.showNotification('Failed to export to Excel', 'error');
    }
};

window.exportToPDF = function() {
    window.showNotification('PDF export would require additional libraries. Export as CSV or Excel instead.', 'info');
};