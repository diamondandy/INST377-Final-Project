// Supabase Configuration
const SUPABASE_URL = 'https://lysdqkyawfbopppbydjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c2Rxa3lhd2Zib3BwcGJ5ZGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNjgxODYsImV4cCI6MjA4MTk0NDE4Nn0.W-ess60kzlLwr_m-0ZWBvxQezgjBGF8wdHJTSZXJMCk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let histogramChart = null;
let comparisonData = { selectionA: null, selectionB: null };

// Initialize
window.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadAgencies();
    setupEventListeners();
}

// FETCH #1: Load agencies
async function loadAgencies() {
    try {
        const { data, error } = await supabase
            .from('employee_salaries')
            .select('agency');
        
        if (error) throw error;
        
        const agencies = [...new Set(data.map(row => row.agency))].sort();
        
        ['agency-a', 'agency-b'].forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">Select agency...</option>';
            agencies.forEach(agency => {
                const option = document.createElement('option');
                option.value = agency;
                option.textContent = agency;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading agencies:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('agency-a').addEventListener('change', (e) => {
        if (e.target.value) loadJobTitles(e.target.value, 'job-a');
    });
    
    document.getElementById('agency-b').addEventListener('change', (e) => {
        if (e.target.value) loadJobTitles(e.target.value, 'job-b');
    });
}

// FETCH #2: Load job titles for agency
async function loadJobTitles(agency, selectId) {
    try {
        const { data, error } = await supabase
            .from('employee_salaries')
            .select('job_title')
            .eq('agency', agency);
        
        if (error) throw error;
        
        const jobTitles = [...new Set(data.map(row => row.job_title))].sort();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select job title...</option>';
        jobTitles.forEach(title => {
            const option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch (error) {
        console.error('Error loading job titles:', error);
    }
}

// FETCH #3: Perform comparison
async function compare() {
    const agencyA = document.getElementById('agency-a').value;
    const jobA = document.getElementById('job-a').value;
    const agencyB = document.getElementById('agency-b').value;
    const jobB = document.getElementById('job-b').value;
    
    if (!agencyA || !jobA || !agencyB || !jobB) {
        alert('Please select both agency and job title for both selections');
        return;
    }
    
    try {
        // Fetch data for selection A
        const { data: dataA, error: errorA } = await supabase
            .from('employee_salaries')
            .select('salary')
            .eq('agency', agencyA)
            .ilike('job_title', `%${jobA}%`);
        
        if (errorA) throw errorA;
        
        // Fetch data for selection B
        const { data: dataB, error: errorB } = await supabase
            .from('employee_salaries')
            .select('salary')
            .eq('agency', agencyB)
            .ilike('job_title', `%${jobB}%`);
        
        if (errorB) throw errorB;
        
        // Calculate statistics
        const salariesA = dataA.map(d => d.salary);
        const salariesB = dataB.map(d => d.salary);
        
        comparisonData.selectionA = {
            label: `${agencyA} - ${jobA}`,
            salaries: salariesA,
            stats: calculateStats(salariesA)
        };
        
        comparisonData.selectionB = {
            label: `${agencyB} - ${jobB}`,
            salaries: salariesB,
            stats: calculateStats(salariesB)
        };
        
        displayResults();
    } catch (error) {
        console.error('Error comparing:', error);
        alert('Error performing comparison. Check console.');
    }
}

// Calculate statistics
function calculateStats(salaries) {
    if (!salaries.length) return { min: 0, max: 0, avg: 0, median: 0, q1: 0, q3: 0, count: 0 };
    
    const sorted = [...salaries].sort((a, b) => a - b);
    const sum = salaries.reduce((a, b) => a + b, 0);
    
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / salaries.length,
        median: sorted[Math.floor(sorted.length / 2)],
        q1: sorted[Math.floor(sorted.length * 0.25)],
        q3: sorted[Math.floor(sorted.length * 0.75)],
        count: salaries.length
    };
}

// Display results
function displayResults() {
    const { selectionA, selectionB } = comparisonData;
    
    // Update headers
    document.getElementById('header-a').textContent = selectionA.label;
    document.getElementById('header-b').textContent = selectionB.label;
    
    // Update stats table
    document.getElementById('min-a').textContent = formatCurrency(selectionA.stats.min);
    document.getElementById('max-a').textContent = formatCurrency(selectionA.stats.max);
    document.getElementById('avg-a').textContent = formatCurrency(selectionA.stats.avg);
    document.getElementById('median-a').textContent = formatCurrency(selectionA.stats.median);
    document.getElementById('count-a').textContent = selectionA.stats.count;
    
    document.getElementById('min-b').textContent = formatCurrency(selectionB.stats.min);
    document.getElementById('max-b').textContent = formatCurrency(selectionB.stats.max);
    document.getElementById('avg-b').textContent = formatCurrency(selectionB.stats.avg);
    document.getElementById('median-b').textContent = formatCurrency(selectionB.stats.median);
    document.getElementById('count-b').textContent = selectionB.stats.count;
    
    // Update insights
    const payGap = Math.abs(selectionA.stats.avg - selectionB.stats.avg);
    const payGapPercent = (payGap / Math.min(selectionA.stats.avg, selectionB.stats.avg) * 100).toFixed(1);
    
    document.getElementById('pay-gap').textContent = `${formatCurrency(payGap)} (${payGapPercent}%)`;
    
    const higher = selectionA.stats.avg > selectionB.stats.avg ? selectionA.label : selectionB.label;
    document.getElementById('higher-avg').textContent = higher;
    
    const disparity = payGapPercent > 20 ? 'High' : payGapPercent > 10 ? 'Moderate' : 'Low';
    document.getElementById('disparity').textContent = disparity;
    
    // Show results
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    
    // Render visualizations
    drawBoxPlot();
    drawHistogram();
}

// Draw box plot with D3.js
function drawBoxPlot() {
    const svg = d3.select('#boxplot');
    svg.selectAll('*').remove();
    
    const width = svg.node().getBoundingClientRect().width;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const boxData = [
        { label: 'Selection A', ...comparisonData.selectionA.stats, color: '#06b6d4' },
        { label: 'Selection B', ...comparisonData.selectionB.stats, color: '#f59e0b' }
    ];
    
    const xScale = d3.scaleBand()
        .domain(boxData.map(d => d.label))
        .range([0, chartWidth])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(boxData, d => d.max) * 1.1])
        .range([chartHeight, 0]);
    
    // Draw axes
    g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale));
    
    g.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => formatCurrency(d)));
    
    // Draw boxes
    boxData.forEach(d => {
        const x = xScale(d.label);
        const boxWidth = xScale.bandwidth();
        
        // Vertical line (min to max)
        g.append('line')
            .attr('x1', x + boxWidth / 2)
            .attr('x2', x + boxWidth / 2)
            .attr('y1', yScale(d.min))
            .attr('y2', yScale(d.max))
            .attr('stroke', d.color)
            .attr('stroke-width', 2);
        
        // Box (Q1 to Q3)
        g.append('rect')
            .attr('x', x)
            .attr('y', yScale(d.q3))
            .attr('width', boxWidth)
            .attr('height', yScale(d.q1) - yScale(d.q3))
            .attr('fill', d.color)
            .attr('opacity', 0.6)
            .attr('stroke', d.color)
            .attr('stroke-width', 2);
        
        // Median line
        g.append('line')
            .attr('x1', x)
            .attr('x2', x + boxWidth)
            .attr('y1', yScale(d.median))
            .attr('y2', yScale(d.median))
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 3);
    });
}

