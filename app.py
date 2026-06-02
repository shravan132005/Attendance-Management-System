from flask import Flask, request, jsonify, send_from_directory
from flask import redirect, url_for
from flask_cors import CORS
import sqlite3
import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import shutil
import zipfile
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# Database setup
DATABASE = 'attendance.db'
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

DATABASE = 'attendance.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with app.app_context():
        db = get_db()
        
        # Teachers table
        db.execute('''
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                is_admin INTEGER DEFAULT 0,
                reset_token TEXT,
                token_expiry TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Classes table
        db.execute('''
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                teacher_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Students table
        db.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                parent_email TEXT,
                parent_phone TEXT,
                photo_path TEXT,
                FOREIGN KEY (class_id) REFERENCES classes (id),
                UNIQUE(class_id, name)
            )
        ''')
        
        # Attendance table
        db.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Absent',
                remarks TEXT,
                FOREIGN KEY (student_id) REFERENCES students (id),
                UNIQUE(student_id, date)
            )
        ''')
        
        # Class schedule table
        db.execute('''
            CREATE TABLE IF NOT EXISTS class_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                subject TEXT,
                room TEXT,
                FOREIGN KEY (class_id) REFERENCES classes (id)
            )
        ''')
        
        # Holidays table
        db.execute('''
            CREATE TABLE IF NOT EXISTS holidays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # SMS logs table
        db.execute('''
            CREATE TABLE IF NOT EXISTS sms_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                message TEXT,
                status TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id)
            )
        ''')
        
        # Parent login table
        db.execute('''
            CREATE TABLE IF NOT EXISTS parent_logins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER UNIQUE NOT NULL,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                last_login TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id)
            )
        ''')
        
        db.commit()
        
        # Create default admin if no teachers exist
        admin_exists = db.execute('SELECT COUNT(*) as count FROM teachers WHERE username = ?', ('Logical',)).fetchone()['count']
        if admin_exists == 0:
            hashed_password = hashlib.sha256('logical@11'.encode()).hexdigest()
            db.execute('''
                INSERT INTO teachers (username, password, full_name, email, is_admin)
                VALUES (?, ?, ?, ?, ?)
            ''', ('Logical', hashed_password, 'Logical Classes', 'logical@classes.com', 1))
            db.commit()

# Email configuration
SMTP_CONFIG = {
    "server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "port": int(os.getenv("SMTP_PORT", 587)),
    "username": os.getenv("SMTP_USERNAME", ""),
    "password": os.getenv("SMTP_PASSWORD", "")
}

# Create required directories
def create_directories():
    directories = ['static/uploads', 'backups', 'static/backups']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)

# Serve frontend
@app.route('/')
def serve_frontend():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Parent portal route
@app.route('/parent-portal')
def parent_portal():
    return send_from_directory('.', 'parent_portal.html')

# API Routes

# Authentication
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
    
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    db = get_db()
    teacher = db.execute('SELECT * FROM teachers WHERE username = ? AND password = ?', 
                        (username, hashed_password)).fetchone()
    
    if teacher:
        token = secrets.token_hex(32)
        return jsonify({
            "success": True,
            "token": token,
            "teacher": {
                "id": teacher['id'],
                "username": teacher['username'],
                "full_name": teacher['full_name'],
                "is_admin": teacher['is_admin'],
                "email": teacher['email']
            }
        })
    
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400
    
    db = get_db()
    teacher = db.execute('SELECT * FROM teachers WHERE email = ?', (email,)).fetchone()
    
    if not teacher:
        return jsonify({"success": False, "message": "Email not found"}), 404
    
    # Generate reset token
    reset_token = secrets.token_hex(16)
    expiry = (datetime.now() + timedelta(hours=1)).isoformat()
    
    db.execute('UPDATE teachers SET reset_token = ?, token_expiry = ? WHERE id = ?',
               (reset_token, expiry, teacher['id']))
    db.commit()
    
    # In production, send email with reset link
    # For demo, return the token directly
    return jsonify({
        "success": True,
        "message": "Reset instructions sent",
        "reset_token": reset_token  # Remove in production
    })

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({"success": False, "message": "Token and password required"}), 400
    
    db = get_db()
    teacher = db.execute('SELECT * FROM teachers WHERE reset_token = ?', (token,)).fetchone()
    
    if not teacher:
        return jsonify({"success": False, "message": "Invalid token"}), 400
    
    # Check token expiry
    if datetime.fromisoformat(teacher['token_expiry']) < datetime.now():
        return jsonify({"success": False, "message": "Token expired"}), 400
    
    # Update password
    hashed_password = hashlib.sha256(new_password.encode()).hexdigest()
    db.execute('UPDATE teachers SET password = ?, reset_token = NULL, token_expiry = NULL WHERE id = ?',
               (hashed_password, teacher['id']))
    db.commit()
    
    return jsonify({"success": True, "message": "Password reset successful"})

# Classes management
@app.route('/api/classes', methods=['GET', 'POST'])
def manage_classes():
    db = get_db()
    if request.method == 'GET':
        classes = db.execute('''
            SELECT c.*, t.full_name as teacher_name 
            FROM classes c 
            LEFT JOIN teachers t ON c.teacher_id = t.id
            ORDER BY c.name
        ''').fetchall()
        return jsonify([dict(row) for row in classes])
    else:
        data = request.get_json()
        try:
            db.execute('INSERT INTO classes (name, teacher_id) VALUES (?, ?)',
                      (data['name'], data.get('teacher_id')))
            db.commit()
            return jsonify({"success": True})
        except sqlite3.IntegrityError:
            return jsonify({"success": False, "message": "Class already exists"}), 400

# Students management
@app.route('/api/students', methods=['GET', 'POST', 'PUT', 'DELETE'])
def students():
    db = get_db()
    if request.method == 'GET':
        class_id = request.args.get('class_id')
        if class_id:
            students = db.execute('SELECT * FROM students WHERE class_id = ? ORDER BY id ASC', (class_id,)).fetchall()
        else:
            students = db.execute('SELECT * FROM students ORDER BY id ASC').fetchall()
        
        # Return with consistent field names
        return jsonify([{
            "id": s["id"],
            "name": s["name"],
            "parent_email": s["parent_email"],
            "parent_phone": s["parent_phone"],
            "photo_path": s["photo_path"],  # Keep this name consistent
            "class_id": s["class_id"]
        } for s in students])
    
    if request.method == 'POST':
        data = request.get_json()
        try:
            db.execute('''
                INSERT INTO students (class_id, name, parent_email, parent_phone)
                VALUES (?, ?, ?, ?)
            ''', (data['class_id'], data['name'], data.get('parent_email', ''), data.get('parent_phone', '')))
            db.commit()
            return jsonify({"success": True})
        except sqlite3.IntegrityError:
            return jsonify({"success": False, "message": "Student already exists"}), 400
    
    elif request.method == 'PUT':
        data = request.get_json()
        try:
            db.execute('''
                UPDATE students SET 
                name = ?, parent_email = ?, parent_phone = ?
                WHERE id = ?
            ''', (data['name'], data.get('parent_email', ''), data.get('parent_phone', ''), data['id']))
            db.commit()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    
    elif request.method == 'DELETE':
        student_id = request.args.get('student_id')
        try:
            db.execute('DELETE FROM students WHERE id = ?', (student_id,))
            db.commit()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

# Attendance management
@app.route('/api/attendance', methods=['GET', 'POST'])
def manage_attendance():
    db = get_db()
    if request.method == 'GET':
        class_id = request.args.get('class_id')
        date = request.args.get('date')
        
        if not class_id or not date:
            return jsonify({"success": False, "message": "Class ID and date required"}), 400
        
        attendance = db.execute('''
            SELECT s.id, s.name, s.parent_email, s.parent_phone, 
                   a.status, a.remarks, s.photo_path
            FROM students s
            LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
            WHERE s.class_id = ?
            ORDER BY s.id ASC
        ''', (date, class_id)).fetchall()
        
        return jsonify([{
            "id": row["id"],
            "name": row["name"],
            "parent_email": row["parent_email"],
            "parent_phone": row["parent_phone"],
            "status": row["status"],
            "remarks": row["remarks"],
            "photo_path": row["photo_path"]  # Return photo_path
        } for row in attendance])
    
    else:  # POST
        data = request.get_json()
        try:
            db.execute('''
                INSERT INTO attendance (student_id, date, status, remarks)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(student_id, date) DO UPDATE SET 
                status = excluded.status, remarks = excluded.remarks
            ''', (data['student_id'], data['date'], data['status'], data.get('remarks', '')))
            db.commit()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

# Student photo upload
@app.route('/api/upload-photo', methods=['POST'])
def upload_photo():
    if 'photo' not in request.files or 'student_id' not in request.form:
        return jsonify({"success": False, "message": "Missing photo or student ID"}), 400
    
    file = request.files['photo']
    student_id = request.form['student_id']
    
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected"}), 400
    
    # Check if student exists
    db = get_db()
    student = db.execute('SELECT * FROM students WHERE id = ?', (student_id,)).fetchone()
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404
    
    # Create uploads folder if not exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    
    # Generate filename with timestamp to avoid overwrites
    timestamp = int(datetime.now().timestamp())
    filename, ext = os.path.splitext(file.filename)
    filename = secure_filename(f"student_{student_id}_{timestamp}{ext}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        # Save the file
        file.save(filepath)
        
        # Update database - store just filename, not full path
        db.execute(
            "UPDATE students SET photo_path = ? WHERE id = ?",
            (filename, student_id)
        )
        db.commit()
        
        return jsonify({
            "success": True,
            "photo_url": f"/static/uploads/{filename}",
            "photo_path": filename,
            "message": "Photo uploaded successfully"
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Class schedule
@app.route('/api/schedule', methods=['GET', 'POST', 'DELETE'])
def manage_schedule():
    db = get_db()
    if request.method == 'GET':
        class_id = request.args.get('class_id')
        schedules = db.execute('SELECT * FROM class_schedule WHERE class_id = ?', (class_id,)).fetchall()
        return jsonify([dict(row) for row in schedules])
    
    elif request.method == 'POST':
        data = request.get_json()
        try:
            db.execute('''
                INSERT INTO class_schedule (class_id, day_of_week, start_time, end_time, subject, room)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (data['class_id'], data['day_of_week'], data['start_time'], 
                  data['end_time'], data.get('subject', ''), data.get('room', '')))
            db.commit()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    
    elif request.method == 'DELETE':
        schedule_id = request.args.get('schedule_id')
        try:
            db.execute('DELETE FROM class_schedule WHERE id = ?', (schedule_id,))
            db.commit()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

