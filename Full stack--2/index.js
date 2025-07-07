import express from 'express';
import { engine } from 'express-handlebars';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile, existsSync } from 'fs';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Promisify fs functions
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

// Configure Handlebars
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: join(__dirname, 'views/layouts'),
    partialsDir: join(__dirname, 'views/partials'),
    helpers: {
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },
        json: function(context) {
            return JSON.stringify(context, null, 2);
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Data file path
const DATA_FILE = join(__dirname, 'data', 'submissions.json');

// Helper function to read data
async function readData() {
    try {
        if (!existsSync(DATA_FILE)) {
            return [];
        }
        const data = await readFileAsync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return [];
    }
}

// Helper function to write data
async function writeData(data) {
    try {
        await writeFileAsync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data:', error);
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('form', { 
        title: 'User Registration Form',
        message: req.query.message 
    });
});

app.post('/submit', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.redirect('/?message=Name and email are required');
        }
        
        // Read existing data
        const existingData = await readData();
        
        // Create new submission
        const newSubmission = {
            id: Date.now(),
            name,
            email,
            phone: phone || '',
            message: message || '',
            timestamp: new Date().toISOString()
        };
        
        // Add to data
        existingData.push(newSubmission);
        
        // Write back to file
        await writeData(existingData);
        
        // Redirect to display page
        res.redirect('/display');
        
    } catch (error) {
        console.error('Error processing form:', error);
        res.redirect('/?message=An error occurred. Please try again.');
    }
});

app.get('/display', async (req, res) => {
    try {
        const data = await readData();
        res.render('display', { 
            title: 'Submitted Data',
            submissions: data.reverse() // Show latest first
        });
    } catch (error) {
        console.error('Error displaying data:', error);
        res.render('display', { 
            title: 'Submitted Data',
            submissions: [],
            error: 'Error loading data'
        });
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const data = await readData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Error fetching data' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📊 View submissions at http://localhost:${PORT}/display`);
});
