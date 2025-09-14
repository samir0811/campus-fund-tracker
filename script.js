// Campus Fund Money Collection Tracker - JavaScript
// Data Management and UI Interactions

// Global Variables
let studentsData = [];
let filteredData = [];
let currentPage = 1;
let entriesPerPage = 20;
let sortColumn = '';
let sortDirection = 'asc';

// CSV URL for Google Sheets
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRWkgTtvUGGmSGfrpW-idvJ_U1jgam8F1Dy0dHfIjVDgz6LwclTSUZlHxJrJ--qQ6ND7iqEwJ_p0z4n/pub?gid=0&single=true&output=csv';

// Authentication state
let isAuthenticated = false;
let authenticatedStudentId = '';

// Initialize the application when DOM is loaded
$(document).ready(function() {
    initializeApp();
    setupEventListeners();
    
    // Check if already authenticated (for session persistence)
    const authToken = sessionStorage.getItem('campusFundAuthToken');
    if (authToken) {
        // Try to restore authentication
        try {
            const authData = JSON.parse(atob(authToken));
            if (authData && authData.id && authData.timestamp) {
                // Check if token is not expired (24 hours validity)
                const now = new Date().getTime();
                if (now - authData.timestamp < 24 * 60 * 60 * 1000) {
                    // Valid token
                    authenticatedStudentId = authData.id;
                    isAuthenticated = true;
                    // Show My Payments button
                    $('#viewMyPayments').show();
                    loadData();
                    return;
                }
            }
        } catch (e) {
            // Invalid token format, clear it
            sessionStorage.removeItem('campusFundAuthToken');
        }
    }
    
    // Not authenticated, show login modal
    $('#loginModal').modal('show');
});

// Initialize application
function initializeApp() {
    // Set current month/year in UI if needed
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Initialize pagination
    entriesPerPage = parseInt($('#entriesPerPage').val()) || 20;
    
    // Initialize dark theme
    initializeDarkTheme();
}

// Setup all event listeners
function setupEventListeners() {
    // Login form submission
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        validateLogin();
    });
    
    // Auto-format admission number as user types
    $('#admissionNumber').on('input', function() {
        formatAdmissionNumber();
    });
    
    // Initialize login attempt check when modal is shown
    $('#loginModal').on('shown.bs.modal', function() {
        // Check if user is locked out
        checkLoginLockout();
    });
    
    // View My Payment History button
    $('#viewMyPayments').on('click', function() {
        showStudentPaymentHistory(authenticatedStudentId);
    });
    
    // Search functionality
    $('#searchInput').on('input', debounce(handleSearch, 300));
    
    // Filter dropdown
    $('#monthFilter').on('change', handleFilter);
    
    // Entries per page
    $('#entriesPerPage').on('change', handleEntriesPerPageChange);
    
    // Refresh button
    $('#refreshData').on('click', function() {
        $(this).html('<i class="fas fa-sync-alt fa-spin me-1"></i> Refreshing...');
        loadData();
        setTimeout(() => {
            $(this).html('<i class="fas fa-sync-alt me-1"></i> Refresh Data');
        }, 2000);
    });
    
    // Table sorting
    $('.sortable').on('click', handleSort);
    
    // Pagination clicks (delegated event)
    $(document).on('click', '.pagination .page-link', handlePagination);
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load student data from Google Sheets CSV
async function loadStudentData() {
    try {
        showLoadingModal();
        
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Parse CSV data
        studentsData = parseCSVData(csvText);
        
        // Process and display data
        processData();
        updateStatistics();
        applyCurrentFilters();
        
        hideLoadingModal();
        
        // Update refresh button
        $('#refreshData').html('<i class="fas fa-sync-alt me-1"></i> Refresh Data');
        
        // Show success message
        showNotification('Data loaded successfully!', 'success');
        
    } catch (error) {
        hideLoadingModal();
        $('#refreshData').html('<i class="fas fa-sync-alt me-1"></i> Refresh Data');
        
        // Show error message
        showNotification('Error loading data. Please check your connection and try again.', 'error');
        
        // Load sample data for demonstration
        loadSampleData();
    }
}

// Parse CSV data into JavaScript objects
function parseCSVData(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('Invalid CSV format');
    }
    
    // Get headers
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length) {
            const student = {};
            headers.forEach((header, index) => {
                student[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
            });
            
            // Process the student data
            processStudentRecord(student);
            data.push(student);
        }
    }
    
    return data;
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

// Process individual student record
function processStudentRecord(student) {
    // Normalize field names (adapt based on your CSV structure)
    student.id = student.ID || student.id || student['Student ID'] || '';
    student.name = student.Name || student.name || student['Student Name'] || '';
    student.rollno = student.RollNo || student.rollno || student['Roll No'] || student['Roll Number'] || '';
    
    // Get current month name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    
    // Process payment data based on month names from CSV
    student.currentMonth = parseFloat(student[currentMonthName] || student['Current Month'] || student.currentMonth || '0') || 0;
    
    // For previous month, get the name of the previous month
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthName = previousDate.toLocaleString('default', { month: 'long' });
    
    student.previousMonth = parseFloat(student[previousMonthName] || student['Previous Month'] || student.previousMonth || '0') || 0;
    student.totalPaid = parseFloat(student['Total Paid'] || student.totalPaid || '0') || 0;
    
    // Calculate total from all available month columns
    if (!student.totalPaid) {
        student.totalPaid = calculateTotalPayments(student);
    }
    
    // Find the most recent payment date
    student.lastPayment = findLastPaymentDate(student) || student['Last Payment'] || student.lastPayment || 'N/A';
    
    // Determine status
    student.status = determinePaymentStatus(student);
    
    // Additional fields
    student.phone = student.Phone || student.phone || '';
    student.email = student.Email || student.email || '';
}

