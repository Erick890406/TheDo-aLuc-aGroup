// js/admin/data-processor.js

function calculateDayTotals(dayData) {
    if (!dayData || !dayData.products) return { sales: 0, profit: 0, expenses: 0, netProfit: 0 };
    
    let sales = 0, profit = 0, expenses = 0;

    (dayData.products || []).forEach(p => {
        if(p.isActive !== false) {
            sales += p.importe || 0;
            profit += p.ganancias || 0;
        }
    });

    (dayData.gastos || []).forEach(g => {
        if(g.isActive !== false && g.type !== 'recogida') {
            expenses += g.amount || 0;
        }
    });
    
    return { sales, profit, expenses, netProfit: profit - expenses };
}

function filterDataByDateRange(allData, startDateStr, endDateStr) {
    const start = new Date(startDateStr + 'T00:00:00Z');
    const end = new Date(endDateStr + 'T23:59:59Z');
    return allData.filter(day => {
        const dayDate = new Date(day.date + 'T12:00:00Z');
        return dayDate >= start && dayDate <= end;
    });
}

export function processDataForDashboard(allData, period) {
    const today = new Date();
    let startDate, endDate, prevStartDate, prevEndDate;
    
    const formatDate = d => d.toISOString().split('T')[0];

    switch (period) {
        case '7':
        case '30':
            const days = parseInt(period);
            endDate = today;
            startDate = new Date(today);
            startDate.setDate(today.getDate() - (days - 1));
            prevEndDate = new Date(startDate);
            prevEndDate.setDate(prevEndDate.getDate() - 1);
            prevStartDate = new Date(prevEndDate);
            prevStartDate.setDate(prevEndDate.getDate() - (days - 1));
            break;
        case 'this_month':
            endDate = today;
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfPrevMonth = new Date(startDate);
            lastDayOfPrevMonth.setDate(lastDayOfPrevMonth.getDate() - 1);
            prevEndDate = lastDayOfPrevMonth;
            prevStartDate = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1);
            break;
        case 'last_month':
            const firstDayOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(firstDayOfThisMonth);
            endDate.setDate(endDate.getDate() - 1);
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            const firstDayOfPrevPrevMonth = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
            prevEndDate = new Date(firstDayOfPrevPrevMonth);
            prevEndDate.setMonth(prevEndDate.getMonth() + 1);
            prevEndDate.setDate(prevEndDate.getDate() - 1);
            prevStartDate = firstDayOfPrevPrevMonth;
            break;
    }

    const currentPeriodData = filterDataByDateRange(allData, formatDate(startDate), formatDate(endDate));
    const previousPeriodData = filterDataByDateRange(allData, formatDate(prevStartDate), formatDate(prevEndDate));

    const aggregateTotals = (data) => data.reduce((acc, day) => {
        const totals = calculateDayTotals(day.data);
        acc.totalSales += totals.sales;
        acc.totalProfit += totals.profit;
        acc.totalNetProfit += totals.netProfit;
        return acc;
    }, { totalSales: 0, totalProfit: 0, totalNetProfit: 0 });

    const currentTotals = aggregateTotals(currentPeriodData);
    const previousTotals = aggregateTotals(previousPeriodData);

    const chartData = {};
    currentPeriodData.forEach(day => {
        const totals = calculateDayTotals(day.data);
        chartData[day.date] = { sales: totals.sales, profit: totals.netProfit };
    });

    return {
        currentTotals,
        previousTotals,
        chartData,
        period: `${formatDate(startDate)} al ${formatDate(endDate)}`
    };
}

export function processDataForReport(allData, startDate, endDate) {
    const periodData = filterDataByDateRange(allData, startDate, endDate);
    if (periodData.length === 0) return null;

    let totalSales = 0, totalProfit = 0, totalExpenses = 0;
    const salesByCategory = {};

    periodData.forEach(day => {
        const dayTotals = calculateDayTotals(day.data);
        totalSales += dayTotals.sales;
        totalProfit += dayTotals.profit;
        totalExpenses += dayTotals.expenses;

        (day.data.products || []).forEach(p => {
            if (p.isActive !== false && (p.importe || 0) > 0) {
                const category = p.category || 'General';
                salesByCategory[category] = (salesByCategory[category] || 0) + p.importe;
            }
        });
    });

    return {
        totalSales,
        totalProfit,
        totalExpenses,
        totalNetProfit: totalProfit - totalExpenses,
        salesByCategory: Object.entries(salesByCategory).sort((a, b) => b[1] - a[1]),
        period: `${startDate} al ${endDate}`,
        daysCount: periodData.length
    };
}

export function processDataForProducts(allData, startDate, endDate) {
    const periodData = filterDataByDateRange(allData, startDate, endDate);
    const productMap = new Map();

    periodData.forEach(day => {
        (day.data.products || []).forEach(p => {
            if (p.isActive !== false && (p.vendido || 0) > 0) {
                const existing = productMap.get(p.name) || {
                    name: p.name,
                    category: p.category || 'General',
                    unitsSold: 0,
                    totalSales: 0,
                    totalProfit: 0,
                };
                existing.unitsSold += p.vendido || 0;
                existing.totalSales += p.importe || 0;
                existing.totalProfit += p.ganancias || 0;
                productMap.set(p.name, existing);
            }
        });
    });

    return Array.from(productMap.values()).sort((a, b) => b.totalSales - a.totalSales);
}