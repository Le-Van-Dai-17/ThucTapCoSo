// ======================================================
// reports.js
// Reports page - dùng dữ liệu thật từ backend/database
// Yêu cầu reports.html phải import api.js trước reports.js
// ======================================================

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

let salesTrendChartInstance = null;
let topProductsChartInstance = null;
let categoryChartInstance = null;

function formatCurrency(value) {
    const numberValue = Number(value || 0);

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(numberValue);
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('vi-VN');
}

async function downloadReport(type) {
    try {
        const blob = type === 'excel'
            ? await API.reports.exportExcel()
            : await API.reports.exportPdf();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'excel'
            ? 'forecastai_report.xlsx'
            : 'forecastai_report.pdf';

        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download report error:', error);
        showToast('Không thể tải báo cáo. Vui lòng kiểm tra backend.', 'info');
    }
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function showError(message) {
    const container = document.getElementById('reportsError');

    if (container) {
        container.textContent = message;
        container.classList.remove('hidden');
        return;
    }

    showToast(message, 'info');
}

function hideError() {
    const container = document.getElementById('reportsError');

    if (container) {
        container.classList.add('hidden');
        container.textContent = '';
    }
}

function normalizeSalesTrendData(data) {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
        date: item.date || item.sale_date || item.transaction_date || '',
        sales: Number(item.sales || item.total_revenue || item.revenue || 0),
        forecast: Number(item.forecast || item.predicted_revenue || item.sales || item.total_revenue || 0)
    }));
}

function normalizeTopProductsData(data) {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
        name: item.name || item.product_name || 'Unknown Product',
        sales: Number(item.total_revenue || item.sales || 0),
        units: Number(item.total_sold || item.units || 0)
    }));
}

function normalizeCategoryData(data) {
    if (!Array.isArray(data)) return [];

    const totalRevenue = data.reduce((sum, item) => {
        return sum + Number(item.total_revenue || item.value || 0);
    }, 0);

    return data.map(item => {
        const value = Number(item.total_revenue || item.value || 0);
        const percentage = totalRevenue > 0
            ? Math.round((value / totalRevenue) * 100)
            : 0;

        return {
            name: item.category || item.name || 'General',
            value,
            percentage
        };
    });
}

function renderSalesTrendChart(data) {
    const canvas = document.getElementById('salesTrendChart');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (salesTrendChartInstance) {
        salesTrendChartInstance.destroy();
    }

    const safeData = normalizeSalesTrendData(data);

    salesTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: safeData.map(d => d.date),
            datasets: [
                {
                    label: 'Actual Demand',
                    data: safeData.map(d => d.sales),
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
                    label: 'Forecast Baseline',
                    data: safeData.map(d => d.forecast),
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
                legend: {
                    display: true
                },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        borderDash: [3, 3],
                        color: '#E5E7EB'
                    },
                    ticks: {
                        color: '#6B7280',
                        callback: function (value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6B7280'
                    }
                }
            }
        }
    });
}

function renderTopProductsChart(data) {
    const canvas = document.getElementById('topProductsChart');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (topProductsChartInstance) {
        topProductsChartInstance.destroy();
    }

    const safeData = normalizeTopProductsData(data);

    topProductsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: safeData.map(d => d.name),
            datasets: [
                {
                    label: 'Revenue',
                    data: safeData.map(d => d.sales),
                    backgroundColor: '#2563EB',
                    borderRadius: {
                        topRight: 8,
                        bottomRight: 8,
                        topLeft: 0,
                        bottomLeft: 0
                    },
                    barThickness: 24
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const item = safeData[context.dataIndex];

                            return [
                                `Revenue: ${formatCurrency(context.raw)}`,
                                `Units sold: ${formatNumber(item.units)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        borderDash: [3, 3],
                        color: '#E5E7EB'
                    },
                    ticks: {
                        color: '#6B7280',
                        callback: function (value) {
                            return formatCurrency(value);
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6B7280'
                    }
                }
            }
        }
    });
}

function renderCategoryChart(data) {
    const canvas = document.getElementById('categoryChart');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const safeData = normalizeCategoryData(data);

    const colors = [
        '#2563EB',
        '#10B981',
        '#F59E0B',
        '#8B5CF6',
        '#EF4444',
        '#06B6D4'
    ];

    categoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: safeData.map(d => `${d.name} ${d.percentage}%`),
            datasets: [
                {
                    data: safeData.map(d => d.value),
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }
            ]
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
                        font: {
                            size: 14
                        }
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
                        label: function (context) {
                            return `Revenue: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderEmptyCharts() {
    renderSalesTrendChart([]);
    renderTopProductsChart([]);
    renderCategoryChart([]);
}

async function loadReports() {
    try {
        hideError();

        const daysSelect = document.getElementById('dateRangeSelect');
        const days = daysSelect ? Number(daysSelect.value || 30) : 30;

        const [
            salesSummary,
            topProducts,
            categorySales,
            inventoryStatus,
            salesTrend
        ] = await Promise.all([
            API.reports.getSalesSummary(),
            API.reports.getTopProducts(),
            API.reports.getCategorySales(),
            API.reports.getInventoryStatus(),
            API.reports.getSalesTrend(days)
        ]);

        const totalRevenue = Number(salesSummary?.total_revenue || 0);
        const totalOrders = Number(salesSummary?.total_orders || 0);
        const totalItemsSold = Number(salesSummary?.total_items_sold || 0);

        const inventoryValue = Number(inventoryStatus?.inventory_value || 0);
        const totalProducts = Number(inventoryStatus?.total_products || 0);
        const lowStockItems = Number(inventoryStatus?.low_stock_items || 0);
        const outOfStockItems = Number(inventoryStatus?.out_of_stock_items || 0);

        // Các ID này có thể khác tùy reports.html.
        // Hàm setTextIfExists giúp không bị lỗi nếu thiếu id.
        setTextIfExists('kpi-revenue', formatCurrency(totalRevenue));
        setTextIfExists('kpi-orders', formatNumber(totalOrders));
        setTextIfExists('kpi-items-sold', formatNumber(totalItemsSold));
        setTextIfExists('kpi-inventory-value', formatCurrency(inventoryValue));
        setTextIfExists('kpi-total-products', formatNumber(totalProducts));
        setTextIfExists('kpi-low-stock', formatNumber(lowStockItems));
        setTextIfExists('kpi-out-of-stock', formatNumber(outOfStockItems));

        renderSalesTrendChart(salesTrend);
        renderTopProductsChart(topProducts);
        renderCategoryChart(categorySales);
    } catch (error) {
        console.error('Load reports error:', error);
        showError('Không thể tải dữ liệu Reports. Hãy kiểm tra backend, token đăng nhập hoặc API reports.');
        renderEmptyCharts();
    }
}

function bindEvents() {
    const dateRangeSelect = document.getElementById('dateRangeSelect');

    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', loadReports);
    }

    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function () {
            downloadReport('excel');
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', function () {
            downloadReport('pdf');
        });
    }

    // Fallback nếu button trong HTML đang dùng class thay vì id
    document.querySelectorAll('[data-export="excel"]').forEach(button => {
        button.addEventListener('click', function () {
            downloadReport('excel');
        });
    });

    document.querySelectorAll('[data-export="pdf"]').forEach(button => {
        button.addEventListener('click', function () {
            downloadReport('pdf');
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    loadReports();
});