// Calculate total payments from all month columns
function calculateTotalPayments(student) {
    let total = 0;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Add up all month values
    months.forEach(month => {
        if (student[month]) {
            const payment = parseFloat(student[month]) || 0;
            total += payment;
        }
    });
    
    // Add any other payment columns
    if (student.currentMonth) total += student.currentMonth;
    if (student.previousMonth) total += student.previousMonth;
    
    // Remove duplicates if we've already counted the current/previous months by name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthName = previousDate.toLocaleString('default', { month: 'long' });
    
    if (student[currentMonthName] && student.currentMonth) {
        total -= student.currentMonth;
    }
    
    if (student[previousMonthName] && student.previousMonth) {
        total -= student.previousMonth;
    }
    
    return total;
}

// Find the most recent payment date
function findLastPaymentDate(student) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Get current year
    const currentYear = new Date().getFullYear();
    let lastPaidMonth = null;
    let lastPaidMonthIndex = -1;
    
    // Find the most recent month with a payment
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
    
    return null;
}

// Determine payment status based on payment data
function determinePaymentStatus(student) {
    const currentMonthPaid = student.currentMonth > 0;
    const previousMonthPaid = student.previousMonth > 0;
    
    if (currentMonthPaid && previousMonthPaid) {
        return 'paid';
    } else if (currentMonthPaid || previousMonthPaid) {
        return 'partial';
    } else {
        return 'unpaid';
    }
}

// Process data and calculate statistics
function processData() {
    // Ensure we have valid data
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
        return;
    }
    
    // Additional processing can be added here
    // Sort initially by ID
    studentsData.sort((a, b) => {
        const aId = parseInt(a.id) || 0;
        const bId = parseInt(b.id) || 0;
        return aId - bId;
    });
    
    // Set initial sort column and direction
    sortColumn = 'id';
    sortDirection = 'asc';
}

// Update statistics cards
function updateStatistics() {
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
        return;
    }
    
    const totalStudents = studentsData.length;
    let currentPaid = 0;
    let currentUnpaid = 0;
    let previousUnpaid = 0;
    let totalCurrentMonth = 0;
    let totalPreviousMonth = 0;
    
    // Get current month name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    
    // Get previous month name
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthName = previousDate.toLocaleString('default', { month: 'long' });
    
    studentsData.forEach(student => {
        // Current month statistics - check both specific month name and generic currentMonth
        if (student.currentMonth > 0 || (student[currentMonthName] && parseFloat(student[currentMonthName]) > 0)) {
            currentPaid++;
            const monthValue = student.currentMonth > 0 ? student.currentMonth : parseFloat(student[currentMonthName]);
            totalCurrentMonth += monthValue;
        } else {
            currentUnpaid++;
        }
        
        // Previous month statistics
        if ((student.previousMonth <= 0 || !student.previousMonth) && 
            (!student[previousMonthName] || parseFloat(student[previousMonthName]) <= 0)) {
            previousUnpaid++;
        } else {
            const monthValue = student.previousMonth > 0 ? 
                student.previousMonth : parseFloat(student[previousMonthName] || 0);
            totalPreviousMonth += monthValue;
        }
    });
    
    // Update UI
    $('#currentPaidCount').text(currentPaid);
    $('#currentUnpaidCount').text(currentUnpaid);
    $('#previousUnpaidCount').text(previousUnpaid);
    $('#totalStudents').text(totalStudents);
    
    // Update balance
    $('#currentBalance').text(`₹${totalCurrentMonth.toLocaleString()}`);
    
    // Calculate balance change
    const balanceChange = totalCurrentMonth - totalPreviousMonth;
    const changeText = balanceChange >= 0 ? `+₹${balanceChange.toLocaleString()}` : `-₹${Math.abs(balanceChange).toLocaleString()}`;
    const changeClass = balanceChange >= 0 ? 'positive' : 'negative';
    
    $('#balanceChange')
        .text(`${changeText} from last month`)
        .removeClass('positive negative')
        .addClass(changeClass);
}

// Handle search functionality
function handleSearch() {
    const searchTerm = $('#searchInput').val().toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredData = [...studentsData];
    } else {
        filteredData = studentsData.filter(student => {
            return (student.name || '').toLowerCase().includes(searchTerm) ||
                   (student.rollno || '').toLowerCase().includes(searchTerm) ||
                   (student.id || '').toString().toLowerCase().includes(searchTerm);
        });
    }
    
    currentPage = 1;
    displayTable();
    updatePagination();
}

