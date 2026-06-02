// ============================================
// MONTHLY ANALYTICS
// ============================================

window.showMonthlyAnalytics = async function() {
    const classId = document.getElementById('className').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    const today = new Date();
    const defaultMonth = today.toISOString().slice(0, 7);
    const month = prompt('Enter month (YYYY-MM format):', defaultMonth);
    
    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
        window.showNotification('Please enter a valid month in YYYY-MM format', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/analytics/monthly?class_id=${classId}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
            window.currentMonthlyData = data;
            window.currentMonthlyData.month = month;
            window.currentMonthlyData.classId = classId;
            
            document.getElementById('analyticsTitle').textContent = `📅 Monthly Analytics - ${month}`;
            
            const content = document.getElementById('analyticsContent');
            content.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
                    <div class="stat-card stat-total">
                        <h3 style="margin: 0; font-size: 28px;">${data.total_students}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Total Students</p>
                    </div>
                    <div class="stat-card stat-present">
                        <h3 style="margin: 0; font-size: 28px;">${data.summary.present_days}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Present Days</p>
                    </div>
                    <div class="stat-card stat-absent">
                        <h3 style="margin: 0; font-size: 28px;">${data.summary.absent_days}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Absent Days</p>
                    </div>
                    <div class="stat-card stat-late">
                        <h3 style="margin: 0; font-size: 28px;">${data.summary.late_days}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Late Days</p>
                    </div>
                </div>
                
                <div style="background: var(--card-bg); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h4>📋 Monthly Summary</h4>
                    <p><strong>Month:</strong> ${month}</p>
                    <p><strong>Total Students:</strong> ${data.total_students}</p>
                    <p><strong>Total Days with Attendance:</strong> ${data.summary.total_days}</p>
                    <p><strong>Overall Attendance Rate:</strong> ${data.summary.attendance_rate}%</p>
                    <p><strong>Class Average Attendance:</strong> ${data.summary.average_attendance}%</p>
                    ${data.holidays && data.holidays.length > 0 ? `<p><strong>Holidays this month:</strong> ${data.holidays.map(h => h.name).join(', ')}</p>` : ''}
                </div>
                
                <div style="margin: 20px 0;">
                    <h4>📊 Daily Attendance Trend</h4>
                    <div style="height: 300px;">
                        <canvas id="monthlyChart"></canvas>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h4>📅 Daily Breakdown</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Present</th>
                                    <th>Absent</th>
                                    <th>Late</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.daily_stats ? data.daily_stats.map(day => `
                                    <tr>
                                        <td>${day.date}</td>
                                        <td style="color: #4CAF50;">${day.present}</td>
                                        <td style="color: #f44336;">${day.absent}</td>
                                        <td style="color: #ff9800;">${day.late}</td>
                                        <td style="font-weight: bold;">${day.percentage}%</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="5">No daily data available</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h4>👨‍🎓 Student-wise Attendance</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Present Days</th>
                                    <th>Absent Days</th>
                                    <th>Late Days</th>
                                    <th>Total Days</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.student_stats ? data.student_stats.map(student => `
                                    <tr>
                                        <td>${student.name}</td>
                                        <td style="color: #4CAF50;">${student.present}</td>
                                        <td style="color: #f44336;">${student.absent}</td>
                                        <td style="color: #ff9800;">${student.late}</td>
                                        <td>${student.total_days || 0}</td>
                                        <td style="font-weight: bold; color: ${student.attendance_percentage >= 80 ? '#4CAF50' : student.attendance_percentage >= 60 ? '#ff9800' : '#f44336'}">
                                            ${student.attendance_percentage}%
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="6">No student data available</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const ctx = document.getElementById('monthlyChart')?.getContext('2d');
                if (ctx && data.daily_stats && data.daily_stats.length > 0) {
                    const dates = data.daily_stats.map(day => day.date.split('-')[2]);
                    const percentages = data.daily_stats.map(day => day.percentage);
                    
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: dates,
                            datasets: [{
                                label: 'Daily Attendance %',
                                data: percentages,
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, position: 'top' }
                            },
                            scales: {
                                x: { title: { display: true, text: 'Day of Month' } },
                                y: {
                                    beginAtZero: true,
                                    max: 100,
                                    title: { display: true, text: 'Attendance %' },
                                    ticks: { callback: function(value) { return value + '%'; } }
                                }
                            }
                        }
                    });
                }
            }, 100);
            
            document.getElementById('analyticsModal').classList.remove('hidden');
        } else {
            window.showNotification(data.message || 'Failed to load monthly analytics', 'error');
        }
    } catch (error) {
        console.error('Error loading monthly analytics:', error);
        window.showNotification('Failed to load monthly analytics', 'error');
    }
};

