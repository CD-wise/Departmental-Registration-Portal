// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAbg3zC18VWvgoJMOVc33lYMAK3NcJ4rX8",
    authDomain: "compssa-register.firebaseapp.com",
    projectId: "compssa-register",
    storageBucket: "compssa-register.firebasestorage.app",
    messagingSenderId: "160471615333",
    appId: "1:160471615333:web:fcba7330289722fcce838c"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
async function searchStudent(studentId) {
    if (!studentId.trim()) {
        alert('Please enter a student ID');
        return;
    }

    const loadingIndicator = document.getElementById('loading');
    loadingIndicator.style.display = 'block';

    try {
        const snapshot = await db.collection('registrations')
            .where('studentId', '==', studentId.trim())
            .get();

        loadingIndicator.style.display = 'none';

        if (snapshot.empty) {
            alert('No student found with this ID');
            return;
        }

        const tbody = document.querySelector('#recordsTable tbody');
        tbody.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = tbody.insertRow();

            row.insertCell().textContent = data.fullName;
            row.insertCell().textContent = data.programme;
            row.insertCell().textContent = data.programLevel;
            row.insertCell().textContent = data.studentId;
            row.insertCell().textContent = data.sex;
            row.insertCell().textContent = data.phone;
            row.insertCell().textContent = data.paymentMethod;
            row.insertCell().textContent = `GHS ${data.amountPaid.toFixed(2)}`;
            row.insertCell().textContent = data.souveniers.join(', ');
            row.insertCell().textContent = data.collectedBy || 'Unknown';

            const actionsCell = row.insertCell();
            if (currentAdmin && (currentAdmin.uid === data.collectedByUid || currentAdmin.role === 'president')) {
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'edit-btn';
                editBtn.onclick = () => openEditModal(doc.id, data);
                actionsCell.appendChild(editBtn);

                /* const deleteBtn = document.createElement('button');
                 deleteBtn.textContent = 'Delete';
                 deleteBtn.className = 'delete-btn';
                 deleteBtn.onclick = () => deleteRecord(doc.id);
                 actionsCell.appendChild(deleteBtn);*/
            }
        });
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error searching:', error);
        alert('Error searching for student: ' + error.message);
    }
}
async function createAdminUser(email, password, fullName, role = 'president') {
    try {
        // First create the user in Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Then store additional info in Firestore
        await db.collection('admins').doc(user.uid).set({
            email: email,
            name: fullName,
            role: role
        });

        alert('Admin user created successfully');
    } catch (error) {
        alert('Error creating admin user: ' + error.message);
    }
}

auth.onAuthStateChanged(async user => {
    if (user) {
        // Get admin details from Firestore
        try {
            const adminDoc = await db.collection('admins').doc(user.uid).get();
            if (adminDoc.exists) {
                currentAdmin = {
                    uid: user.uid,
                    email: adminDoc.data().email,
                    name: adminDoc.data().name,
                    role: adminDoc.data().role
                };
                console.log('User role:', currentAdmin.role);
                if (currentAdmin.role === 'financial_officer') {
                    window.location.href = 'financial-dashboard.html';
                    return;
                }

                showDashboard();
                fetchRegistrations();
                // Show admin name in UI
                document.getElementById('adminName').textContent = currentAdmin.name;
            } else {
                console.log('No admin document found for user:', user.uid);
                alert('User not authorized');
                await auth.signOut();
            }
        } catch (error) {
            console.error('Error fetching admin details:', error);
            alert('Error authenticating user:' + error.message);
        }
    } else {
        currentAdmin = null;
        hideDashboard();
    }
});
/*async function deleteRecord(docId) {
    if (!currentAdmin) {
        alert('You must be logged in to delete records');
        return;
    }

    // Get the record first to check permissions
    try {
        const doc = await db.collection('registrations').doc(docId).get();
        const data = doc.data();

        // Check if current admin is either the collector or has president role
        if (currentAdmin.uid !== data.collectedByUid && currentAdmin.role !== 'president') {
            alert('You can only delete records you collected');
            return;
        }
        // Ask for confirmation
        if (confirm(`Are you sure you want to delete ${data.fullName}'s record? This cannot be undone.`)) {
            await db.collection('registrations').doc(docId).delete();
            alert('Record deleted successfully');
            fetchRegistrations(); // Refresh the table
        }
    } catch (error) {
        alert('Error deleting record: ' + error.message);
    }
}*/
async function fetchRegistrations() {
    const loadingIndicator = document.getElementById('loading');
    const tbody = document.querySelector('#recordsTable tbody');
    tbody.innerHTML = '';

    loadingIndicator.style.display = 'block';

    try {
        const snapshot = await db.collection('registrations')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        loadingIndicator.style.display = 'none';

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = tbody.insertRow();

            // Add all the existing cells
            row.insertCell().textContent = data.fullName;
            row.insertCell().textContent = data.programme;
            row.insertCell().textContent = data.programLevel;
            row.insertCell().textContent = data.studentId;
            row.insertCell().textContent = data.sex;
            row.insertCell().textContent = data.phone;
            row.insertCell().textContent = data.paymentMethod;
            row.insertCell().textContent = `GHS ${data.amountPaid.toFixed(2)}`;
            row.insertCell().textContent = data.souveniers.join(', ');
            row.insertCell().textContent = data.collectedBy || 'Unknown';

            // Add actions cell with edit and delete buttons
            const actionsCell = row.insertCell();

            // Only show edit/delete buttons if current admin is the collector or has president role
            if (currentAdmin && (currentAdmin.uid === data.collectedByUid || currentAdmin.role === 'president')) {
                // Edit button
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'edit-btn';
                editBtn.onclick = () => openEditModal(doc.id, data);
                actionsCell.appendChild(editBtn);

                // Delete button
                /*const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteRecord(doc.id);
                actionsCell.appendChild(deleteBtn);
                */
            }
        });
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error fetching registrations:', error);
        alert('Error fetching registrations: ' + error.message);
    }
}
// Example usage:
// createAdminUser('admin@example.com', 'password123', 'John Doe', 'admin');

