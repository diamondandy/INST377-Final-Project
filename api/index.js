// Backend API using Express and Supabase
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/salaries
 * Retrieve salary data with optional filters
 * Query params: agency, job_title, min_salary, max_salary, year
 */
app.get('/api/salaries', async (req, res) => {
    try {
        const { agency, job_title, min_salary, max_salary, year } = req.query;
        
        let query = supabase
            .from('employee_salaries')
            .select('*');
        
        // Apply filters
        if (agency) {
            const agencies = agency.split(',').map(a => a.trim());
            query = query.in('agency', agencies);
        }
        
        if (job_title) {
            query = query.ilike('job_title', `%${job_title}%`);
        }
        
        if (min_salary) {
            query = query.gte('salary', parseFloat(min_salary));
        }
        
        if (max_salary) {
            query = query.lte('salary', parseFloat(max_salary));
        }
        
        if (year) {
            query = query.eq('year', parseInt(year));
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching salaries:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to fetch salary data'
        });
    }
});

/**
 * GET /api/statistics
 * Calculate aggregate statistics
 * Query params: agency, job_title
 */
app.get('/api/statistics', async (req, res) => {
    try {
        const { agency, job_title } = req.query;
        
        let query = supabase
            .from('employee_salaries')
            .select('salary, agency');
        
        if (agency) {
            query = query.eq('agency', agency);
        }
        
        if (job_title) {
            query = query.ilike('job_title', `%${job_title}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        // Calculate statistics
        const salaries = data.map(row => row.salary);
        const agencies = new Set(data.map(row => row.agency));
        
        if (salaries.length === 0) {
            return res.json({
                min: 0,
                max: 0,
                avg: 0,
                median: 0,
                count: 0,
                agencyCount: 0,
                lastUpdated: new Date().toISOString()
            });
        }
        
        const sortedSalaries = [...salaries].sort((a, b) => a - b);
        const sum = salaries.reduce((acc, val) => acc + val, 0);
        
        const stats = {
            min: sortedSalaries[0],
            max: sortedSalaries[sortedSalaries.length - 1],
            avg: sum / salaries.length,
            median: sortedSalaries[Math.floor(sortedSalaries.length / 2)],
            count: salaries.length,
            agencyCount: agencies.size,
            lastUpdated: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error calculating statistics:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to calculate statistics'
        });
    }
});

/**
 * GET /api/agencies
 * Get list of all agencies with employee counts
 */
app.get('/api/agencies', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('employee_salaries')
            .select('agency');
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        // Count employees per agency
        const agencyCounts = {};
        data.forEach(row => {
            agencyCounts[row.agency] = (agencyCounts[row.agency] || 0) + 1;
        });
        
        // Convert to array and sort by count descending
        const agencies = Object.keys(agencyCounts)
            .map(name => ({
                name,
                count: agencyCounts[name]
            }))
            .sort((a, b) => b.count - a.count);
        
        res.json(agencies);
    } catch (error) {
        console.error('Error fetching agencies:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to fetch agencies'
        });
    }
});

/**
 * GET /api/job-titles
 * Get job titles for a specific agency
 * Query params: agency (required)
 */
app.get('/api/job-titles', async (req, res) => {
    try {
        const { agency } = req.query;
        
        if (!agency) {
            return res.status(400).json({ 
                error: 'Agency parameter is required',
                details: 'Please provide an agency name'
            });
        }
        
        const { data, error } = await supabase
            .from('employee_salaries')
            .select('job_title')
            .eq('agency', agency);
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        // Get unique job titles and sort
        const jobTitles = [...new Set(data.map(row => row.job_title))].sort();
        
        res.json(jobTitles);
    } catch (error) {
        console.error('Error fetching job titles:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to fetch job titles'
        });
    }
});

/**
 * POST /api/comparison
 * Compare two agency/job title selections
 * Body: { selection1: {agency, job_title}, selection2: {agency, job_title} }
 */
app.post('/api/comparison', async (req, res) => {
    try {
        const { selection1, selection2 } = req.body;
        
        if (!selection1 || !selection2) {
            return res.status(400).json({ 
                error: 'Both selections are required',
                details: 'Please provide selection1 and selection2 objects'
            });
        }
        
        // Fetch data for selection 1
        let query1 = supabase
            .from('employee_salaries')
            .select('salary')
            .eq('agency', selection1.agency);
        
        if (selection1.job_title) {
            query1 = query1.ilike('job_title', `%${selection1.job_title}%`);
        }
        
        const { data: data1, error: error1 } = await query1;
        
        if (error1) {
            console.error('Supabase error for selection 1:', error1);
            throw error1;
        }
        
        // Fetch data for selection 2
        let query2 = supabase
            .from('employee_salaries')
            .select('salary')
            .eq('agency', selection2.agency);
        
        if (selection2.job_title) {
            query2 = query2.ilike('job_title', `%${selection2.job_title}%`);
        }
        
        const { data: data2, error: error2 } = await query2;
        
        if (error2) {
            console.error('Supabase error for selection 2:', error2);
            throw error2;
        }
        
        // Calculate statistics for both selections
        const stats1 = calculateStats(data1.map(row => row.salary));
        const stats2 = calculateStats(data2.map(row => row.salary));
        
        res.json({
            selection1: {
                ...stats1,
                salaries: data1.map(row => row.salary)
            },
            selection2: {
                ...stats2,
                salaries: data2.map(row => row.salary)
            }
        });
    } catch (error) {
        console.error('Error performing comparison:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to perform comparison'
        });
    }
});

/**
 * Helper function to calculate statistics
 */
function calculateStats(salaries) {
    if (!salaries || salaries.length === 0) {
        return {
            min: 0,
            max: 0,
            avg: 0,
            median: 0,
            q1: 0,
            q3: 0,
            count: 0
        };
    }
    
    const sorted = [...salaries].sort((a, b) => a - b);
    const sum = salaries.reduce((acc, val) => acc + val, 0);
    
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

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        details: `Route ${req.method} ${req.path} not found`
    });
});

// Start server (for local development)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api`);
        console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
}

// Export for Vercel
module.exports = app;