# Holidays
@app.route('/api/holidays', methods=['GET', 'POST', 'DELETE'])
def manage_holidays():
    db = get_db()
    if request.method == 'GET':
        year = request.args.get('year')
        month = request.args.get('month')
        
        query = 'SELECT * FROM holidays'
        params = []
        
        if year and month:
            query += ' WHERE strftime("%Y-%m", date) = ?'
            params.append(f'{year}-{int(month):02d}')
        elif year:
            query += ' WHERE strftime("%Y", date) = ?'
            params.append(year)
        
        query += ' ORDER BY date'
        holidays = db.execute(query, params).fetchall()
        return jsonify([dict(row) for row in holidays])
    
    elif request.method == 'POST':
        data = request.get_json()
        try:
            db.execute('INSERT INTO holidays (date, name, description) VALUES (?, ?, ?)',
                      (data['date'], data['name'], data.get('description', '')))
            db.commit()
            return jsonify({"success": True})
        except sqlite3.IntegrityError:
            return jsonify({"success": False, "message": "Holiday already exists"}), 400
    
    elif request.method == 'DELETE':
        holiday_id = request.args.get('holiday_id')
        try:
            db.execute('DELETE FROM holidays WHERE id = ?', (holiday_id,))
            db.commit()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

# Today's stats for teacher dashboard
@app.route('/api/today-stats', methods=['GET'])
def today_stats():
    db = get_db()
    date = datetime.now().strftime('%Y-%m-%d')
    
    # Get stats for today
    stats = db.execute('''
        SELECT status, COUNT(*) as count 
        FROM attendance 
        WHERE date = ?
        GROUP BY status
    ''', (date,)).fetchall()
    
    # Get total classes
    total_classes = db.execute('SELECT COUNT(*) as count FROM classes').fetchone()['count']
    
    present = 0
    absent = 0
    late = 0
    
    for row in stats:
        if row['status'] == 'Present':
            present = row['count']
        elif row['status'] == 'Absent':
            absent = row['count']
        elif row['status'] == 'Late':
            late = row['count']
    
    return jsonify({
        "success": True,
        "total_classes": total_classes,
        "present": present,
        "absent": absent,
        "late": late
    })