// Handle filter changes
function handleFilter() {
    const filterValue = $('#monthFilter').val();
    
    switch (filterValue) {
        case 'current':
            filteredData = studentsData.filter(student => student.currentMonth > 0);
            break;
        case 'previous':
            filteredData = studentsData.filter(student => student.previousMonth > 0);
            break;
        case 'paid':
            filteredData = studentsData.filter(student => student.status === 'paid');
            break;
        case 'unpaid':
            filteredData = studentsData.filter(student => student.status === 'unpaid');
            break;
        case 'all':
        default:
            filteredData = [...studentsData];
            break;
    }
    
    // Also apply search if there's a search term
    const searchTerm = $('#searchInput').val().toLowerCase().trim();
    if (searchTerm !== '') {
        filteredData = filteredData.filter(student => {
            return (student.name || '').toLowerCase().includes(searchTerm) ||
                   (student.rollno || '').toLowerCase().includes(searchTerm) ||
                   (student.id || '').toString().toLowerCase().includes(searchTerm);
        });
    }
    
    currentPage = 1;
    displayTable();
    updatePagination();
}

// Apply current filters (used after data reload)
function applyCurrentFilters() {
    filteredData = [...studentsData];
    
    // Update UI to show ID column as sorted
    $('.sortable').removeClass('sort-asc sort-desc');
    $('.sortable[data-column="id"]').addClass('sort-asc');
    
    handleFilter(); // This will also apply search
}

// Handle entries per page change
function handleEntriesPerPageChange() {
    const newEntriesPerPage = $('#entriesPerPage').val();
    entriesPerPage = newEntriesPerPage === 'all' ? filteredData.length : parseInt(newEntriesPerPage);
    currentPage = 1;
    displayTable();
    updatePagination();
}

