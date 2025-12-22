# INST377-Final-Project

Hello! This is our Final Project for INST377 Section 0104 by Diamond Andy and Samgwaa Lesiga!
Our goal for our project is to present a website that allows users to compare salaries across agencies, providing insights into pay disparities and highlighting the distribution of earnings for different roles.
The API we will be using is the Philadelphia City Employee Earnings API: https://catalog.data.gov/dataset/city-employee-earnings/resource/e7f2178e-9714-4e8e-b099-dc7f523041d1 


DEVELOPERS MANUAL: 

# Little Description
The Philadelphia Salary Explorer is a web application that allows users to explore and compare salary data across different Philadelphia city agencies. The application provides interactive visualizations, statistical analysis, and comparison tools to help employees, policymakers, and citizens understand compensation patterns in city government.

# Live Demo:  (https://samgwaa-lesiga-inst377-final-projec.vercel.app/) 

# Target Browsers
- **Desktop Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+, Firefox Mobile 88+
- **Recommended**: Modern desktop browsers with JavaScript enabled for optimal experience

# Features
- Interactive salary data visualization with Chart.js
- Filter salaries by agency, job title, and salary range
- Detailed comparison between two agencies/job titles
- Statistical analysis with box plots (D3.js) and histograms
- Export comparison data to CSV
- Responsive design for all screen sizes

# Installation

## Prerequisites
- Node.js 24.x (Vercel)
- npm or yarn package manager
- Supabase account (free tier)
- Vercel account (deployment)

# Step 1: Clone the Repository

# Step 2: Install Dependencies
```bash
npm install
```
# Step 3: Set Up Environment Variables (Keys)

const SUPABASE_URL = 'https://lysdqkyawfbopppbydjd.supabase.co';


const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c2Rxa3lhd2Zib3BwcGJ5ZGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNjgxODYsImV4cCI6MjA4MTk0NDE4Nn0.W-ess60kzlLwr_m-0ZWBvxQezgjBGF8wdHJTSZXJMCk';
const supabaseClient = window.supabase.createClient;

# Step 4: Database Setup

# To Run Application: 
- Use Node.js then open:  http://localhost:8000/index.html
