lucide.createIcons();

// Data Generators
function generateSalesTrendData(days) {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        data.push({
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            sales: Math.floor(Math.random() * 50000) + 30000,
            forecast: Math.floor(Math.random() * 50000) + 32000,
        });
    }
    return data;
}

const topProductsData = [
  { name: "Laptop Pro 15", sales: 145000, units: 87 },
  { name: "Wireless Mouse", sales: 89000, units: 245 },
  { name: "USB-C Hub", sales: 67000, units: 189 },
  { name: "Monitor 27\"", sales: 54000, units: 45 },
  { name: "Keyboard Mech", sales: 42000, units: 98 },
  { name: "Webcam HD", sales: 38000, units: 76 },
];

const categoryData = [
  { name: "Electronics", value: 385000, percentage: 45 },
  { name: "Accessories", value: 256000, percentage: 30 },
  { name: "Furniture", value: 128000, percentage: 15 },
  { name: "Office Supplies", value: 85000, percentage: 10 },
];

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6"];

let salesTrendChartInstance = null;
let topProductsChartInstance = null;
let categoryChartInstance = null;

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function renderUI() {
    const daysStr = document.getElementById('dateRangeSelect').value;
    const days = parseInt(daysStr, 10);
    const trendData = generateSalesTrendData(days);

    const totalRevenue = trendData.reduce((sum, item) => sum + item.sales, 0);
    document.getElementById('kpi-revenue').textContent = "$" + (totalRevenue / 1000).toFixed(1) + "K";

    renderSalesTrendChart(trendData);
    renderTopProductsChart();
    renderCategoryChart();
}

function renderSalesTrendChart(data) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    if (salesTrendChartInstance) salesTrendChartInstance.destroy();

    salesTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {
                    label: 'Actual Sales',
                    data: data.map(d => d.sales),
                    borderColor: '#2563EB',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#2563EB',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'AI Forecast',
                    data: data.map(d => d.forecast),
                    borderColor: '#10B981',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#10B981',
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ": $" + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [3, 3], color: '#E5E7EB' },
                    ticks: { color: '#6B7280', callback: function(val) { return "$" + (val / 1000) + "K"; } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#6B7280' }
                }
            }
        }
    });
}

function renderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    if (topProductsChartInstance) return; // Keep it static

    topProductsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topProductsData.map(d => d.name),
            datasets: [{
                label: 'Revenue',
                data: topProductsData.map(d => d.sales),
                backgroundColor: '#2563EB',
                borderRadius: { topRight: 8, bottomRight: 8, topLeft: 0, bottomLeft: 0 },
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // horizontal bar chart
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return "Revenue: $" + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { borderDash: [3, 3], color: '#E5E7EB' },
                    ticks: { color: '#6B7280', callback: function(val) { return "$" + (val / 1000) + "K"; } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#6B7280' }
                }
            }
        }
    });
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) return; // Keep static

    categoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categoryData.map(d => `${d.name} ${d.percentage}%`),
            datasets: [{
                data: categoryData.map(d => d.value),
                backgroundColor: COLORS,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        color: '#6B7280',
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return "Revenue: $" + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

document.getElementById('dateRangeSelect').addEventListener('change', renderUI);

// Init
renderUI();
