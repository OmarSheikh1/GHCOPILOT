const STORAGE_KEY = 'bucks2bar-monthly-budget';
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const DEFAULT_BUDGET_DATA = [
    { income: 5200, expenses: 3850 },
    { income: 5200, expenses: 3925 },
    { income: 5450, expenses: 4010 },
    { income: 5200, expenses: 3780 },
    { income: 5600, expenses: 4250 },
    { income: 5200, expenses: 4100 },
    { income: 5800, expenses: 4390 },
    { income: 5200, expenses: 3975 },
    { income: 5350, expenses: 4050 },
    { income: 5200, expenses: 4325 },
    { income: 6100, expenses: 4680 },
    { income: 6500, expenses: 5200 }
];
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

let budgetData = [];
let budgetChart;

function showError(message) {
    const errorElement = document.getElementById('app-error');
    errorElement.textContent = message;
    errorElement.hidden = false;
}

function isValidBudget(data) {
    return Array.isArray(data)
        && data.length === MONTHS.length
        && data.every((month) => Number.isFinite(month.income)
            && month.income >= 0
            && Number.isFinite(month.expenses)
            && month.expenses >= 0);
}

async function loadBudgetData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (isValidBudget(parsedData)) {
                return parsedData;
            }
        }
    } catch (error) {
        console.warn('Saved budget data could not be read; loading sample data.', error);
    }

    return loadSampleData();
}

function renderRows() {
    const rows = document.getElementById('monthly-rows');
    rows.innerHTML = MONTHS.map((month, index) => `
        <tr>
            <th scope="row">${month}</th>
            <td>
                <label class="visually-hidden" for="income-${index}">${month} income in US dollars</label>
                <div class="input-wrap income-input">
                    <span aria-hidden="true">$</span>
                    <input id="income-${index}" data-kind="income" data-index="${index}" type="number" min="0" step="0.01" inputmode="decimal" value="${budgetData[index].income.toFixed(2)}">
                </div>
            </td>
            <td>
                <label class="visually-hidden" for="expenses-${index}">${month} expenses in US dollars</label>
                <div class="input-wrap expense-input">
                    <span aria-hidden="true">$</span>
                    <input id="expenses-${index}" data-kind="expenses" data-index="${index}" type="number" min="0" step="0.01" inputmode="decimal" value="${budgetData[index].expenses.toFixed(2)}">
                </div>
            </td>
        </tr>
    `).join('');
}

function updateSummary() {
    const totalIncome = budgetData.reduce((total, month) => total + month.income, 0);
    const totalExpenses = budgetData.reduce((total, month) => total + month.expenses, 0);
    const netBalance = totalIncome - totalExpenses;

    document.getElementById('total-income').textContent = currencyFormatter.format(totalIncome);
    document.getElementById('total-expenses').textContent = currencyFormatter.format(totalExpenses);
    const balanceElement = document.getElementById('net-balance');
    balanceElement.textContent = currencyFormatter.format(netBalance);
    balanceElement.classList.toggle('negative-balance', netBalance < 0);
}

function updateChart() {
    if (!budgetChart) {
        return;
    }

    budgetChart.data.datasets[0].data = budgetData.map((month) => month.income);
    budgetChart.data.datasets[1].data = budgetData.map((month) => month.expenses);
    budgetChart.update();
}

function saveBudgetData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(budgetData));
        document.getElementById('save-status').textContent = 'All changes saved';
    } catch (error) {
        document.getElementById('save-status').textContent = 'Could not save changes';
        console.error('Budget data could not be saved to this browser.', error);
    }
}

function initializeChart() {
    const canvas = document.getElementById('budget-chart');
    if (typeof Chart === 'undefined') {
        throw new Error('Chart.js could not be loaded. Check your internet connection and reload.');
    }

    budgetChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: MONTHS,
            datasets: [
                {
                    label: 'Income',
                    data: budgetData.map((month) => month.income),
                    backgroundColor: '#27a879',
                    borderRadius: 5,
                    maxBarThickness: 28
                },
                {
                    label: 'Expenses',
                    data: budgetData.map((month) => month.expenses),
                    backgroundColor: '#f29a64',
                    borderRadius: 5,
                    maxBarThickness: 28
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${currencyFormatter.format(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#9aa9a2',
                        maxRotation: 0,
                        autoSkip: false
                    },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#29352f' },
                    ticks: {
                        color: '#9aa9a2',
                        callback: (value) => currencyFormatter.format(value)
                    },
                    border: { display: false }
                }
            }
        }
    });
}

function selectTab(tab) {
    const isDataTab = tab.id === 'data-tab';
    document.getElementById('data-tab').setAttribute('aria-selected', String(isDataTab));
    document.getElementById('chart-tab').setAttribute('aria-selected', String(!isDataTab));
    document.getElementById('data-tab').tabIndex = isDataTab ? 0 : -1;
    document.getElementById('chart-tab').tabIndex = isDataTab ? -1 : 0;
    document.getElementById('data-panel').hidden = !isDataTab;
    document.getElementById('chart-panel').hidden = isDataTab;
    if (!isDataTab && budgetChart) {
        budgetChart.resize();
    }
}

function attachEvents() {
    document.getElementById('monthly-rows').addEventListener('input', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        const index = Number(input.dataset.index);
        const kind = input.dataset.kind;
        const value = input.value === '' ? 0 : Number(input.value);
        if (!Number.isInteger(index) || index < 0 || index >= MONTHS.length
            || (kind !== 'income' && kind !== 'expenses')
            || !Number.isFinite(value) || value < 0) {
            return;
        }

        budgetData[index][kind] = value;
        updateSummary();
        updateChart();
        saveBudgetData();
    });

    document.querySelectorAll('[role="tab"]').forEach((tab) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                const nextTab = document.getElementById(event.key === 'ArrowRight' ? 'chart-tab' : 'data-tab');
                selectTab(nextTab);
                nextTab.focus();
            }
        });
    });

    document.getElementById('reset-button').addEventListener('click', async () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            budgetData = await loadSampleData();
            renderRows();
            updateSummary();
            updateChart();
            document.getElementById('save-status').textContent = 'Sample data restored';
        } catch (error) {
            showError(error.message);
        }
    });
}

async function loadSampleData() {
    if (window.location.protocol === 'file:') {
        return DEFAULT_BUDGET_DATA.map((month) => ({ ...month }));
    }

    const response = await fetch('sample-data.json');
    if (!response.ok) {
        throw new Error(`Could not reload the sample data (${response.status}).`);
    }
    const sampleData = await response.json();
    if (!isValidBudget(sampleData)) {
        throw new Error('The sample data must contain income and expense values for all 12 months.');
    }
    return sampleData;
}

async function initializeApp() {
    try {
        budgetData = await loadBudgetData();
        renderRows();
        updateSummary();
        attachEvents();
        try {
            initializeChart();
        } catch (error) {
            showError(`The data table is ready, but the chart could not load: ${error.message}`);
            console.error(error);
        }
    } catch (error) {
        showError(`Unable to start Bucks2Bar: ${error.message}`);
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
