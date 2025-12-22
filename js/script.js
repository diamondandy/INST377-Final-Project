// Supabase Configuration
const SUPABASE_URL = 'https://lysdqkyawfbopppbydjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c2Rxa3lhd2Zib3BwcGJ5ZGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNjgxODYsImV4cCI6MjA4MTk0NDE4Nn0.W-ess60kzlLwr_m-0ZWBvxQezgjBGF8wdHJTSZXJMCk';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let salaryChart = null;
let allData = [];

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadData();
    await loadAgencies();
    updateStats();
    renderChart();
}

// FETCH #1: Load all salary data
async function loadData() {
    try {
        const { data, error } = await supabase
            .from('employee_salaries')
            .select('*');
        
        if (error) throw error;
        allData = data;
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Check console for details.');
    }
}

// FETCH #2: Load agencies for dropdown
async function loadAgencies() {
    try {
        const { data, error } = await supabase
            .from('employee_salaries')
            .select('agency');
        
        if (error) throw error;
        
        // Get unique agencies
        const agencies = [...new Set(data.map(row => row.agency))].sort();
        
        const select = document.getElementById('agency-filter');
        agencies.forEach(agency => {
            const option = document.createElement('option');
            option.value = agency;
            option.textContent = agency;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading agencies:', error);
    }
}

// Update statistics display
function updateStats() {
    const count = allData.length;
    const agencies = new Set(allData.map(d => d.agency)).size;
    const avgSalary = allData.reduce((sum, d) => sum + d.salary, 0) / count;
    
    document.getElementById('total-employees').textContent = count.toLocaleString();
    document.getElementById('total-agencies').textContent = agencies;
    document.getElementById('avg-salary').textContent = formatCurrency(avgSalary);
}

// Render the chart
function renderChart(data = allData) {
    // Group by agency and calculate averages
    const grouped = {};
    data.forEach(row => {
        if (!grouped[row.agency]) {
            grouped[row.agency] = { total: 0, count: 0 };
        }
        grouped[row.agency].total += row.salary;
        grouped[row.agency].count++;
    });
    
    const chartData = Object.keys(grouped).map(agency => ({
        agency: agency,
        avg: grouped[agency].total / grouped[agency].count
    })).sort((a, b) => b.avg - a.avg).slice(0, 10); // Top 10
    
    const ctx = document.getElementById('salaryChart');
    
    if (salaryChart) {
        salaryChart.destroy();
    }
    
    salaryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(d => d.agency),
            datasets: [{
                label: 'Average Salary',
                data: chartData.map(d => d.avg),
                backgroundColor: '#06b6d4',
                borderColor: '#0891b2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => 'Avg: ' + formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// FETCH #3: Apply filters
async function applyFilters() {
    const agency = document.getElementById('agency-filter').value;
    const jobTitle = document.getElementById('job-filter').value.toLowerCase();
    const minSalary = parseFloat(document.getElementById('min-salary').value);
    const maxSalary = parseFloat(document.getElementById('max-salary').value);
    
    try {
        let query = supabaseClient.from('employee_salaries').select('*');
        
        if (agency) {
            query = query.eq('agency', agency);
        }
        
        if (minSalary) {
            query = query.gte('salary', minSalary);
        }
        
        if (maxSalary) {
            query = query.lte('salary', maxSalary);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Filter by job title on client side (for partial match)
        let filtered = data;
        if (jobTitle) {
            filtered = data.filter(row => 
                row.job_title.toLowerCase().includes(jobTitle)
            );
        }
        
        renderChart(filtered);
    } catch (error) {
        console.error('Error applying filters:', error);
        alert('Error applying filters. Check console.');
    }
}

// Reset filters
function resetFilters() {
    document.getElementById('agency-filter').value = '';
    document.getElementById('job-filter').value = '';
    document.getElementById('min-salary').value = '0';
    document.getElementById('max-salary').value = '200000';
    renderChart(allData);
}

// Quick filter: Police vs Fire
function filterPoliceVsFire() {
    const filtered = allData.filter(row => 
        row.agency.toLowerCase().includes('police') || 
        row.agency.toLowerCase().includes('fire')
    );
    renderChart(filtered);
}

// Quick filter: Entry level
function filterEntryLevel() {
    document.getElementById('max-salary').value = '50000';
    applyFilters();
}

// Navigate to comparison
function goToComparison() {
    window.location.href = 'comparison.html';
}

// Utility: Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}