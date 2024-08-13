const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000;

// Enable CORS to allow requests from different origins (e.g., your React frontend)
app.use(cors());

// Function to fetch transactions from the provided API
const fetchTransactions = async () => {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    return response.data;
};

// Function to convert month name to month number
const getMonthNumber = (monthName) => {
    const monthMap = {
        'January': '01', 'February': '02', 'March': '03',
        'April': '04', 'May': '05', 'June': '06',
        'July': '07', 'August': '08', 'September': '09',
        'October': '10', 'November': '11', 'December': '12'
    };
    return monthMap[monthName];
};

// API to list transactions with pagination
app.get('/transactions', async (req, res) => {
    try {
        const { search = '', page = 1, per_page = 10 } = req.query;

        // Ensure per_page is a number
        const perPage = parseInt(per_page, 10) || 10;
        const currentPage = parseInt(page, 10) || 1;

        // Fetch transactions
        const transactions = await fetchTransactions();

        // Filter transactions based on search
        const filteredTransactions = transactions.filter(transaction => {
            return (
                transaction.title.toLowerCase().includes(search.toLowerCase()) ||
                transaction.description.toLowerCase().includes(search.toLowerCase()) ||
                transaction.price.toString().includes(search)
            );
        });

        // Calculate start and end indices for pagination
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;

        // Get transactions for the current page
        const paginatedTransactions = filteredTransactions.slice(start, end);

        res.json({
            page: currentPage,
            per_page: perPage,
            total: filteredTransactions.length,
            transactions: paginatedTransactions
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// API to get statistics for a selected month
app.get('/statistics', async (req, res) => {
    try {
        const { month = '' } = req.query;

        // Convert month name to month number
        const monthNumber = getMonthNumber(month);
        if (!monthNumber) {
            return res.status(400).json({ error: 'Invalid month name. Use full month name.' });
        }

        // Fetch transactions
        const transactions = await fetchTransactions();

        // Filter transactions based on the selected month
        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.dateOfSale);
            const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
            return transactionMonth === monthNumber;
        });

        // Calculate statistics
        const totalSaleAmount = filteredTransactions.reduce((sum, transaction) => {
            return transaction.sold ? sum + transaction.price : sum;
        }, 0);

        const totalSoldItems = filteredTransactions.filter(transaction => transaction.sold).length;
        const totalNotSoldItems = filteredTransactions.filter(transaction => !transaction.sold).length;

        res.json({
            month,
            totalSaleAmount,
            totalSoldItems,
            totalNotSoldItems
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// API to get bar chart data for a selected month
app.get('/bar-chart', async (req, res) => {
    try {
        const { month = '' } = req.query;

        // Convert month name to month number
        const monthNumber = getMonthNumber(month);
        if (!monthNumber) {
            return res.status(400).json({ error: 'Invalid month name. Use full month name.' });
        }

        // Fetch transactions
        const transactions = await fetchTransactions();

        // Filter transactions based on the selected month
        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.dateOfSale);
            const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
            return transactionMonth === monthNumber;
        });

        // Define price ranges
        const ranges = [
            { range: '0 - 100', min: 0, max: 100 },
            { range: '101 - 200', min: 101, max: 200 },
            { range: '201 - 300', min: 201, max: 300 },
            { range: '301 - 400', min: 301, max: 400 },
            { range: '401 - 500', min: 401, max: 500 },
            { range: '501 - 600', min: 501, max: 600 },
            { range: '601 - 700', min: 601, max: 700 },
            { range: '701 - 800', min: 701, max: 800 },
            { range: '801 - 900', min: 801, max: 900 },
            { range: '901 - above', min: 901, max: Infinity }
        ];

        // Calculate the number of items in each price range
        const rangeCounts = ranges.map(({ range, min, max }) => {
            const count = filteredTransactions.filter(transaction => {
                return transaction.price >= min && transaction.price <= max;
            }).length;
            return { range, count };
        });

        res.json(rangeCounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bar chart data' });
    }
});

// API to get pie chart data for a selected month
app.get('/pie-chart', async (req, res) => {
    try {
        const { month = '' } = req.query;

        // Convert month name to month number
        const monthNumber = getMonthNumber(month);
        if (!monthNumber) {
            return res.status(400).json({ error: 'Invalid month name. Use full month name.' });
        }

        // Fetch transactions
        const transactions = await fetchTransactions();

        // Filter transactions based on the selected month
        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.dateOfSale);
            const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
            return transactionMonth === monthNumber;
        });

        // Calculate the number of items in each category
        const categoryCounts = filteredTransactions.reduce((acc, transaction) => {
            const category = transaction.category;
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category]++;
            return acc;
        }, {});

        // Convert categoryCounts object to array of { category, count }
        const pieChartData = Object.keys(categoryCounts).map(category => ({
            category,
            count: categoryCounts[category]
        }));

        res.json(pieChartData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pie chart data' });
    }
});

// Combined API to get data from all other APIs
app.get('/combined-data', async (req, res) => {
    try {
        const { month = '', search = '', page = 1, per_page = 10 } = req.query;

        // Convert month name to month number
        const monthNumber = getMonthNumber(month);
        if (!monthNumber) {
            return res.status(400).json({ error: 'Invalid month name. Use full month name.' });
        }

        // Fetch transactions
        const transactions = await fetchTransactions();

        // Filter transactions based on the selected month
        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.dateOfSale);
            const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
            return transactionMonth === monthNumber;
        });

        // Statistics Data
        const totalSaleAmount = filteredTransactions.reduce((sum, transaction) => {
            return transaction.sold ? sum + transaction.price : sum;
        }, 0);
        const totalSoldItems = filteredTransactions.filter(transaction => transaction.sold).length;
        const totalNotSoldItems = filteredTransactions.filter(transaction => !transaction.sold).length;

        // Bar Chart Data
        const ranges = [
            { range: '0 - 100', min: 0, max: 100 },
            { range: '101 - 200', min: 101, max: 200 },
            { range: '201 - 300', min: 201, max: 300 },
            { range: '301 - 400', min: 301, max: 400 },
            { range: '401 - 500', min: 401, max: 500 },
            { range: '501 - 600', min: 501, max: 600 },
            { range: '601 - 700', min: 601, max: 700 },
            { range: '701 - 800', min: 701, max: 800 },
            { range: '801 - 900', min: 801, max: 900 },
            { range: '901 - above', min: 901, max: Infinity }
        ];
        const rangeCounts = ranges.map(({ range, min, max }) => {
            const count = filteredTransactions.filter(transaction => {
                return transaction.price >= min && transaction.price <= max;
            }).length;
            return { range, count };
        });

        // Pie Chart Data
        const categoryCounts = filteredTransactions.reduce((acc, transaction) => {
            const category = transaction.category;
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category]++;
            return acc;
        }, {});
        const pieChartData = Object.keys(categoryCounts).map(category => ({
            category,
            count: categoryCounts[category]
        }));

        res.json({
            transactions: filteredTransactions.slice((page - 1) * per_page, page * per_page),
            statistics: {
                totalSaleAmount,
                totalSoldItems,
                totalNotSoldItems
            },
            barChartData: rangeCounts,
            pieChartData
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch combined data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