// Handle table sorting
function handleSort(e) {
    const column = $(e.currentTarget).data('column');
    
    // Update sort direction
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Update UI
    $('.sortable').removeClass('sort-asc sort-desc');
    $(e.currentTarget).addClass(`sort-${sortDirection}`);
    
    // Sort data
    filteredData.sort((a, b) => {
        let aValue = a[column] || '';
        let bValue = b[column] || '';
        
        // Handle numeric columns
        if (['id', 'currentMonth', 'previousMonth', 'totalPaid'].includes(column)) {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
        } else {
            aValue = aValue.toString().toLowerCase();
            bValue = bValue.toString().toLowerCase();
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    currentPage = 1;
    displayTable();
    updatePagination();
}

// Handle pagination
function handlePagination(e) {
    e.preventDefault();
    // Stop event propagation to prevent row click handler from being triggered
    e.stopPropagation();
    
    const page = $(e.currentTarget).data('page');
    
    if (page === 'prev') {
        currentPage = Math.max(1, currentPage - 1);
    } else if (page === 'next') {
        const totalPages = Math.ceil(filteredData.length / entriesPerPage);
        currentPage = Math.min(totalPages, currentPage + 1);
    } else if (typeof page === 'number') {
        currentPage = page;
    }
    
    displayTable();
    updatePagination();
}

// Display table with current page data
function displayTable() {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = entriesPerPage === 'all' ? filteredData.length : startIndex + entriesPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    const tbody = $('#studentsTableBody');
    tbody.empty();
    
    if (pageData.length === 0) {
        const columnCount = $('#studentsTable thead tr th').length;
        tbody.html(`
            <tr>
                <td colspan="${columnCount}" class="text-center py-4">
                    <i class="fas fa-search fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">No students found matching your criteria.</p>
                </td>
            </tr>
        `);
        return;
    }
    
    pageData.forEach(student => {
        const row = createTableRow(student);
        tbody.append(row);
    });
    
    // Add fade-in animation
    tbody.addClass('fade-in');
    setTimeout(() => tbody.removeClass('fade-in'), 500);
}

// Create table row for student
function createTableRow(student) {
    const statusBadge = getStatusBadge(student.status);
    const currentMonthDisplay = student.currentMonth > 0 ? `₹${student.currentMonth}` : '-';
    const previousMonthDisplay = student.previousMonth > 0 ? `₹${student.previousMonth}` : '-';
    const totalPaidDisplay = student.totalPaid > 0 ? `₹${student.totalPaid}` : '-';
    
    // Get visible columns from table header
    const visibleColumns = [];
    $('#studentsTable thead tr th').each(function() {
        const span = $(this).find('span');
        if (span.length > 0) {
            visibleColumns.push(span.data('column'));
        }
    });
    
    let rowHtml = '<tr>';
    
    visibleColumns.forEach(column => {
        switch(column) {
            case 'id':
                rowHtml += `<td><span class="fw-bold text-primary">${escapeHtml(student.id || 'N/A')}</span></td>`;
                break;
            case 'name':
                rowHtml += `<td><div><strong>${escapeHtml(student.name || 'N/A')}</strong>${student.email ? `<br><small class="text-muted">${escapeHtml(student.email)}</small>` : ''}</div></td>`;
                break;
            // Roll No case removed as requested
            case 'currentMonth':
                // Get current month name and check if it exists as column
                const currentDate = new Date();
                const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
                const hasCurrentMonthValue = student[currentMonthName] && parseFloat(student[currentMonthName]) > 0;
                
                // Display either the value from month name or generic currentMonth
                const currentValue = hasCurrentMonthValue ? 
                    parseFloat(student[currentMonthName]) : student.currentMonth;
                const hasPayment = currentValue > 0;
                const displayValue = hasPayment ? `₹${currentValue}` : '-';
                
                rowHtml += `<td><span class="${hasPayment ? 'text-success fw-bold' : 'text-muted'}">${displayValue}</span></td>`;
                break;
            case 'previousMonth':
                // Get previous month name and check if it exists as column
                const previousDate = new Date();
                previousDate.setMonth(previousDate.getMonth() - 1);
                const previousMonthName = previousDate.toLocaleString('default', { month: 'long' });
                const hasPrevMonthValue = student[previousMonthName] && parseFloat(student[previousMonthName]) > 0;
                
                // Display either the value from month name or generic previousMonth
                const prevValue = hasPrevMonthValue ? 
                    parseFloat(student[previousMonthName]) : student.previousMonth;
                const hasPrevPayment = prevValue > 0;
                const displayPrevValue = hasPrevPayment ? `₹${prevValue}` : '-';
                
                rowHtml += `<td><span class="${hasPrevPayment ? 'text-success fw-bold' : 'text-muted'}">${displayPrevValue}</span></td>`;
                break;
            // Removed totalPaid case as requested
            case 'lastPayment':
                rowHtml += `<td><small class="text-muted">${escapeHtml(student.lastPayment || 'N/A')}</small></td>`;
                break;
            case 'status':
                rowHtml += `<td>${statusBadge}</td>`;
                break;
            default:
                // Handle any other columns from CSV
                const value = student[column] || 'N/A';
                rowHtml += `<td>${escapeHtml(value)}</td>`;
                break;
        }
    });
    
    rowHtml += '</tr>';
    
    // Add click event to row to open student details
    const $row = $(rowHtml);
    $row.on('click', function() {
        window.location.href = `student-details.html?id=${student.id}`;
    });
    $row.css({
        'cursor': 'pointer',
        'transition': 'all 0.2s ease'
    }).hover(
        function() { $(this).css('background-color', 'var(--hover-bg)'); },
        function() { $(this).css('background-color', ''); }
    );
    
    // Add a data attribute for the student ID
    $row.attr('data-student-id', student.id);
    $row.attr('title', `Click to view details for ${student.name}`);
    
    return $row[0].outerHTML;
}

// Get status badge HTML - Modified to show "Paid" for current month
function getStatusBadge(status) {
    // Get current month name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    
    switch (status) {
        case 'paid':
            return `<span class="status-badge status-paid"><i class="fas fa-check me-1"></i>Paid</span>`;
        case 'partial':
            return `<span class="status-badge status-partial"><i class="fas fa-exclamation me-1"></i>Paid</span>`;
        case 'unpaid':
        default:
            return '<span class="status-badge status-unpaid"><i class="fas fa-times me-1"></i>Not Paid</span>';
    }
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
    const pagination = $('#pagination');
    pagination.empty();
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    pagination.append(`
        <li class="page-item ${prevDisabled}">
            <a class="page-link" href="#" data-page="prev">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        pagination.append(`<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`);
        if (startPage > 2) {
            pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'active' : '';
        pagination.append(`
            <li class="page-item ${active}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
        }
        pagination.append(`<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`);
    }
    
    // Next button
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    pagination.append(`
        <li class="page-item ${nextDisabled}">
            <a class="page-link" href="#" data-page="next">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show loading modal
function showLoadingModal() {
    $('#loadingModal').modal('show');
}

// Hide loading modal
function hideLoadingModal() {
    $('#loadingModal').modal('hide');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
    const iconClass = type === 'error' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    const notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            <i class="fas ${iconClass} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.alert('close');
    }, 5000);
}

// Load sample data for demonstration (fallback)
function loadSampleData() {
    // Fallback to sample data if CSV loading fails
    
    studentsData = [];
    
    // Get current month name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    
    // Get previous month name
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthName = previousDate.toLocaleString('default', { month: 'long' });
    
    for (let i = 1; i <= 70; i++) {
        const student = {
            id: i,
            name: `Student ${i}`,
            rollno: `2024${String(i).padStart(3, '0')}`,
            phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            email: `student${i}@college.edu`,
            totalPaid: 0,
            lastPayment: Math.random() > 0.3 ? `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${Math.floor(Math.random() * 28) + 1}` : 'N/A',
            status: 'unpaid'
        };
        
        // Add payment data for current and previous months using actual month names
        student[currentMonthName] = Math.random() > 0.3 ? 1000 : 0; // 70% chance of payment
        student[previousMonthName] = Math.random() > 0.5 ? 1000 : 0; // 50% chance of payment
        
        // Also add generic fields for compatibility
        student.currentMonth = student[currentMonthName];
        student.previousMonth = student[previousMonthName];
        
        student.totalPaid = student.currentMonth + student.previousMonth;
        student.status = determinePaymentStatus(student);
        studentsData.push(student);
    }
    
    processData();
    updateStatistics();
    applyCurrentFilters();
    
    showNotification('Sample data loaded for demonstration', 'info');
}

// Dark Theme Management - Permanent Dark Mode

function initializeDarkTheme() {
    const root = document.documentElement;
    const body = document.body;
    
    // Set dark theme permanently
    root.setAttribute('data-theme', 'dark');
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
    
    // Apply dark theme variables
    const darkThemeVars = {
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
    };
    
    // Apply all variables to root element
    Object.entries(darkThemeVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    // Apply dark theme to tables
    document.querySelectorAll('.table').forEach(table => {
        table.classList.add('table-dark');
    });
    
    // Force browser repaint to apply changes immediately
    const forceRepaint = document.body.offsetHeight;
}





// Authentication Functions and Attempt Management
const MAX_LOGIN_ATTEMPTS = 3; // Maximum allowed login attempts
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Check if user is locked out due to too many failed attempts
function checkLoginLockout() {
    const lockoutData = getCookie('loginLockout');
    
    if (lockoutData) {
        try {
            const lockout = JSON.parse(lockoutData);
            const now = new Date().getTime();
            
            // Check if lockout period is still active
            if (now < lockout.timestamp + LOCKOUT_DURATION) {
                // Calculate remaining time
                const remainingTime = Math.ceil((lockout.timestamp + LOCKOUT_DURATION - now) / (1000 * 60 * 60));
                showLoginError(`Too many failed attempts. Account locked for ${remainingTime} hour(s).`);
                $('#loginForm button[type="submit"]').prop('disabled', true);
                return true;
            } else {
                // Lockout period expired, clear the cookie
                deleteCookie('loginLockout');
                resetLoginAttempts();
            }
        } catch (e) {
            // Invalid cookie format, clear it
            deleteCookie('loginLockout');
        }
    }
    
    return false;
}

// Get login attempts from cookies
function getLoginAttempts() {
    const attempts = getCookie('loginAttempts');
    return attempts ? parseInt(attempts, 10) : 0;
}

// Increment login attempts
function incrementLoginAttempts() {
    const attempts = getLoginAttempts() + 1;
    setCookie('loginAttempts', attempts.toString(), 1); // Store for 1 day
    
    // If max attempts reached, set lockout
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockout = {
            timestamp: new Date().getTime()
        };
        setCookie('loginLockout', JSON.stringify(lockout), 1); // Store for 1 day
        
        // Disable the login button
        $('#loginForm button[type="submit"]').prop('disabled', true);
        
        showLoginError(`Too many failed attempts. Account locked for 24 hours.`);
        return true;
    }
    
    // Show remaining attempts
    if (attempts > 0 && attempts < MAX_LOGIN_ATTEMPTS) {
        const remaining = MAX_LOGIN_ATTEMPTS - attempts;
        $('#loginAttemptsWarning').html(`<div class="alert alert-warning mt-2"><i class="fas fa-exclamation-triangle me-2"></i>Warning: ${remaining} login attempt(s) remaining before temporary lockout.</div>`).show();
    }
    
    return false;
}

// Reset login attempts counter
function resetLoginAttempts() {
    deleteCookie('loginAttempts');
    $('#loginAttemptsWarning').hide();
}

// Cookie utilities
function setCookie(name, value, days) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Strict';
}

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function deleteCookie(name) {
    setCookie(name, '', -1); // Set expiry to past
}

function validateLogin() {
    // Check if the user is locked out first
    if (checkLoginLockout()) {
        return;
    }
    
    let admissionNumber = $('#admissionNumber').val().trim();
    
    // Handle if user enters just the ID number (1-4 digits)
    if (/^\d{1,4}$/.test(admissionNumber)) {
        // Remove leading zeros
        const numericId = parseInt(admissionNumber, 10).toString();
        // Auto-format with the standard prefix
        admissionNumber = `KEG/PM/2324/F/${numericId}`;
        $('#admissionNumber').val(admissionNumber);
    }
    
    // Validate format: KEG/PM/2324/F/XXXX where XXXX is a variable length number
    // More flexible pattern that accepts 1-4 digits at the end
    const admissionPattern = /^KEG\/PM\/2324\/F\/\d{1,4}$/;
    if (!admissionPattern.test(admissionNumber)) {
        showLoginError('Invalid admission number format. Please use format: KEG/PM/2324/F/0001');
        incrementLoginAttempts();
        return;
    }
    
    // Extract the student ID from the admission number (last 1-4 digits)
    // and remove leading zeros
    const studentIdWithLeadingZeros = admissionNumber.substring(admissionNumber.lastIndexOf('/') + 1);
    const studentId = parseInt(studentIdWithLeadingZeros, 10).toString();
    
    // Fetch CSV data to validate the ID
    validateStudentId(studentId);
}

// Format admission number as the user types
function formatAdmissionNumber() {
    const input = $('#admissionNumber');
    let value = input[0].value;
    
    // Store cursor position
    const cursorPos = input[0].selectionStart;
    
    // Count slashes before cursor position to adjust cursor later
    const slashesBefore = (value.substring(0, cursorPos).match(/\//g) || []).length;
    
    // Remove all non-alphanumeric characters first
    let cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
    
    // Convert to uppercase for consistency
    cleaned = cleaned.toUpperCase();
    
    // For better UX, prefill "KEG/PM/2324/F/" if the user starts typing just numbers
    if (/^\d+$/.test(cleaned) && cleaned.length <= 4) {
        // Remove leading zeros for ID part
        const numericId = parseInt(cleaned, 10).toString();
        cleaned = "KEGPM2324F" + numericId;
    }
    
    // Apply the pattern KEG/PM/2324/F/XXXX
    let formatted = '';
    
    // Handle each segment with proper formatting
    if (cleaned.length > 0) {
        // First segment (KEG)
        formatted = cleaned.substring(0, Math.min(3, cleaned.length));
        
        if (cleaned.length > 3) {
            // Second segment (PM)
            formatted += '/' + cleaned.substring(3, Math.min(5, cleaned.length));
            
            if (cleaned.length > 5) {
                // Third segment (2324)
                formatted += '/' + cleaned.substring(5, Math.min(9, cleaned.length));
                
                if (cleaned.length > 9) {
                    // Fourth segment (F)
                    formatted += '/' + cleaned.substring(9, Math.min(10, cleaned.length));
                    
                    if (cleaned.length > 10) {
                        // Fifth segment (XXXX)
                        formatted += '/' + cleaned.substring(10);
                    }
                }
            }
        }
    }
    
    // Update input value
    input.val(formatted);
    
    // Visual feedback based on format validity
    const isValid = /^KEG\/PM\/2324\/F\/\d{1,4}$/.test(formatted);
    
    if (formatted.length > 0) {
        if (isValid) {
            input.removeClass('is-invalid').addClass('is-valid');
        } else if (formatted.length >= 15) {
            // Only show invalid state when they've almost completed the number
            input.removeClass('is-valid').addClass('is-invalid');
        } else {
            input.removeClass('is-valid is-invalid');
        }
    } else {
        input.removeClass('is-valid is-invalid');
    }
    
    // If we auto-filled the prefix and user typed just numbers,
    // place cursor at the end for better UX
    if (/^\d+$/.test(value) && value.length <= 4) {
        input[0].setSelectionRange(formatted.length, formatted.length);
        return;
    }
    
    // Count new slashes before where cursor would be
    const newSlashesBefore = (formatted.substring(0, cursorPos).match(/\//g) || []).length;
    
    // Adjust cursor position based on added/removed slashes
    const newCursorPos = cursorPos + (newSlashesBefore - slashesBefore);
    
    // Restore cursor position
    input[0].setSelectionRange(newCursorPos, newCursorPos);
}

function validateStudentId(studentId) {
    fetch(CSV_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network error: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            const lines = csvText.trim().split('\n');
            
            // Get headers
            const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
            const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
            
            if (idIndex === -1) {
                showLoginError('System configuration error. Please contact administrator.');
                return;
            }
            
            // Create different versions of the ID for flexible matching
            const paddedId = studentId.padStart(4, '0');
            // Also convert to number and back to string to remove leading zeros
            const numericId = parseInt(studentId, 10).toString();
            
            // Check if ID exists in the CSV
            let found = false;
            let matchedId = '';
            
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length > idIndex) {
                    const idValue = values[idIndex].trim().replace(/"/g, '');
                    // Convert the DB ID to numeric form too (removing leading zeros)
                    const numericIdValue = parseInt(idValue, 10).toString();
                    
                    // Check for matches with or without leading zeros
                    if (idValue === studentId || 
                        idValue === paddedId || 
                        idValue.endsWith(studentId) || 
                        numericIdValue === numericId) {
                        found = true;
                        matchedId = idValue;
                        break;
                    }
                }
            }
            
            if (found) {
                // Authentication successful
                loginSuccessful(matchedId || studentId);
                // Reset login attempts on successful login
                resetLoginAttempts();
            } else {
                showLoginError('Invalid admission number. Not authorized to access this system.');
                // Increment failed login attempts
                incrementLoginAttempts();
            }
        })
        .catch(error => {
            showLoginError('Network error. Please try again later.');
        });
}

function loginSuccessful(studentId) {
    // Set authentication state
    isAuthenticated = true;
    authenticatedStudentId = studentId;
    
    // Create and store authentication token
    const authData = {
        id: studentId,
        timestamp: new Date().getTime()
    };
    sessionStorage.setItem('campusFundAuthToken', btoa(JSON.stringify(authData)));
    
    // Hide login modal
    $('#loginModal').modal('hide');
    
    // Show My Payments button
    $('#viewMyPayments').show();
    
    // Show success message
    showNotification(`Welcome! You're logged in as student ID: ${studentId}`, 'success');
    
    // Load data
    loadData();
}

function showLoginError(message) {
    const loginError = $('#loginError');
    loginError.html(message); // Using html() to support icons if needed
    $('#admissionNumber').addClass('is-invalid');
    
    // Check if this is a lockout message
    if (message.includes('locked') || message.includes('Too many')) {
        // Show a more prominent error for lockout
        $('#loginAttemptsWarning').html(`<div class="alert alert-danger"><i class="fas fa-lock me-2"></i>${message}</div>`).show();
    } 
    // Add helpful tips based on error type
    else if (message.includes('format')) {
        loginError.append('<br><small class="text-muted">Try entering just your 4-digit ID number</small>');
    } else if (message.includes('Not authorized')) {
        loginError.append('<br><small class="text-muted">Please check your number and try again</small>');
    }
    
    // Shake animation for error feedback
    $('#loginForm').addClass('animate__animated animate__shakeX');
    setTimeout(() => {
        $('#loginForm').removeClass('animate__animated animate__shakeX');
    }, 1000);
}

function loadData() {
    if (!isAuthenticated) {
        $('#loginModal').modal('show');
        return;
    }
    
    readCSVFirst();
}

// Student Payment History Functions
function showStudentPaymentHistory(studentId) {
    // Find the student in our data
    const student = studentsData.find(s => s.id === studentId);
    
    if (!student) {
        showNotification('Unable to retrieve student information', 'error');
        return;
    }
    
    // Update student info
    $('#studentName').text(student.name || 'Unknown Student');
    $('#studentId span').text(student.id || 'N/A');
    
    // Update payment summary
    const totalPaid = formatCurrency(student.totalPaid || 0);
    $('#studentTotalPaid').text(totalPaid);
    $('#studentLastPayment').text(student.lastPayment || 'No payments');
    
    // Determine student payment status based on actual data
    const statusElement = $('#studentStatus');
    
    // Get current month name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    
    // Check current month payment
    if (student[currentMonthName] && parseFloat(student[currentMonthName]) > 0) {
        statusElement.text('Current').addClass('text-success').removeClass('text-danger text-warning');
    } else {
        // Check if any recent months are unpaid
        const previousMonths = getPreviousMonths(3); // Check last 3 months
        let hasMissedPayment = false;
        
        previousMonths.forEach(month => {
            if (student[month] !== undefined && parseFloat(student[month]) <= 0) {
                hasMissedPayment = true;
            }
        });
        
        if (hasMissedPayment) {
            statusElement.text('Behind').addClass('text-danger').removeClass('text-success text-warning');
        } else {
            statusElement.text('Pending').addClass('text-warning').removeClass('text-success text-danger');
        }
    }
    
    // Generate payment history table based on actual data
    generatePaymentHistoryTable(student);
    
    // Show the modal
    const historyModal = new bootstrap.Modal(document.getElementById('studentHistoryModal'));
    historyModal.show();
}

// Helper function to get previous months
function getPreviousMonths(count) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const result = [];
    const currentDate = new Date();
    let currentMonthIndex = currentDate.getMonth(); // 0-indexed
    
    for (let i = 1; i <= count; i++) {
        currentMonthIndex = (currentMonthIndex - 1 + 12) % 12; // Go back one month, loop to December if needed
        result.push(months[currentMonthIndex]);
    }
    
    return result;
}

// Format currency with Indian Rupee symbol
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN');
}

// Generate payment history table based on CSV data
function generatePaymentHistoryTable(student) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-indexed (0 = January)
    const currentYear = currentDate.getFullYear();
    
    // Collect payment data for all months
    const paymentData = [];
    let hasPaymentData = false;
    
    // Go through all months to check if they exist in the student data
    months.forEach((monthName, monthIndex) => {
        // Check if this month exists in the student data
        if (monthName in student) {
            hasPaymentData = true;
            
            // Determine payment status for this month based on actual data
            let status, amount, date, statusClass;
            const paymentValue = parseFloat(student[monthName]);
            
            if (paymentValue > 0) {
                status = 'Paid';
                amount = formatCurrency(paymentValue);
                // Assume payment is in current year unless month is ahead of current month
                const paymentYear = (monthIndex > currentMonth) ? currentYear - 1 : currentYear;
                date = `${monthName} ${paymentYear}`;
                statusClass = 'success';
            } else {
                // For future months
                if (monthIndex > currentMonth) {
                    status = 'Not Due Yet';
                    amount = '-';
                    date = '-';
                    statusClass = 'secondary';
                } else {
                    status = 'Unpaid';
                    amount = formatCurrency(500); // Default amount
                    date = '-';
                    statusClass = 'danger';
                }
            }
            
            // Store payment data with month index for sorting later
            paymentData.push({
                monthIndex,
                monthName,
                amount,
                date,
                status,
                statusClass
            });
        }
    });
    
    // If we didn't find any month data in the student record
    if (!hasPaymentData) {
        // Get all headers/keys from the student object that might be payment months
        const allKeys = Object.keys(student);
        
        // Look for payment data in any format
        allKeys.forEach(key => {
            // Skip known non-payment fields
            if (['id', 'name', 'rollno', 'email', 'phone', 'totalPaid', 'lastPayment', 'status', 'currentMonth', 'previousMonth'].includes(key.toLowerCase())) {
                return;
            }
            
            const paymentValue = parseFloat(student[key]) || 0;
            let status, amount, statusClass;
            
            if (paymentValue > 0) {
                status = 'Paid';
                amount = formatCurrency(paymentValue);
                statusClass = 'success';
            } else {
                status = 'Unpaid';
                amount = '-';
                statusClass = 'danger';
            }
            
            // Add this payment data
            paymentData.push({
                monthIndex: 999, // Unknown index, will be sorted to the end
                monthName: key,
                amount,
                date: paymentValue > 0 ? key : '-',
                status,
                statusClass
            });
        });
    }
    
    // Sort payments by month index to get chronological order
    // Start with the current month and go backwards
    paymentData.sort((a, b) => {
        if (a.monthIndex === b.monthIndex) {
            return 0;
        }
        
        // Special handling for unknown indexes
        if (a.monthIndex === 999) return 1;
        if (b.monthIndex === 999) return -1;
        
        // Sort in reverse chronological order (newest first)
        const aRelativeIndex = (currentMonth - a.monthIndex + 12) % 12;
        const bRelativeIndex = (currentMonth - b.monthIndex + 12) % 12;
        return aRelativeIndex - bRelativeIndex;
    });
    
    // Build the table content
    let tableContent = '';
    
    paymentData.forEach(payment => {
        tableContent += `
        <tr>
            <td>${payment.monthName}</td>
            <td>${payment.amount}</td>
            <td>${payment.date}</td>
            <td><span class="badge bg-${payment.statusClass}">${payment.status}</span></td>
        </tr>
        `;
    });
    
    // If still no rows, show a message
    if (paymentData.length === 0) {
        tableContent = `
        <tr>
            <td colspan="4" class="text-center">No payment data available</td>
        </tr>
        `;
    }
    
    // Update the table
    $('#studentPaymentHistory').html(tableContent);
}