// Add Export Buttons to HTML dynamically
document.addEventListener('DOMContentLoaded', () => {
    const cardDiv = document.querySelector('.card:nth-child(2)'); // Select the records card
    const exportDiv = document.createElement('div');
    exportDiv.className = 'form-group';
    exportDiv.innerHTML = `
        <label for="exportSelect">Download Records</label>
        <select id="exportSelect" class="form-control">
            <option value="" selected disabled>Select Programme</option>
            <option value="Computer Science">Computer Science Records</option>
            <option value="Cybersecurity">Cybersecurity Records</option>
            <option value="IT">Diploma In IT</option>
                <option value="pre">Pre-HND In IT</option>
            <option value="all">All Records</option>
        </select>
        <button class="btn" id="downloadBtn">Download</button>
    `;
    cardDiv.insertBefore(exportDiv, cardDiv.querySelector('table'));

    const exportSelect = document.getElementById('exportSelect');
    const downloadBtn = document.getElementById('downloadBtn');

    downloadBtn.addEventListener('click', () => {
        const selectedprogramme = exportSelect.value;
        if (!selectedprogramme) {
            alert('Please select a Programme to download records.');
            return;
        }
        exportToCSV(selectedprogramme);
    });
});


// Export to CSV Function
async function exportToCSV(programme) {
    try {
        let query = db.collection('registrations');

        // Apply programme filter if specified
        if (programme !== 'all') {
            query = query.where('programme', '==', programme);
        }

        const snapshot = await query.get();
        const records = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            records.push({
                fullName: data.fullName || '',
                programme: data.programme || '',
                programLevel: data.programLevel || '',
                studentId: data.studentId || '',
                sex: data.sex || '',
                phone: data.phone || '',
                paymentMethod: data.paymentMethod || '',
                amountPaid: data.amountPaid ? data.amountPaid.toFixed(2) : '0.00',
                souveniers: (data.souveniers || []).join('; '),
                registrationDate: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : ''
            });
        });

        if (records.length === 0) {
            alert('No records found for export.');
            return;
        }

        // Generate CSV content
        const headers = [
            'Full Name',
            'programme',
            'Program Level',
            'Student ID',
            'Sex',
            'Phone Number',
            'Payment Method',
            'Amount Paid (GHS)',
            'Souveniers',
            'Registration Date'
        ];

        const csvRows = [
            headers.join(','),
            ...records.map(record => [
                `"${record.fullName}"`,
                `"${record.programme}"`,
                `"${record.programLevel}"`,
                `"${record.studentId}"`,
                `"${record.sex}"`,
                `"${record.phone}"`,
                `"${record.paymentMethod}"`,
                `"${record.amountPaid}"`,
                `"${record.souveniers}"`,
                `"${record.registrationDate}"`
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');

        // Create and trigger download
        const dateStr = new Date().toISOString().slice(0, 10);
        const deptStr = programme === 'all' ? 'All_programme' : programme.replace(/\s+/g, '_');
        const filename = `registrations_${deptStr}_${dateStr}.csv`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        alert('Error exporting records: ' + error.message);
        console.error('Export error:', error);
    }
}
// Firebase Configuration and initialization remains the same...

// Add Registration Record
registrationForm.addEventListener('submit', async(e) => {
    e.preventDefault();

    if (!currentAdmin) {
        alert('You must be logged in to register students');
        return;
    }

    // Validate Student ID
    const studentId = document.getElementById('studentId').value;
    if (studentId.length !== 9) {
        alert('Student ID must be exactly 9 characters');
        return;
    }

    const souveniers = [];
    const penQuantity = parseInt(document.getElementById('penQuantity').value);
    const bookQuantity = parseInt(document.getElementById('bookQuantity').value);

    // Check if "None" is selected along with other items
    const noneChecked = document.querySelector('input[value="None"]').checked;
    const otherSouveniersSelected = Array.from(document.querySelectorAll('input[name="souvenier"]:checked'))
        .some(cb => cb.value !== 'None');

    if (noneChecked && (penQuantity > 0 || bookQuantity > 0 || otherSouveniersSelected)) {
        alert('Cannot select "None" along with other souveniers');
        return;
    }

    document.querySelectorAll('input[name="souvenier"]:checked').forEach((checkbox) => {
        if (checkbox.value !== 'None') {
            souveniers.push(checkbox.value);
        }
    });

    if (penQuantity > 0) {
        souveniers.push(`Pen (${penQuantity})`);
    }
    if (bookQuantity > 0) {
        souveniers.push(`Book (${bookQuantity})`);
    }

    if (souveniers.length === 0) {
        souveniers.push("None");
    }

    const record = {
        programme: document.getElementById('programme').value,
        fullName: document.getElementById('fullName').value,
        studentId: studentId,
        programLevel: document.getElementById('programLevel').value,
        sex: document.getElementById('sex').value,
        phone: document.getElementById('phone').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        amountPaid: parseFloat(document.getElementById('amountPaid').value),
        souveniers: souveniers,
        collectedBy: currentAdmin.name,
        collectedByUid: currentAdmin.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('registrations').add(record);
        alert('Registration successful!');
        fetchRegistrations();
        registrationForm.reset();
    } catch (error) {
        alert('Error registering: ' + error.message);
    }
});

// Fetch Registrations
async function fetchRegistrations() {
    const loadingIndicator = document.getElementById('loading');
    const tbody = document.querySelector('#recordsTable tbody');
    tbody.innerHTML = '';

    loadingIndicator.style.display = 'block';

    try {
        const snapshot = await db.collection('registrations')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        loadingIndicator.style.display = 'none';

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = tbody.insertRow();
            row.insertCell().textContent = data.fullName;
            row.insertCell().textContent = data.programme;
            row.insertCell().textContent = data.programLevel;
            row.insertCell().textContent = data.studentId;
            row.insertCell().textContent = data.sex;
            row.insertCell().textContent = data.phone;
            row.insertCell().textContent = data.paymentMethod;
            row.insertCell().textContent = `GHS ${data.amountPaid.toFixed(2)}`;
            row.insertCell().textContent = data.souveniers.join(', ');
            row.insertCell().textContent = data.collectedBy || 'Unknown';



            // Only show edit/delete buttons if current admin matches the collector
            const actionsCell = row.insertCell();
            if (currentAdmin.uid === data.collectedByUid) {
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'edit-btn';
                editBtn.addEventListener('click', () => openEditModal(doc.id, data));
                actionsCell.appendChild(editBtn);
            }
        });
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error fetching registrations:', error);
        alert('Error fetching registrations: ' + error.message);
    }
}

