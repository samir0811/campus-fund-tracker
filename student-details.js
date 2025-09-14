// Student Details Page JavaScript

// Authentication check
function checkAuthentication() {
    const authToken = sessionStorage.getItem('campusFundAuthToken');
    if (!authToken) {
        // Not authenticated, redirect to index page
        window.location.href = 'index.html';
        return false;
    }
    
    // Try to restore authentication
    try {
        const authData = JSON.parse(atob(authToken));
        if (authData && authData.id && authData.timestamp) {
            // Check if token is not expired (24 hours validity)
            const now = new Date().getTime();
            if (now - authData.timestamp < 24 * 60 * 60 * 1000) {
                // Valid token
                return true;
            }
        }
    } catch (e) {
        // Invalid token format
    }
    
    // Invalid or expired token
    sessionStorage.removeItem('campusFundAuthToken');
    window.location.href = 'index.html';
    return false;
}

// Theme Management Functions (shared with main page)
function initializeTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('campusFundTheme');
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    applyTheme(theme);
    
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('campusFundTheme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

function applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;
    
    root.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
    } else {
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
    }
    
    applyThemeVariables(theme);
}

function applyThemeVariables(theme) {
    const root = document.documentElement;
    
    const themes = {
        light: {
            '--bg-color': '#f8f9fa',
            '--text-color': '#212529',
            '--card-bg': '#ffffff',
            '--card-header-bg': '#f8f9fa',
            '--border-color': '#dee2e6',
            '--shadow-color': 'rgba(0, 0, 0, 0.1)',
            '--hover-bg': 'rgba(0, 0, 0, 0.05)',
            '--muted-text': '#6c757d',
            '--input-bg': '#ffffff',
            '--input-text': '#495057',
            '--pagination-bg': '#ffffff',
            '--pagination-hover-bg': '#e9ecef',
            '--table-row-hover': '#f8f9fa'
        },
        dark: {
            '--bg-color': '#121212',
            '--text-color': '#e9ecef',
            '--card-bg': '#1e1e1e',
            '--card-header-bg': '#2d2d2d',
            '--border-color': '#444',
            '--shadow-color': 'rgba(0, 0, 0, 0.3)',
            '--hover-bg': 'rgba(255, 255, 255, 0.05)',
            '--muted-text': '#adb5bd',
            '--input-bg': '#2d2d2d',
            '--input-text': '#e9ecef',
            '--pagination-bg': '#2d2d2d',
            '--pagination-hover-bg': '#444',
            '--table-row-hover': '#2a2a2a'
        }
    };
    
    const themeVars = themes[theme] || themes.light;
    Object.entries(themeVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    if (theme === 'dark') {
        document.querySelectorAll('.table').forEach(table => {
            table.classList.add('table-dark');
        });
    } else {
        document.querySelectorAll('.table').forEach(table => {
            table.classList.remove('table-dark');
        });
    }
}

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// CSV URL for Google Sheets
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRWkgGmSGfrpW-idvJ_U1jgam8F1Dy0dHfIjVDgz6LwclTSUZlHxJrJ--qQ6ND7iqEwJ_p0z4n/pub?gid=0&single=true&output=csv';

// Get student details from CSV
async function loadStudentDetails() {
    try {
        const studentId = getUrlParameter('id');
        if (!studentId) {
            showError('Student ID not provided. Redirecting to student list...');
            return;
        }
        
        showLoading();
        console.log('Loading details for student ID:', studentId);
        
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        const student = findStudentById(csvText, studentId);
        
        if (!student) {
            showError('Student not found. Redirecting to student list...');
            return;
        }
        
        displayStudentDetails(student);
        hideLoading();
        
        // Update page title with student name
        document.title = `${student.name} - Payment Details`;
        
    } catch (error) {
        console.error('Error loading student details:', error);
        hideLoading();
        showError('Error loading data. Please try again later.');
    }
}

// Parse CSV and find student by ID
function findStudentById(csvText, studentId) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('Invalid CSV format');
    }
    
    // Get headers
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Find student
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length) {
            const student = {};
            headers.forEach((header, index) => {
                student[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
            });
            
            // Normalize ID field
            student.id = student.ID || student.id || student['Student ID'] || '';
            
            // Check if this is the student we're looking for
            if (student.id == studentId) {
                processStudentData(student, headers);
                return student;
            }
        }
    }
    
    return null;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Process student data
function processStudentData(student, headers) {
    // Normalize common fields
    student.name = student.Name || student.name || student['Student Name'] || '';
    student.totalPaid = calculateTotalPayments(student);
    student.lastPayment = findLastPaymentDate(student);
    
    // Extract contact information
    student.phone = student.Phone || student.phone || student['Mobile'] || student['Contact'] || '';
    student.email = student.Email || student.email || student['E-mail'] || student['Email Address'] || '';
    student.address = student.Address || student.address || '';
    student.class = student.Class || student.class || student['Grade'] || student['Standard'] || '';
    
    // Extract all month values
    student.months = {};
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    months.forEach(month => {
        if (headers.includes(month)) {
            student.months[month] = parseFloat(student[month] || '0') || 0;
        }
    });
}