// CSV Data Reading and Processing
function readCSVFirst() {
    showLoadingModal();
    // Start loading data
    
    fetch(CSV_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            // Parse CSV data
            const lines = csvText.trim().split('\n');
            
            // Parse and process the data
            studentsData = parseCSVData(csvText);
            // Rearrange table based on CSV structure
            rearrangeTableStructure();
            
            // Process and display data
            processData();
            updateStatistics();
            applyCurrentFilters();
            
            hideLoadingModal();
            showNotification('CSV data loaded and table rearranged successfully!', 'success');
        })
        .catch(error => {
            hideLoadingModal();
            showNotification('Error reading CSV file. Loading sample data instead.', 'error');
            loadSampleData();
        });
}

function rearrangeTableStructure() {
    // Analyze CSV structure and rearrange table columns
    if (studentsData.length === 0) return;
    
    const firstStudent = studentsData[0];
    const availableFields = Object.keys(firstStudent);
    
    // Get current month name
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    
    // Get previous month name
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthName = previousDate.toLocaleString('default', { month: 'long' });
    
    // Set up month names for table headers
    
    // Dynamically update table headers based on available data
    const tableHeader = $('#studentsTable thead tr');
    tableHeader.empty();
    
    // Standard columns that should always appear
    const standardColumns = [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'name', label: 'Student Name', sortable: true },
        // Use the month name if it exists as a column, otherwise use generic currentMonth
        { 
            key: availableFields.includes(currentMonthName) ? currentMonthName : 'currentMonth', 
            label: `${currentMonthName} (Current)`, 
            sortable: true,
            display: 'currentMonth' // Display key for later processing
        },
        { 
            key: availableFields.includes(previousMonthName) ? previousMonthName : 'previousMonth', 
            label: `${previousMonthName} (Previous)`, 
            sortable: true,
            display: 'previousMonth' // Display key for later processing
        },
        // Removed Total Paid column as requested
        { key: 'lastPayment', label: 'Last Payment', sortable: true },
        { key: 'status', label: 'Status', sortable: false }
    ];
    
    // Add columns that exist in the data or are required
    standardColumns.forEach(col => {
        // Either the column exists in data, or it's a calculated field like status
        const shouldDisplay = firstStudent.hasOwnProperty(col.key) || 
                             ['status', 'currentMonth', 'previousMonth', 'totalPaid', 'lastPayment'].includes(col.display || col.key);
        
        if (shouldDisplay) {
            const sortableClass = col.sortable ? 'sortable' : '';
            const sortIcon = col.sortable ? '<i class="fas fa-sort"></i>' : '';
            const dataColumn = col.display || col.key;
            
            tableHeader.append(`
                <th>
                    <span class="${sortableClass}" data-column="${dataColumn}">
                        ${col.label} ${sortIcon}
                    </span>
                </th>
            `);
        }
    });
    
    // Add additional month columns if present in CSV (except current and previous which are already added)
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const alreadyAddedMonths = [currentMonthName, previousMonthName];
    
    // Find additional month columns that exist in the data but aren't already shown
    // Don't add October, November, or December as requested
    months.forEach(month => {
        if (!alreadyAddedMonths.includes(month) && 
            availableFields.includes(month) && 
            !['October', 'November', 'December'].includes(month)) {
            tableHeader.append(`
                <th>
                    <span class="sortable" data-column="${month}">
                        ${month} <i class="fas fa-sort"></i>
                    </span>
                </th>
            `);
        }
    });
    
    // Re-setup sorting event listeners
    $('.sortable').off('click').on('click', handleSort);
    
    // Update the display to show current month name in the header
    $('h5.card-title:contains("Current Month")').text(currentMonthName);
    $('h5.card-title:contains("Previous Month")').text(previousMonthName);
    
    console.log('Table structure rearranged based on CSV data');
}

// Export functions for potential external use
window.campusFundTracker = {
    loadStudentData,
    readCSVFirst,
    refreshData: loadStudentData,
    exportData: () => studentsData,
    getStatistics: () => {
        const totalStudents = studentsData.length;
        const currentPaid = studentsData.filter(s => s.currentMonth > 0).length;
        const currentUnpaid = totalStudents - currentPaid;
        const previousUnpaid = studentsData.filter(s => s.previousMonth <= 0).length;
        
        return {
            totalStudents,
            currentPaid,
            currentUnpaid,
            previousUnpaid
        };
    }
};