// Add event listener for souvenier checkboxes
document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('input[name="souvenier"]');
    const noneOption = document.querySelector('input[value="None"]');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.value === "None" && this.checked) {
                s

                checkboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            } else if (this.checked && noneOption.checked) {

                noneOption.checked = false;
            }
        });
    });
});
// Authentication Functions
function showDashboard() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
}

function hideDashboard() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
}

// Modify the login function
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(hideDashboard);
});
let currentEditId = null;

// 2. Replace the existing openEditModal function with this updated version
function openEditModal(docId, data) {
    currentEditId = docId;
    const modal = document.getElementById('editModal');

    // Populate form fields with existing data
    document.getElementById('editprogramme').value = data.programme || '';
    document.getElementById('editProgramLevel').value = data.programLevel || '';
    document.getElementById('editFullName').value = data.fullName || '';
    document.getElementById('editStudentId').value = data.studentId || '';
    document.getElementById('editSex').value = data.sex || '';
    document.getElementById('editPhone').value = data.phone || '';
    document.getElementById('editPaymentMethod').value = data.paymentMethod || '';
    document.getElementById('editAmountPaid').value = data.amountPaid || 0;

    // Reset all checkboxes and quantities
    document.querySelectorAll('input[name="editSouvenier"]').forEach(cb => cb.checked = false);
    document.getElementById('editPenQuantity').value = "0";
    document.getElementById('editBookQuantity').value = "0";

    // Handle souveniers
    data.souveniers.forEach(souvenier => {
        if (souvenier.includes('Pen (')) {
            const quantity = parseInt(souvenier.match(/\((\d+)\)/)[1]);
            document.getElementById('editPenQuantity').value = quantity.toString();
        } else if (souvenier.includes('Book (')) {
            const quantity = parseInt(souvenier.match(/\((\d+)\)/)[1]);
            document.getElementById('editBookQuantity').value = quantity.toString();
        } else {
            const checkbox = document.querySelector(`input[name="editSouvenier"][value="${souvenier}"]`);
            if (checkbox) checkbox.checked = true;
        }
    });

    modal.style.display = 'flex';
}