// Calculate total payments
function calculateTotalPayments(student) {
    let total = 0;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    months.forEach(month => {
        if (student[month]) {
            const payment = parseFloat(student[month]) || 0;
            total += payment;
        }
    });
    
    return total;
}

// Find last payment date
function findLastPaymentDate(student) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const currentYear = new Date().getFullYear();
    let lastPaidMonth = null;
    let lastPaidMonthIndex = -1;
    
    months.forEach((month, index) => {
        if (student[month] && parseFloat(student[month]) > 0) {
            if (index > lastPaidMonthIndex) {
                lastPaidMonth = month;
                lastPaidMonthIndex = index;
            }
        }
    });
    
    if (lastPaidMonth) {
        return `${lastPaidMonth} ${currentYear}`;
    }
    
    return 'N/A';
}

// Display student details
function displayStudentDetails(student) {
    // Update header
    $('#studentName').text(student.name);
    $('#studentId').text(student.id);
    
    // Update info card - basic details
    $('#infoName').text(student.name);
    $('#infoId').text(student.id);
    $('#infoTotalPaid').text(`₹${student.totalPaid.toLocaleString()}`);
    $('#infoLastPayment').text(student.lastPayment);
    $('#infoClass').text(student.class || 'N/A');
    $('#infoAddress').text(student.address || 'N/A');
    
    // Setup contact links with proper href values
    setupContactLinks(student);
    
    // Display recent months
    displayRecentMonths(student);
    
    // Display complete payment history
    displayPaymentHistory(student);
}

// Setup all contact links
function setupContactLinks(student) {
    const phone = student.phone || '';
    const email = student.email || '';
    
    // Phone link
    if (phone) {
        $('#infoPhone').attr('href', `tel:${phone}`);
        $('#infoPhone span').text(phone);
        $('#callLink').attr('href', `tel:${phone}`);
        $('#whatsappLink').attr('href', `https://wa.me/${phone.replace(/[^0-9]/g, '')}`);
    } else {
        $('#infoPhone span').text('N/A');
        $('#infoPhone').removeAttr('href').addClass('text-muted');
        $('#callLink').addClass('disabled');
        $('#whatsappLink').addClass('disabled');
    }
    
    // Email link
    if (email) {
        $('#infoEmail').attr('href', `mailto:${email}`);
        $('#infoEmail span').text(email);
        $('#emailLink').attr('href', `mailto:${email}`);
    } else {
        $('#infoEmail span').text('N/A');
        $('#infoEmail').removeAttr('href').addClass('text-muted');
        $('#emailLink').addClass('disabled');
    }
}

// Display recent months (focusing on October, November, December)
function displayRecentMonths(student) {
    const recentMonthsEl = $('#recentMonths');
    recentMonthsEl.empty();
    
    // Highlight October, November, December
    const targetMonths = ['October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    
    targetMonths.forEach(month => {
        const paid = student.months && student.months[month] > 0;
        const amount = paid ? `₹${student.months[month].toLocaleString()}` : '-';
        const statusClass = paid ? 'success' : 'danger';
        const statusText = paid ? 'Paid' : 'Not Paid';
        const statusIcon = paid ? 'check-circle' : 'times-circle';
        
        recentMonthsEl.append(`
            <div class="col-md-4 mb-3">
                <div class="card month-card border-${statusClass} h-100">
                    <div class="card-header bg-${statusClass} text-white">
                        <h5 class="card-title mb-0">
                            ${month} ${currentYear}
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <h3 class="mb-0">${amount}</h3>
                            <div class="text-${statusClass} fs-4">
                                <i class="fas fa-${statusIcon}"></i>
                            </div>
                        </div>
                        <p class="mt-2 mb-0 text-${statusClass} fw-bold">${statusText}</p>
                    </div>
                </div>
            </div>
        `);
    });
}

// Display complete payment history
function displayPaymentHistory(student) {
    const historyEl = $('#paymentHistory');
    historyEl.empty();
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const currentYear = new Date().getFullYear();
    
    months.forEach(month => {
        const paid = student.months && student.months[month] > 0;
        const amount = paid ? `₹${student.months[month].toLocaleString()}` : '-';
        const statusClass = paid ? 'paid' : 'unpaid';
        const textClass = paid ? 'text-success' : 'text-danger';
        const statusText = paid ? 'Paid' : 'Not Paid';
        const statusIcon = paid ? 'check-circle' : 'times-circle';
        
        historyEl.append(`
            <div class="payment-history-item ${statusClass}">
                <div class="row">
                    <div class="col-md-3">
                        <strong>${month} ${currentYear}</strong>
                    </div>
                    <div class="col-md-3 ${textClass} fw-bold">
                        ${amount}
                    </div>
                    <div class="col-md-3 ${textClass}">
                        <i class="fas fa-${statusIcon} me-2"></i> ${statusText}
                    </div>
                </div>
            </div>
        `);
    });
}

// UI Helper Functions
function showLoading() {
    // Could add a loading spinner here
    $('body').css('opacity', '0.6');
}

function hideLoading() {
    $('body').css('opacity', '1');
}

function showError(message) {
    alert(message);
    // Redirect back to main page after a moment
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// Initialize when document is ready
$(document).ready(function() {
    // First check authentication
    if (checkAuthentication()) {
        initializeTheme();
        loadStudentDetails();
    }
});