// Draw histogram with Chart.js
function drawHistogram() {
    const ctx = document.getElementById('histogram');
    
    if (histogramChart) {
        histogramChart.destroy();
    }
    
    // Create histogram data
    const bins = 10;
    const histA = createHistogram(comparisonData.selectionA.salaries, bins);
    const histB = createHistogram(comparisonData.selectionB.salaries, bins);
    
    histogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: histA.labels,
            datasets: [
                {
                    label: 'Selection A',
                    data: histA.frequencies,
                    backgroundColor: 'rgba(6, 182, 212, 0.6)',
                    borderColor: '#06b6d4',
                    borderWidth: 1
                },
                {
                    label: 'Selection B',
                    data: histB.frequencies,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)',
                    borderColor: '#f59e0b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Frequency' }
                },
                x: {
                    title: { display: true, text: 'Salary Range' }
                }
            }
        }
    });
}

// Create histogram
function createHistogram(salaries, binCount) {
    if (!salaries.length) return { labels: [], frequencies: [] };
    
    const min = Math.min(...salaries);
    const max = Math.max(...salaries);
    const binWidth = (max - min) / binCount;
    
    const frequencies = Array(binCount).fill(0);
    const labels = [];
    
    for (let i = 0; i < binCount; i++) {
        labels.push(formatCurrency(min + (i * binWidth)));
    }
    
    salaries.forEach(salary => {
        const binIndex = Math.min(Math.floor((salary - min) / binWidth), binCount - 1);
        frequencies[binIndex]++;
    });
    
    return { labels, frequencies };
}

// Export data to CSV
function exportData() {
    const csv = [
        ['Selection', 'Agency', 'Job Title', 'Min', 'Max', 'Avg', 'Median', 'Count'],
        [
            'A',
            comparisonData.selectionA.label.split(' - ')[0],
            comparisonData.selectionA.label.split(' - ')[1],
            comparisonData.selectionA.stats.min,
            comparisonData.selectionA.stats.max,
            comparisonData.selectionA.stats.avg,
            comparisonData.selectionA.stats.median,
            comparisonData.selectionA.stats.count
        ],
        [
            'B',
            comparisonData.selectionB.label.split(' - ')[0],
            comparisonData.selectionB.label.split(' - ')[1],
            comparisonData.selectionB.stats.min,
            comparisonData.selectionB.stats.max,
            comparisonData.selectionB.stats.avg,
            comparisonData.selectionB.stats.median,
            comparisonData.selectionB.stats.count
        ]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}