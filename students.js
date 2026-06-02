window.addStudent = async function() {
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const classId = document.getElementById('className').value;
    
    if (!name) {
        window.showNotification('Please enter student name', 'error');
        return;
    }
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                class_id: classId,
                name: name,
                parent_email: email,
                parent_phone: phone
            })
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('studentName').value = '';
            document.getElementById('studentEmail').value = '';
            document.getElementById('studentPhone').value = '';
            window.loadStudents();
            window.loadQuickStats();
            window.showNotification('Student added successfully');
        } else {
            window.showNotification(data.message || 'Failed to add student', 'error');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        window.showNotification('Failed to add student', 'error');
    }
};


// Load students with attendance status and photos
window.loadStudents = async function() {
    const classId = document.getElementById('className').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId) return;
    
    window.currentClassId = classId;   // ← use window. global
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance?class_id=${classId}&date=${date}`);
        const attendanceData = await response.json();
        
        const tableBody = document.getElementById('studentList');
        tableBody.innerHTML = '';
        
        let totalStudents = 0;
        
        for (const student of attendanceData) {
            totalStudents++;
            const status = student.status || 'Absent';
            
            // Create photo HTML
            let photoHtml;
            if (student.photo_path) {
                let photoUrl = student.photo_path;
                if (!photoUrl.startsWith('/static/uploads/')) {
                    photoUrl = `/static/uploads/${student.photo_path}`;
                }
                photoHtml = `<img src="${photoUrl}" class="student-photo" alt="${student.name}" onerror="this.src='/static/default.png';">`;
            } else {
                photoHtml = `<div style="width: 50px; height: 50px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 12px; color: #666;">${student.name.charAt(0)}</span>
                </div>`;
            }
            
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${photoHtml}</td>
                <td>${student.name}</td>
                <td>${student.parent_email || 'No email'}</td>
                <td>${student.parent_phone || 'No phone'}</td>
                <td class="${status.toLowerCase()} status-toggle" onclick="window.toggleStatus(this, ${student.id})">
                    ${status}
                </td>
                <td class="status-history">
                    <button onclick="window.viewStudentHistory(${student.id})" class="btn-small">View History</button>
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="window.editStudent(${student.id})" class="btn-warning btn-small">Edit</button>
                        <button onclick="window.sendNotification(${student.id})" class="btn-primary btn-small">Notify</button>
                        <button onclick="window.removeStudent(${student.id})" class="btn-danger btn-small">Remove</button>
                    </div>
                </td>
            `;
        }
        
        document.getElementById('totalStudents').textContent = totalStudents;
    } catch (error) {
        console.error('Error loading students:', error);
        window.showNotification('Failed to load students', 'error');
    }
};

// ============================================
// STUDENT EDITING & REMOVAL
// ============================================

window.editStudent = async function(studentId) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/student/${studentId}`);
        const data = await response.json();
        
        if (data.success) {
            const student = data.student;
            window.currentEditStudentId = studentId;
            window.currentEditStudentPhoto = student.photo_path;
            
            document.getElementById('editStudentId').value = studentId;
            document.getElementById('editStudentName').value = student.name;
            document.getElementById('editStudentEmail').value = student.parent_email || '';
            document.getElementById('editStudentPhone').value = student.parent_phone || '';
            
            const photoPreview = document.getElementById('studentPhotoPreview');
            if (student.photo_path) {
                let photoUrl = student.photo_path;
                if (!photoUrl.startsWith('/static/uploads/')) {
                    photoUrl = `/static/uploads/${student.photo_path}`;
                }
                photoPreview.src = photoUrl;
                photoPreview.style.display = 'block';
            } else {
                photoPreview.src = '';
                photoPreview.style.display = 'none';
            }
            
            document.getElementById('editModal').classList.remove('hidden');
        } else {
            window.showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading student:', error);
        window.showNotification('Failed to load student details', 'error');
    }
};

window.previewPhoto = function() {
    const fileInput = document.getElementById('photoUpload');
    const photoPreview = document.getElementById('studentPhotoPreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};

window.uploadStudentPhoto = async function() {
    const fileInput = document.getElementById('photoUpload');
    if (!fileInput.files[0]) {
        window.showNotification('Please select a photo first', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('student_id', window.currentEditStudentId);
    formData.append('photo', fileInput.files[0]);
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/upload-photo`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            window.showNotification('Photo uploaded successfully');
            const photoPreview = document.getElementById('studentPhotoPreview');
            photoPreview.src = data.photo_url || `/static/uploads/${data.photo_path}`;
            fileInput.value = '';
            window.loadStudents();
        } else {
            window.showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
        window.showNotification('Failed to upload photo', 'error');
    }
};

window.updateStudent = async function() {
    const studentId = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value.trim();
    const email = document.getElementById('editStudentEmail').value.trim();
    const phone = document.getElementById('editStudentPhone').value.trim();
    
    if (!name) {
        window.showNotification('Please enter student name', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/students`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: studentId,
                name: name,
                parent_email: email,
                parent_phone: phone
            })
        });
        
        const data = await response.json();
        if (data.success) {
            window.closeEditModal();      // defined in utils.js
            window.loadStudents();
            window.showNotification('Student updated successfully');
        } else {
            window.showNotification(data.message || 'Failed to update student', 'error');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        window.showNotification('Failed to update student', 'error');
    }
};

window.removeStudent = async function(studentId) {
    if (!confirm('Are you sure you want to remove this student?')) return;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/students?student_id=${studentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            window.loadStudents();
            window.loadQuickStats();
            window.showNotification('Student removed successfully');
        } else {
            window.showNotification(data.message || 'Failed to remove student', 'error');
        }
    } catch (error) {
        console.error('Error removing student:', error);
        window.showNotification('Failed to remove student', 'error');
    }
};

// ============================================
// STUDENT HISTORY
// ============================================

window.viewStudentHistory = async function(studentId) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance/history?student_id=${studentId}`);
        const history = await response.json();
        
        let historyText = 'Last 10 attendance records:\n\n';
        history.forEach(record => {
            historyText += `${record.date}: ${record.status}\n`;
        });
        
        alert(historyText);
    } catch (error) {
        console.error('Error loading history:', error);
        window.showNotification('Failed to load student history', 'error');
    }
};// ============================================
// STUDENT HISTORY
// ============================================

window.viewStudentHistory = async function(studentId) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/attendance/history?student_id=${studentId}`);
        const history = await response.json();
        
        let historyText = 'Last 10 attendance records:\n\n';
        history.forEach(record => {
            historyText += `${record.date}: ${record.status}\n`;
        });
        
        alert(historyText);
    } catch (error) {
        console.error('Error loading history:', error);
        window.showNotification('Failed to load student history', 'error');
    }
};