// ============================================
// MONTHLY REPORT EXPORTS
// ============================================

window.exportMonthlyReportAsCSV = async function() {
    if (!window.currentMonthlyData) {
        window.showNotification('No monthly data available. Please generate a monthly report first.', 'error');
        return;
    }
    
    try {
        const data = window.currentMonthlyData;
        const month = data.month;
        
        let csvContent = "Monthly Attendance Report\n";
        csvContent += `Month: ${month}\n`;
        csvContent += `Class ID: ${data.classId}\n`;
        csvContent += `Total Students: ${data.total_students}\n`;
        csvContent += `Overall Attendance Rate: ${data.summary.attendance_rate}%\n`;
        csvContent += `Class Average: ${data.summary.average_attendance}%\n\n`;
        
        csvContent += "Daily Breakdown:\n";
        csvContent += "Date,Present,Absent,Late,Attendance %\n";
        if (data.daily_stats) {
            data.daily_stats.forEach(day => {
                csvContent += `${day.date},${day.present},${day.absent},${day.late},${day.percentage}%\n`;
            });
        }
        
        csvContent += "\n\nStudent-wise Attendance:\n";
        csvContent += "Student Name,Present Days,Absent Days,Late Days,Total Days,Attendance %\n";
        if (data.student_stats) {
            data.student_stats.forEach(student => {
                csvContent += `${student.name},${student.present},${student.absent},${student.late},${student.total_days || 0},${student.attendance_percentage}%\n`;
            });
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monthly_report_${month}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('Monthly report exported as CSV');
    } catch (error) {
        console.error('Error exporting report:', error);
        window.showNotification('Failed to export report', 'error');
    }
};

window.exportMonthlyReportAsExcel = async function() {
    if (!window.currentMonthlyData) {
        window.showNotification('No monthly data available. Please generate a monthly report first.', 'error');
        return;
    }
    
    try {
        const data = window.currentMonthlyData;
        const month = data.month;
        
        const wb = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
            ["Monthly Attendance Report"],
            [`Month: ${month}`],
            [`Class ID: ${data.classId}`],
            [`Total Students: ${data.total_students}`],
            [`Overall Attendance Rate: ${data.summary.attendance_rate}%`],
            [`Class Average: ${data.summary.average_attendance}%`],
            [],
            ["Summary Statistics"],
            ["Metric", "Value"],
            ["Total Students", data.total_students],
            ["Present Days", data.summary.present_days],
            ["Absent Days", data.summary.absent_days],
            ["Late Days", data.summary.late_days],
            ["Total Days", data.summary.total_days],
            ["Attendance Rate", `${data.summary.attendance_rate}%`],
            ["Average Attendance", `${data.summary.average_attendance}%`]
        ];
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
        
        // Daily breakdown sheet
        if (data.daily_stats && data.daily_stats.length > 0) {
            const dailyData = [
                ["Date", "Present", "Absent", "Late", "Attendance %"]
            ];
            data.daily_stats.forEach(day => {
                dailyData.push([day.date, day.present, day.absent, day.late, `${day.percentage}%`]);
            });
            const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
            XLSX.utils.book_append_sheet(wb, dailySheet, "Daily Breakdown");
        }
        
        // Student-wise sheet
        if (data.student_stats && data.student_stats.length > 0) {
            const studentData = [
                ["Student Name", "Present Days", "Absent Days", "Late Days", "Total Days", "Attendance %"]
            ];
            data.student_stats.forEach(student => {
                studentData.push([
                    student.name,
                    student.present,
                    student.absent,
                    student.late,
                    student.total_days || 0,
                    `${student.attendance_percentage}%`
                ]);
            });
            const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
            XLSX.utils.book_append_sheet(wb, studentSheet, "Student-wise");
        }
        
        XLSX.writeFile(wb, `monthly_report_${month}.xlsx`);
        window.showNotification('Monthly report exported as Excel');
    } catch (error) {
        console.error('Error exporting Excel:', error);
        window.showNotification('Failed to export Excel file', 'error');
    }
};