# Daily Analytics
@app.route('/api/analytics/daily', methods=['GET'])
def daily_analytics():
    class_id = request.args.get('class_id')
    date = request.args.get('date')
    
    if not class_id or not date:
        return jsonify({"success": False, "message": "Class ID and date required"}), 400
    
    db = get_db()
    
    # Get total students
    total_students = db.execute('SELECT COUNT(*) as count FROM students WHERE class_id = ?',
                               (class_id,)).fetchone()['count']
    
    # Get attendance stats
    stats = db.execute('''
        SELECT status, COUNT(*) as count 
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE s.class_id = ? AND a.date = ?
        GROUP BY status
    ''', (class_id, date)).fetchall()
    
    # Calculate percentages
    present = 0
    absent = 0
    late = 0
    
    for row in stats:
        if row['status'] == 'Present':
            present = row['count']
        elif row['status'] == 'Absent':
            absent = row['count']
        elif row['status'] == 'Late':
            late = row['count']
    
    attendance_rate = (present / total_students * 100) if total_students > 0 else 0
    
    return jsonify({
        "success": True,
        "date": date,
        "total_students": total_students,
        "present": present,
        "absent": absent,
        "late": late,
        "attendance_rate": round(attendance_rate, 2),
        "present_percentage": round((present / total_students * 100), 2) if total_students > 0 else 0,
        "absent_percentage": round((absent / total_students * 100), 2) if total_students > 0 else 0,
        "late_percentage": round((late / total_students * 100), 2) if total_students > 0 else 0
    })

