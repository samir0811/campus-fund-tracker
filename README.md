# 🎓 Campus Fund Money Collection Tracker

A modern, responsive web application for tracking student fund collections with a beautiful dark-themed interface, real-time statistics, and comprehensive payment management.

![Campus Fund Tracker](https://img.shields.io/badge/Version-2.0-blue) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?logo=bootstrap&logoColor=white)

## ✨ Features

### 🔐 **Secure Authentication System**
- Student login using admission numbers with auto-formatting
- Login attempt limiting (3 attempts with 24-hour lockout)
- Secure session management with cookie-based lockout protection

### 📊 **Real-time Statistics Dashboard**
- Live overview of total students, collections, and payment status
- Animated statistics cards with gradient backgrounds
- Monthly payment tracking and analysis

### 👥 **Student Management**
- Complete student database with search and filtering
- Sortable columns for easy data organization
- Pagination for large datasets
- Individual student payment history tracking

### 💰 **Payment History System**
- Detailed payment history modal for each student
- Month-wise payment breakdown
- Visual payment status indicators
- Last payment date tracking

### 🎨 **Modern UI/UX**
- **Dark-themed interface** with gradient backgrounds
- Smooth CSS animations and transitions
- Fully responsive design for all devices
- Professional card-based layout
- Font Awesome icons throughout

### 📱 **Responsive Design**
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface elements
- Adaptive navigation and layouts

## 🚀 Quick Start

### Prerequisites
- Web browser (Chrome, Firefox, Safari, Edge)
- Local web server (for CSV data loading)
- Google Sheets CSV file (for student data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/campus-fund-tracker.git
   cd campus-fund-tracker
   ```

2. **Start a local server**
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js
   npx http-server
   ```

3. **Open in browser**
   Navigate to `http://localhost:8000`

### CSV Data Setup

1. **Create a Google Sheet** with the following columns:
   ```
   Name | Admission Number | January | February | March | April | May | June | 
   July | August | September | October | November | December
   ```

2. **Publish as CSV**
   - File → Share → Publish to web
   - Choose "Comma-separated values (.csv)"
   - Copy the published URL

3. **Update the CSV URL**
   - Open `script.js`
   - Find `CSV_URL` variable
   - Replace with your Google Sheets CSV URL

## 📁 Project Structure

```
campus-fund-tracker/
├── index.html          # Main application file
├── script.js          # Core JavaScript functionality
├── requirements.txt   # Python dependencies (if needed)
├── README.md         # This file
└── assets/           # (Optional) Additional assets
```

## 🔧 Configuration

### Student Data Format
Ensure your CSV file follows this structure:
```csv
Name,Admission Number,January,February,March,April,May,June,July,August,September,October,November,December
John Doe,2023001,500,500,0,500,500,0,500,500,500,0,500,500
Jane Smith,2023002,500,500,500,500,0,500,500,0,500,500,500,500
```

### Customization Options

#### Update Collection Amount
```javascript
// In script.js, modify the expected payment amount
const MONTHLY_PAYMENT = 500; // Change this value
```

#### Modify Authentication Rules
```javascript
// In script.js, adjust login attempt limits
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

## 🖥️ Screenshots

### Dashboard Overview
![Dashboard](https://via.placeholder.com/800x400/1e1e1e/e9ecef?text=Dashboard+Overview)

### Student Management
![Student List](https://via.placeholder.com/800x400/1e1e1e/e9ecef?text=Student+Management)

### Payment History
![Payment History](https://via.placeholder.com/800x400/1e1e1e/e9ecef?text=Payment+History+Modal)

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Framework**: Bootstrap 5.3.0
- **Icons**: Font Awesome 6.0.0
- **Data Handling**: jQuery 3.6.0
- **Animations**: CSS3 Transitions & Keyframes
- **Data Source**: Google Sheets CSV

## 📊 Features in Detail

### Authentication System
- **Auto-formatting**: Admission numbers are automatically formatted as you type
- **Security**: Failed login attempts are tracked and users are locked out after 3 failed attempts
- **Session Management**: Secure login state management with proper logout functionality

### Statistics Dashboard
- **Real-time Updates**: Statistics update automatically when data changes
- **Visual Indicators**: Color-coded cards for different metrics
- **Animated Counters**: Smooth number animations for better UX

### Payment Tracking
- **Monthly Breakdown**: Track payments for each month individually
- **Status Indicators**: Visual indicators for paid/unpaid status
- **History Modal**: Detailed payment history in an easy-to-read modal

## 🔒 Security Features

- Login attempt limiting with lockout mechanism
- Secure session management
- XSS protection through proper data sanitization
- CSRF protection for form submissions

## 📱 Mobile Responsiveness

- Responsive table design with horizontal scrolling
- Touch-optimized buttons and interactions
- Adaptive navigation for small screens
- Mobile-first CSS approach

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Bootstrap team for the excellent CSS framework
- Font Awesome for the comprehensive icon library
- Google Sheets for providing easy CSV data integration
- jQuery team for DOM manipulation utilities

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/campus-fund-tracker/issues) page
2. Create a new issue with detailed information
3. Contact the maintainer at your.email@example.com

## 🔄 Version History

- **v2.0** - Dark theme redesign, enhanced security, payment history modal
- **v1.5** - Added authentication system and login attempt limiting
- **v1.2** - Implemented auto-formatting and improved UI
- **v1.0** - Initial release with basic functionality

---

⭐ **Star this repository if you find it helpful!**