window.exportMonthlyReportAsPDF = function() {
    window.showNotification('PDF export would require additional libraries. Export as CSV or Excel instead.', 'info');
};

// ============================================
// FULL REPORT GENERATION & EXPORTS
// ============================================

window.generateFullReport = async function() {
    const classId = document.getElementById('className').value;
    
    if (!classId) {
        window.showNotification('Please select a class first', 'error');
        return;
    }
    
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const startDate = prompt('Enter start date (YYYY-MM-DD):', defaultStart);
    const endDate = prompt('Enter end date (YYYY-MM-DD):', defaultEnd);
    
    if (!startDate || !endDate) {
        window.showNotification('Please enter both start and end dates', 'error');
        return;
    }
    
    try {
        // Get all students in class
        const studentsResponse = await fetch(`${window.API_BASE_URL}/students?class_id=${classId}`);
        const students = await studentsResponse.json();
        
        // Get attendance for date range
        let allAttendance = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            try {
                const response = await fetch(`${window.API_BASE_URL}/attendance?class_id=${classId}&date=${dateStr}`);
                const attendanceData = await response.json();
                attendanceData.forEach(record => {
                    allAttendance.push({ ...record, date: dateStr });
                });
            } catch (error) {
                console.error(`Error fetching attendance for ${dateStr}:`, error);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Calculate statistics
        const studentStats = students.map(student => {
            const studentAttendance = allAttendance.filter(a => a.id === student.id);
            const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
            const absentDays = studentAttendance.filter(a => a.status === 'Absent').length;
            const lateDays = studentAttendance.filter(a => a.status === 'Late').length;
            const totalDays = studentAttendance.length;
            const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            
            return {
                id: student.id,
                name: student.name,
                present: presentDays,
                absent: absentDays,
                late: lateDays,
                total: totalDays,
                attendanceRate: attendanceRate
            };
        });
        
        // Overall statistics
        const totalDays = Math.ceil((end - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        const totalStudents = students.length;
        const totalPresent = studentStats.reduce((sum, s) => sum + s.present, 0);
        const totalAbsent = studentStats.reduce((sum, s) => sum + s.absent, 0);
        const totalLate = studentStats.reduce((sum, s) => sum + s.late, 0);
        const avgAttendanceRate = studentStats.length > 0 
            ? Math.round(studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentStats.length)
            : 0;
        
        // Store data for export
        window.currentFullReportData = {
            classId: classId,
            startDate: startDate,
            endDate: endDate,
            totalDays: totalDays,
            totalStudents: totalStudents,
            totalPresent: totalPresent,
            totalAbsent: totalAbsent,
            totalLate: totalLate,
            avgAttendanceRate: avgAttendanceRate,
            studentStats: studentStats,
            students: students
        };
        
        // Generate report HTML
        document.getElementById('fullReportContent').innerHTML = `
            <div style="padding: 20px; background: var(--card-bg); border-radius: 10px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: var(--primary-color);">📋 Full Attendance Report</h3>
                <p><strong>Date Range:</strong> ${startDate} to ${endDate}</p>
                <p><strong>Total Days:</strong> ${totalDays}</p>
                <p><strong>Total Students:</strong> ${totalStudents}</p>
                <p><strong>Overall Attendance Rate:</strong> ${avgAttendanceRate}%</p>
                <p><strong>Total Present Days:</strong> ${totalPresent}</p>
                <p><strong>Total Absent Days:</strong> ${totalAbsent}</p>
                <p><strong>Total Late Days:</strong> ${totalLate}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div class="stat-card stat-present">
                    <h3 style="margin: 0; font-size: 28px;">${totalPresent}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Total Present Days</p>
                </div>
                <div class="stat-card stat-absent">
                    <h3 style="margin: 0; font-size: 28px;">${totalAbsent}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Total Absent Days</p>
                </div>
                <div class="stat-card stat-late">
                    <h3 style="margin: 0; font-size: 28px;">${totalLate}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Total Late Days</p>
                </div>
                <div class="stat-card stat-total">
                    <h3 style="margin: 0; font-size: 28px;">${avgAttendanceRate}%</h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Avg Attendance Rate</p>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <h4>👨‍🎓 Student-wise Summary</h4>
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Present Days</th>
                                <th>Absent Days</th>
                                <th>Late Days</th>
                                <th>Total Days</th>
                                <th>Attendance Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentStats.map(student => `
                                <tr>
                                    <td>${student.id}</td>
                                    <td>${student.name}</td>
                                    <td style="color: #4CAF50;">${student.present}</td>
                                    <td style="color: #f44336;">${student.absent}</td>
                                    <td style="color: #ff9800;">${student.late}</td>
                                    <td>${student.total}</td>
                                    <td style="font-weight: bold; color: ${student.attendanceRate >= 80 ? '#4CAF50' : student.attendanceRate >= 60 ? '#ff9800' : '#f44336'}">
                                        ${student.attendanceRate}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <h4>📊 Attendance Distribution</h4>
                <div style="height: 300px;">
                    <canvas id="fullReportChart"></canvas>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <h4>🏆 Top Performers (Attendance Rate ≥ 90%)</h4>
                ${studentStats.filter(s => s.attendanceRate >= 90 && s.total > 0).length > 0 ? `
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Attendance Rate</th>
                                    <th>Present Days</th>
                                    <th>Total Days</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${studentStats.filter(s => s.attendanceRate >= 90 && s.total > 0)
                                    .sort((a, b) => b.attendanceRate - a.attendanceRate)
                                    .map(student => `
                                        <tr>
                                            <td>${student.name}</td>
                                            <td style="color: #4CAF50; font-weight: bold;">${student.attendanceRate}%</td>
                                            <td>${student.present}</td>
                                            <td>${student.total}</td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p>No students with attendance rate ≥ 90%</p>'}
            </div>
            
            <div style="margin: 20px 0;">
                <h4>⚠️ Students Needing Attention (Attendance Rate < 60%)</h4>
                ${studentStats.filter(s => s.attendanceRate < 60 && s.total > 0).length > 0 ? `
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Attendance Rate</th>
                                    <th>Absent Days</th>
                                    <th>Total Days</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${studentStats.filter(s => s.attendanceRate < 60 && s.total > 0)
                                    .sort((a, b) => a.attendanceRate - b.attendanceRate)
                                    .map(student => `
                                        <tr>
                                            <td>${student.name}</td>
                                            <td style="color: #f44336; font-weight: bold;">${student.attendanceRate}%</td>
                                            <td>${student.absent}</td>
                                            <td>${student.total}</td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p>No students with attendance rate < 60%</p>'}
            </div>
        `;
        
        // Create chart
        setTimeout(() => {
            const ctx = document.getElementById('fullReportChart')?.getContext('2d');
            if (ctx) {
                new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['Present', 'Absent', 'Late'],
                        datasets: [{
                            data: [totalPresent, totalAbsent, totalLate],
                            backgroundColor: ['#4CAF50', '#f44336', '#ff9800'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: 'Attendance Distribution' }
                        }
                    }
                });
            }
        }, 100);
        
        document.getElementById('fullReportModal').classList.remove('hidden');
        window.showNotification('Full report generated successfully');
        
    } catch (error) {
        console.error('Error generating full report:', error);
        window.showNotification('Failed to generate full report', 'error');
    }
};

window.exportFullReportAsCSV = function() {
    if (!window.currentFullReportData) {
        window.showNotification('No full report data available. Please generate a full report first.', 'error');
        return;
    }
    
    try {
        const data = window.currentFullReportData;
        
        let csvContent = "Full Attendance Report\n";
        csvContent += `Date Range: ${data.startDate} to ${data.endDate}\n`;
        csvContent += `Total Days: ${data.totalDays}\n`;
        csvContent += `Total Students: ${data.totalStudents}\n`;
        csvContent += `Overall Attendance Rate: ${data.avgAttendanceRate}%\n`;
        csvContent += `Total Present Days: ${data.totalPresent}\n`;
        csvContent += `Total Absent Days: ${data.totalAbsent}\n`;
        csvContent += `Total Late Days: ${data.totalLate}\n\n`;
        
        csvContent += "Student-wise Attendance:\n";
        csvContent += "Student ID,Student Name,Present Days,Absent Days,Late Days,Total Days,Attendance Rate\n";
        
        data.studentStats.forEach(student => {
            csvContent += `${student.id},${student.name},${student.present},${student.absent},${student.late},${student.total},${student.attendanceRate}%\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `full_report_${data.startDate}_to_${data.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('Full report exported as CSV');
    } catch (error) {
        console.error('Error exporting full report:', error);
        window.showNotification('Failed to export full report', 'error');
    }
};

window.exportFullReportAsExcel = function() {
    if (!window.currentFullReportData) {
        window.showNotification('No full report data available. Please generate a full report first.', 'error');
        return;
    }
    
    try {
        const data = window.currentFullReportData;
        
        const wb = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
            ["Full Attendance Report"],
            [`Date Range: ${data.startDate} to ${data.endDate}`],
            [`Total Days: ${data.totalDays}`],
            [`Total Students: ${data.totalStudents}`],
            [`Overall Attendance Rate: ${data.avgAttendanceRate}%`],
            [],
            ["Summary Statistics"],
            ["Metric", "Value"],
            ["Date Range", `${data.startDate} to ${data.endDate}`],
            ["Total Days", data.totalDays],
            ["Total Students", data.totalStudents],
            ["Total Present Days", data.totalPresent],
            ["Total Absent Days", data.totalAbsent],
            ["Total Late Days", data.totalLate],
            ["Average Attendance Rate", `${data.avgAttendanceRate}%`]
        ];
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
        
        // Student-wise sheet
        const studentData = [
            ["Student ID", "Student Name", "Present Days", "Absent Days", "Late Days", "Total Days", "Attendance Rate"]
        ];
        
        data.studentStats.forEach(student => {
            studentData.push([
                student.id,
                student.name,
                student.present,
                student.absent,
                student.late,
                student.total,
                `${student.attendanceRate}%`
            ]);
        });
        
        const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
        XLSX.utils.book_append_sheet(wb, studentSheet, "Student-wise");
        
        XLSX.writeFile(wb, `full_report_${data.startDate}_to_${data.endDate}.xlsx`);
        window.showNotification('Full report exported as Excel');
    } catch (error) {
        console.error('Error exporting Excel:', error);
        window.showNotification('Failed to export Excel file', 'error');
    }
};

window.exportFullReportAsPDF = function() {
    window.showNotification('PDF export would require additional libraries. Export as CSV or Excel instead.', 'info');
};