# Monthly Analytics - FIXED
@app.route('/api/analytics/monthly', methods=['GET'])
def monthly_analytics():
    class_id = request.args.get('class_id')
    month = request.args.get('month')  # Format: YYYY-MM
    
    if not class_id or not month:
        return jsonify({"success": False, "message": "Class ID and month required"}), 400
    
    db = get_db()
    
    try:
        # Get total students in class
        total_students = db.execute('SELECT COUNT(*) as count FROM students WHERE class_id = ?',
                                   (class_id,)).fetchone()['count']
        
        # Get attendance for the entire month
        attendance_data = db.execute('''
            SELECT a.date, a.status, COUNT(*) as count
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE s.class_id = ? AND strftime("%Y-%m", a.date) = ?
            GROUP BY a.date, a.status
            ORDER BY a.date
        ''', (class_id, month)).fetchall()
        
        # Get holidays in the month
        holidays = db.execute('''
            SELECT date, name FROM holidays 
            WHERE strftime("%Y-%m", date) = ?
        ''', (month,)).fetchall()
        
        # Process daily data
        daily_stats = {}
        present_days = 0
        absent_days = 0
        late_days = 0
        total_days = 0
        
        # Initialize stats for each day
        for row in attendance_data:
            date = row['date']
            if date not in daily_stats:
                daily_stats[date] = {'present': 0, 'absent': 0, 'late': 0, 'total': total_students}
            
            daily_stats[date][row['status'].lower()] = row['count']
        
        # Calculate totals
        for date, stats in daily_stats.items():
            total_days += 1
            present_days += stats['present']
            absent_days += stats['absent']
            late_days += stats['late']
        
        # Calculate overall attendance rate
        total_possible_attendance = total_students * total_days if total_days > 0 else 1
        attendance_rate = ((present_days + late_days) / total_possible_attendance * 100) if total_possible_attendance > 0 else 0
        
        # Get student-wise attendance
        student_attendance = db.execute('''
            SELECT s.id, s.name, 
                   COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
                   COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
                   COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
                   COUNT(a.date) as total_days
            FROM students s
            LEFT JOIN attendance a ON s.id = a.student_id AND strftime("%Y-%m", a.date) = ?
            WHERE s.class_id = ?
            GROUP BY s.id, s.name
            ORDER BY s.name
        ''', (month, class_id)).fetchall()
        
        # Calculate class average attendance percentage
        avg_attendance = 0
        if student_attendance:
            total_percentage = 0
            valid_students = 0
            for student in student_attendance:
                if student['total_days'] > 0:
                    student_percentage = (student['present_count'] + student['late_count'] * 0.5) / student['total_days'] * 100
                    total_percentage += student_percentage
                    valid_students += 1
            avg_attendance = total_percentage / valid_students if valid_students > 0 else 0
        
        # Prepare daily stats for response
        daily_stats_list = []
        for date, stats in sorted(daily_stats.items()):
            day_total = stats['present'] + stats['absent'] + stats['late']
            day_percentage = (stats['present'] / day_total * 100) if day_total > 0 else 0
            daily_stats_list.append({
                "date": date,
                "present": stats['present'],
                "absent": stats['absent'],
                "late": stats['late'],
                "total": day_total,
                "percentage": round(day_percentage, 2)
            })
        
        # Prepare student stats for response
        student_stats_list = []
        for row in student_attendance:
            if row['total_days'] > 0:
                attendance_percentage = (row['present_count'] / row['total_days'] * 100)
            else:
                attendance_percentage = 0
                
            student_stats_list.append({
                "id": row['id'],
                "name": row['name'],
                "present": row['present_count'],
                "absent": row['absent_count'],
                "late": row['late_count'],
                "total_days": row['total_days'],
                "attendance_percentage": round(attendance_percentage, 2)
            })
        
        return jsonify({
            "success": True,
            "month": month,
            "total_students": total_students,
            "summary": {
                "total_days": total_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "late_days": late_days,
                "attendance_rate": round(attendance_rate, 2),
                "average_attendance": round(avg_attendance, 2)
            },
            "holidays": [dict(row) for row in holidays],
            "daily_stats": daily_stats_list,
            "student_stats": student_stats_list
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

#full_analytics full report 
@app.route('/api/analytics/full', methods=['GET'])
def full_analytics():
    class_id = request.args.get('class_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not class_id or not start_date or not end_date:
        return jsonify({"success": False, "message": "Class ID and date range required"}), 400
    
    db = get_db()
    
    try:
        # Get all students in class
        students = db.execute('SELECT * FROM students WHERE class_id = ?', (class_id,)).fetchall()
        
        # Get attendance for date range
        attendance = db.execute('''
            SELECT a.*, s.name as student_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE s.class_id = ? AND a.date BETWEEN ? AND ?
            ORDER BY a.date
        ''', (class_id, start_date, end_date)).fetchall()
        
        # Calculate statistics
        student_stats = []
        for student in students:
            student_attendance = [a for a in attendance if a['student_id'] == student['id']]
            present_days = sum(1 for a in student_attendance if a['status'] == 'Present')
            absent_days = sum(1 for a in student_attendance if a['status'] == 'Absent')
            late_days = sum(1 for a in student_attendance if a['status'] == 'Late')
            total_days = len(student_attendance)
            
            attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
            
            student_stats.append({
                "id": student['id'],
                "name": student['name'],
                "present": present_days,
                "absent": absent_days,
                "late": late_days,
                "total": total_days,
                "attendance_rate": round(attendance_rate, 2)
            })
        
        # Overall statistics
        total_days_count = (datetime.strptime(end_date, '%Y-%m-%d') - datetime.strptime(start_date, '%Y-%m-%d')).days + 1
        total_students = len(students)
        total_present = sum(s['present'] for s in student_stats)
        total_absent = sum(s['absent'] for s in student_stats)
        total_late = sum(s['late'] for s in student_stats)
        
        avg_attendance_rate = sum(s['attendance_rate'] for s in student_stats) / len(student_stats) if student_stats else 0
        
        # Get holidays in range
        holidays = db.execute('SELECT * FROM holidays WHERE date BETWEEN ? AND ?', 
                             (start_date, end_date)).fetchall()
        
        return jsonify({
            "success": True,
            "date_range": f"{start_date} to {end_date}",
            "total_days": total_days_count,
            "total_students": total_students,
            "overall_stats": {
                "total_present": total_present,
                "total_absent": total_absent,
                "total_late": total_late,
                "average_attendance_rate": round(avg_attendance_rate, 2)
            },
            "student_stats": student_stats,
            "holidays": [dict(row) for row in holidays]
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
# Email notifications
@app.route('/api/send-notification', methods=['POST'])
def send_notification():
    data = request.get_json()
    student_id = data.get('student_id')
    date = data.get('date')
    message_type = data.get('type', 'absence')
    
    db = get_db()
    
    # Get student details
    student = db.execute('''
        SELECT s.*, a.status 
        FROM students s 
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
        WHERE s.id = ?
    ''', (date, student_id)).fetchone()
    
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404
    
    if not student['parent_email']:
        return jsonify({"success": False, "message": "No parent email available"}), 400
    
    # Prepare email
    try:
        msg = MIMEMultipart()
        msg['Subject'] = f"Attendance Notification - {student['name']}"
        msg['From'] = SMTP_CONFIG['username']
        msg['To'] = student['parent_email']
        
        if message_type == 'absence':
            html = f"""
            <h2>Absence Notification</h2>
            <p>Dear Parent/Guardian,</p>
            <p>This is to inform you that {student['name']} was marked <strong>Absent</strong> on {date}.</p>
            <p>If this is an error, please contact the Logical Classes.</p>
            <br>
            <p>Best regards,<br>Logical Classes</p>
            """
        else:
            html = f"""
            <h2>Attendance Notification</h2>
            <p>Dear Parent/Guardian,</p>
            <p>Attendance status for {student['name']} on {date}: <strong>{student['status'] or 'Not Marked'}</strong></p>
            <br>
            <p>Best regards,<br>Logical Classes</p>
            """
        
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        with smtplib.SMTP(SMTP_CONFIG['server'], SMTP_CONFIG['port']) as server:
            server.starttls()
            server.login(SMTP_CONFIG['username'], SMTP_CONFIG['password'])
            server.send_message(msg)
        
        return jsonify({"success": True, "message": "Notification sent successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to send email: {str(e)}"}), 500

# Backup and Restore
@app.route('/api/backup', methods=['GET'])
def backup_database():
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'attendance_backup_{timestamp}.db'
        backup_path = os.path.join('backups', backup_filename)
        
        # Copy database
        shutil.copy2(DATABASE, backup_path)
        
        # Create zip file
        zip_filename = f'attendance_backup_{timestamp}.zip'
        zip_path = os.path.join('static/backups', zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(backup_path, backup_filename)
            
            # Add metadata
            metadata = {
                'backup_date': datetime.now().isoformat(),
                'database': DATABASE,
                'size': os.path.getsize(backup_path)
            }
            zipf.writestr('metadata.json', json.dumps(metadata, indent=2))
        
        return jsonify({
            "success": True,
            "message": "Backup created successfully",
            "backup_file": zip_filename,
            "download_url": f"/static/backups/{zip_filename}"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/restore', methods=['POST'])
def restore_database():
    try:
        if 'backup_file' not in request.files:
            return jsonify({"success": False, "message": "No file provided"}), 400
        
        file = request.files['backup_file']
        if file.filename == '':
            return jsonify({"success": False, "message": "No file selected"}), 400
        
        # Save uploaded file
        temp_path = os.path.join('backups', 'temp_restore.zip')
        file.save(temp_path)
        
        # Extract and restore
        with zipfile.ZipFile(temp_path, 'r') as zipf:
            # Find database file
            db_files = [f for f in zipf.namelist() if f.endswith('.db')]
            if not db_files:
                return jsonify({"success": False, "message": "No database file in backup"}), 400
            
            # Backup current database first
            current_backup = os.path.join('backups', f'pre_restore_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')
            shutil.copy2(DATABASE, current_backup)
            
            # Extract and restore
            zipf.extract(db_files[0], 'backups')
            restore_path = os.path.join('backups', db_files[0])
            shutil.copy2(restore_path, DATABASE)
            
            # Cleanup
            os.remove(restore_path)
        
        os.remove(temp_path)
        
        return jsonify({
            "success": True,
            "message": "Database restored successfully"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Parent portal authentication
@app.route('/api/parent-login', methods=['POST'])
def parent_login():
    data = request.get_json()
    student_id = data.get('student_id')
    email = data.get('email')
    
    if not student_id or not email:
        return jsonify({"success": False, "message": "Student ID and email required"}), 400
    
    db = get_db()
    
    # Check if student exists with this email
    student = db.execute('''
        SELECT s.*, c.name as class_name
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = ? AND s.parent_email = ?
    ''', (student_id, email)).fetchone()
    
    if student:
        # Create or update parent login
        token = secrets.token_hex(32)
        
        parent_login = db.execute('SELECT * FROM parent_logins WHERE student_id = ?', (student_id,)).fetchone()
        if parent_login:
            db.execute('UPDATE parent_logins SET last_login = ? WHERE student_id = ?',
                      (datetime.now().isoformat(), student_id))
        else:
            # Generate default password
            default_password = hashlib.sha256(f"{student_id}{email}".encode()).hexdigest()[:8]
            db.execute('''
                INSERT INTO parent_logins (student_id, email, password, last_login)
                VALUES (?, ?, ?, ?)
            ''', (student_id, email, default_password, datetime.now().isoformat()))
        
        db.commit()
        
        return jsonify({
            "success": True,
            "token": token,
            "student": dict(student),
            "message": "Login successful. Default password has been set."
        })
    
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/parent-attendance', methods=['GET'])
def get_parent_attendance():
    student_id = request.args.get('student_id')
    month = request.args.get('month')  # Format: YYYY-MM
    
    if not student_id or not month:
        return jsonify({"success": False, "message": "Student ID and month required"}), 400
    
    db = get_db()
    
    # Get student info with class name
    student = db.execute('''
        SELECT s.*, c.name as class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = ?
    ''', (student_id,)).fetchone()
    
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404
    
    # Get attendance for the month
    attendance = db.execute('''
        SELECT date, status, remarks 
        FROM attendance 
        WHERE student_id = ? AND strftime("%Y-%m", date) = ?
        ORDER BY date DESC
    ''', (student_id, month)).fetchall()
    
    # Calculate statistics
    present_days = sum(1 for row in attendance if row['status'] == 'Present')
    total_days = len(attendance)
    attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
    
    return jsonify({
        "success": True,
        "student": dict(student),
        "attendance": [dict(row) for row in attendance],
        "statistics": {
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": sum(1 for row in attendance if row['status'] == 'Absent'),
            "late_days": sum(1 for row in attendance if row['status'] == 'Late'),
            "attendance_rate": round(attendance_rate, 2)
        }
    })

# Check holiday
@app.route('/api/check-holiday', methods=['GET'])
def check_holiday():
    date = request.args.get('date')
    
    if not date:
        return jsonify({"success": False, "message": "Date required"}), 400
    
    db = get_db()
    holiday = db.execute('SELECT * FROM holidays WHERE date = ?', (date,)).fetchone()
    
    if holiday:
        return jsonify({"is_holiday": True, "holiday": dict(holiday)})
    return jsonify({"is_holiday": False})

# Get student by ID
@app.route('/api/student/<int:student_id>', methods=['GET'])
def get_student(student_id):
    db = get_db()
    student = db.execute('SELECT * FROM students WHERE id = ?', (student_id,)).fetchone()
    
    if student:
        return jsonify({"success": True, "student": dict(student)})
    return jsonify({"success": False, "message": "Student not found"}), 404

# Get attendance history
@app.route('/api/attendance/history', methods=['GET'])
def get_attendance_history():
    student_id = request.args.get('student_id')
    
    if not student_id:
        return jsonify({"success": False, "message": "Student ID required"}), 400
    
    db = get_db()
    history = db.execute('''
        SELECT date, status, remarks 
        FROM attendance 
        WHERE student_id = ? 
        ORDER BY date DESC 
        LIMIT 10
    ''', (student_id,)).fetchall()
    
    return jsonify([dict(row) for row in history])

# Main entry point
if __name__ == '__main__':
    create_directories()
    init_db()
    
    print("=" * 60)
    print("Advanced Attendance System")
    print("=" * 60)
    print(f"Database: {DATABASE}")
    print(f"Static folder: {app.static_folder}")
    print(f"Uploads folder: static/uploads/")
    print(f"Backups folder: backups/")
    print("\nDefault Admin Credentials:")
    print("Username: Logical")
    print("Password: logical@11")
    print("\nStarting server on http://localhost:5000")
    print("=" * 60)
    
    # Check email configuration
    if not SMTP_CONFIG['username'] or not SMTP_CONFIG['password']:
        print("\n⚠️  WARNING: Email not configured!")
        print("Set SMTP_USERNAME and SMTP_PASSWORD in .env file")
        print("Email notifications will not work without configuration\n")
    
    app.run(debug=True, port=5000)