// Function to close edit modal
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    currentEditId = null;
}

// 3. Replace the existing edit form submission handler
document.getElementById('editForm').addEventListener('submit', async(e) => {
    e.preventDefault();

    const souveniers = [];
    const editPenQuantity = parseInt(document.getElementById('editPenQuantity').value);
    const editBookQuantity = parseInt(document.getElementById('editBookQuantity').value);

    // Check if "None" is selected along with other items
    const noneChecked = document.querySelector('input[name="editSouvenier"][value="None"]').checked;
    const otherSouveniersSelected = Array.from(document.querySelectorAll('input[name="editSouvenier"]:checked'))
        .some(cb => cb.value !== 'None');

    if (noneChecked && (editPenQuantity > 0 || editBookQuantity > 0 || otherSouveniersSelected)) {
        alert('Cannot select "None" along with other souveniers');
        return;
    }

    document.querySelectorAll('input[name="editSouvenier"]:checked').forEach((checkbox) => {
        if (checkbox.value !== 'None') {
            souveniers.push(checkbox.value);
        }
    });

    if (editPenQuantity > 0) {
        souveniers.push(`Pen (${editPenQuantity})`);
    }
    if (editBookQuantity > 0) {
        souveniers.push(`Book (${editBookQuantity})`);
    }

    if (souveniers.length === 0) {
        souveniers.push("None");
    }

    // Validate Student ID
    const studentId = document.getElementById('editStudentId').value;
    if (studentId.length !== 9) {
        alert('Student ID must be exactly 9 characters');
        return;
    }

    const updatedData = {
        programme: document.getElementById('editprogramme').value,
        programLevel: document.getElementById('editProgramLevel').value,
        fullName: document.getElementById('editFullName').value,
        studentId: studentId,
        sex: document.getElementById('editSex').value,
        phone: document.getElementById('editPhone').value,
        paymentMethod: document.getElementById('editPaymentMethod').value,
        amountPaid: parseFloat(document.getElementById('editAmountPaid').value),
        souveniers: souveniers
    };

    try {
        await db.collection('registrations').doc(currentEditId).update(updatedData);
        alert('Record updated successfully!');
        closeEditModal();
        // If there's a search value, refresh the search instead of fetching all
        const searchInput = document.getElementById('searchStudentId');
        if (searchInput.value.trim()) {
            searchStudent(searchInput.value.trim());
        } else {
            fetchRegistrations();
        }
    } catch (error) {
        alert('Error updating record: ' + error.message);
    }
});


window.onclick = function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeEditModal();
        }
    }
    // 4. Add event listener for search input (optional enhancement)
document.addEventListener('DOMContentLoaded', () => {
    // Add existing DOMContentLoaded handlers here

    // Add keypress event listener for search
    const searchInput = document.getElementById('searchStudentId');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchStudent(searchInput.value);
        }
    });
});
// Add event listener for souvenier checkboxes in edit modal
document.addEventListener('DOMContentLoaded', () => {
    const editCheckboxes = document.querySelectorAll('input[name="editSouvenier"]');
    const editNoneOption = document.querySelector('input[name="editSouvenier"][value="None"]');

    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.value === "None" && this.checked) {
                editCheckboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            } else if (this.checked && editNoneOption.checked) {
                editNoneOption.checked = false;
            }
        });
    });
});