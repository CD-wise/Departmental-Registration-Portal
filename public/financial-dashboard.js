// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyAbg3zC18VWvgoJMOVc33lYMAK3NcJ4rX8",
    authDomain: "compssa-register.firebaseapp.com",
    projectId: "compssa-register",
    storageBucket: "compssa-register.firebasestorage.app",
    messagingSenderId: "160471615333",
    appId: "1:160471615333:web:fcba7330289722fcce838c"
};
const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebaseApp.auth();
const db = firebaseApp.firestore();
// Constants
const STATUS = Object.freeze({
    PENDING: "Pending",
    VALIDATED: "Validated",
    DISPUTED: "Disputed",
});
// State management
let currentFilters = {
    programme: '',
    status: '',
    date: ''
};
// Function to Fetch Financial Data
async function loadFinancialData() {
    try {
        let query = db.collection("registrations").orderBy("timestamp", "desc");

        // Apply filters
        if (currentFilters.programme) {
            query = query.where("programme", "==", currentFilters.programme);
        }
        if (currentFilters.status) {
            query = query.where("financialValidation.status", "==", currentFilters.status);
        }
        if (currentFilters.date) {
            const startDate = new Date(currentFilters.date);
            const endDate = new Date(currentFilters.date);
            endDate.setDate(endDate.getDate() + 1);
            query = query.where("timestamp", ">=", startDate)
                .where("timestamp", "<", endDate);
        }
        const snapshot = await query.get();
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFinancialTable(records);
    } catch (error) {
        console.error("Error loading financial data:", error);
        showError("Failed to load financial data. Please try again later.");
    }
}
// Function to Show Error Messages
function showError(message) {
    // You can implement a proper error notification system here
    alert(message);
}
// Function to Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS'
    }).format(amount);
}
// Function to Format Date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
// Function to Render Financial Table
function renderFinancialTable(records) {
    const tbody = document.querySelector("#financialTable tbody");
    tbody.innerHTML = "";

    let totalAmount = 0;
    let validatedAmount = 0;
    records.forEach(record => {
                const {
                    id,
                    programme,
                    programLevel,
                    fullName,
                    studentId,
                    amountPaid = 0,
                    paymentMethod,
                    timestamp,
                    collectedBy,
                    financialValidation
                } = record;

                const row = tbody.insertRow();
                row.innerHTML = `
            <td>${programme || 'N/A'}</td>
            <td>${programLevel || 'N/A'}</td>
            <td>${fullName || 'N/A'}</td>
            <td>${studentId || 'N/A'}</td>
            <td>${formatCurrency(amountPaid)}</td>
            <td>${paymentMethod || 'N/A'}</td>
            <td>${formatDate(timestamp)}</td>
            <td>${collectedBy || 'Not specified'}</td>
            <td>
                <select 
                    data-id="${id}" 
                    class="status-dropdown"
                    aria-label="Update payment status">
                    ${Object.values(STATUS).map(status => `
                        <option 
                            value="${status}" 
                            ${financialValidation?.status === status ? 'selected' : ''}>
                            ${status}
                        </option>
                    `).join('')}
                </select>
            </td>
        `;

        totalAmount += amountPaid;
        if (financialValidation?.status === STATUS.VALIDATED) {
            validatedAmount += amountPaid;
        }
    });

    updateSummary(totalAmount, validatedAmount);
}

// Function to Update Summary
function updateSummary(total, validated) {
    const summary = document.getElementById("financialSummary");
    summary.innerHTML = `
        <div class="summary-card">
            <h3>Total Collected</h3>
            <p>${formatCurrency(total)}</p>
        </div>
        <div class="summary-card">
            <h3>Validated</h3>
            <p>${formatCurrency(validated)}</p>
        </div>
        <div class="summary-card">
            <h3>Pending</h3>
            <p>${formatCurrency(total - validated)}</p>
        </div>
    `;
}

// Function to Handle Status Updates
async function updateStatus(recordId, status) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        await db.collection("registrations").doc(recordId).update({
            financialValidation: {
                status,
                updatedBy: user.email,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
        });
        
        await loadFinancialData();
    } catch (error) {
        console.error("Error updating status:", error);
        showError("Failed to update status. Please try again.");
    }
}

// Function to Export Financial Report
async function exportFinancialReport() {
    try {
        const records = await db.collection("registrations").get();
        const data = records.docs.map(doc => doc.data());
        
        // Convert data to CSV format
        const csvContent = convertToCSV(data);
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'financial-report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error("Error exporting report:", error);
        showError("Failed to export report. Please try again.");
    }
}

// Function to Convert Data to CSV
function convertToCSV(data) {
    const headers = ['programme', 'Program Level', 'Student Name', 'Student ID', 'Amount', 'Status', 'Date'];
    const rows = data.map(record => [
        record.programme,
        record.programLevel,
        record.fullName,
        record.studentId,
        record.amountPaid,
        record.financialValidation?.status,
        formatDate(record.timestamp)
    ]);
    
    return [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Check Authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById("userEmail").textContent = user.email;
            loadFinancialData();
        } else {
            window.location.href = "index.html";
        }
    });

    // Filter Change Handlers
    document.getElementById("programmeFilter").addEventListener("change", (e) => {
        currentFilters.programme = e.target.value;
        loadFinancialData();
    });

    document.getElementById("statusFilter").addEventListener("change", (e) => {
        currentFilters.status = e.target.value;
        loadFinancialData();
    });

    document.getElementById("dateFilter").addEventListener("change", (e) => {
        currentFilters.date = e.target.value;
        loadFinancialData();
    });

    // Status Update Handler
    document.querySelector("#financialTable").addEventListener("change", (event) => {
        if (event.target.classList.contains("status-dropdown")) {
            const recordId = event.target.dataset.id;
            const status = event.target.value;
            updateStatus(recordId, status);
        }
    });

    // Export Button Handler
    document.getElementById("exportBtn").addEventListener("click", exportFinancialReport);

    // Logout Handler
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "index.html";
        } catch (error) {
            console.error("Error during logout:", error);
            showError("Failed to log out. Please try again.");
        }
    });
});