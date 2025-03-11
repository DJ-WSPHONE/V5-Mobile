let orders = [];
let skippedOrders = [];
let currentIndex = 0;

window.onload = function () {
    document.getElementById("scanner").focus();
};

   <div id="uploadSection">
            <input type="file" id="picklistUpload">
            <button onclick="uploadPicklist()">Upload</button>
            <p id="uploadStatus"></p>
        </div>

// ✅ Upload Pick List
function uploadPicklist() {
    let fileInput = document.getElementById("picklistUpload");
    let statusText = document.getElementById("uploadStatus");
    let uploadSection = document.getElementById("uploadSection");
    let file = fileInput.files[0];

    if (!file) {
        statusText.textContent = "⚠️ No file selected. Please choose a CSV file.";
        return;
    }

    let reader = new FileReader();
    reader.onload = function (event) {
        let csvContent = event.target.result;
        if (!csvContent.trim()) {
            statusText.textContent = "⚠️ File is empty. Please upload a valid CSV.";
            return;
        }
        statusText.textContent = "✅ File uploaded successfully!";
        
        // ✅ Auto-hide success message & hide upload UI
        setTimeout(() => {
            statusText.textContent = "";
            uploadSection.style.display = "none";
        }, 3000);

        parseCSV(csvContent);
    };
    reader.onerror = function () {
        statusText.textContent = "⚠️ Error reading the file. Try again.";
    };
    reader.readAsText(file);
}

// ✅ Parse CSV
function parseCSV(csvData) {
    let rows = csvData.trim().split("\n").map(row => row.split(",").map(cell => cell.trim()));
    if (rows.length < 2) {
        alert("Error: CSV file is missing data.");
        return;
    }

    let headers = rows[0].map(header => header.toLowerCase());
    let orderIndex = headers.indexOf("order");
    let imeiIndex = headers.indexOf("esn");
    let modelIndex = headers.indexOf("model");
    let storageIndex = headers.indexOf("capacity");
    let colorIndex = headers.indexOf("color");
    let locationIndex = headers.indexOf("location");

    if (imeiIndex === -1 || orderIndex === -1) {
        alert("Error: The CSV file is missing required headers (Order, ESN).");
        return;
    }

    orders = [];
    skippedOrders = [];

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (row.length < headers.length) continue;
        let order = row[orderIndex] || "Unknown Order";
        let imei = row[imeiIndex] || "";
        let model = row[modelIndex] || "Unknown Model";
        let storage = row[storageIndex] || "Unknown Storage";
        let color = row[colorIndex] || "Unknown Color";
        let location = row[locationIndex] || "Unknown Location";

        if (imei) {
            orders.push({ order, imei, model, storage, color, location });
        }
    }
    displayOrders();
}

// ✅ Display Orders
function displayOrders() {
    let ordersTable = document.getElementById("orders");
    ordersTable.innerHTML = "";
    orders.forEach((order, index) => {
        let row = document.createElement("tr");
        row.id = `row-${index}`;
        row.innerHTML = `<td>${order.order}</td><td>${order.imei}</td><td>${order.model}</td><td>${order.storage}</td><td>${order.color}</td><td>${order.location}</td>`;
        ordersTable.appendChild(row);
    });
    highlightNextIMEI();
}

// ✅ Highlight Next IMEI & Auto-Scroll
function highlightNextIMEI() {
    let nextIndex = orders.findIndex((_, index) => 
        !document.getElementById(`row-${index}`).classList.contains("green") &&
        !document.getElementById(`row-${index}`).classList.contains("orange")
    );

    if (nextIndex === -1) return;

    currentIndex = nextIndex;
    let activeRow = document.getElementById(`row-${currentIndex}`);
    
    // ✅ Ensure proper scrolling to keep the IMEI in view
    if (activeRow) {
        activeRow.classList.add("next");
        activeRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// ✅ Check IMEI
function checkIMEI() {
    let scannerInput = document.getElementById("scanner").value.trim();
    let resultRow = document.getElementById(`row-${currentIndex}`);

    if (!resultRow) return;
    if (scannerInput === orders[currentIndex].imei) {
        resultRow.classList.remove("next", "red", "orange");
        resultRow.classList.add("green");
        resultRow.removeAttribute("onclick");

        skippedOrders = skippedOrders.filter(entry => entry.index !== currentIndex);
        updateSkippedList();

        moveToNextUnscannedIMEI();
    } else {
        resultRow.classList.add("red");
        setTimeout(() => resultRow.classList.remove("red"), 2000);
    }
    document.getElementById("scanner").value = "";
}

// ✅ Skip IMEI
function skipIMEI() {
    let resultRow = document.getElementById(`row-${currentIndex}`);
    if (!resultRow) return;

    resultRow.classList.remove("next");
    resultRow.classList.add("orange");

    if (!skippedOrders.some(entry => entry.index === currentIndex)) {
        skippedOrders.push({ index: currentIndex, order: orders[currentIndex] });
    }

    updateSkippedList();
    moveToNextUnscannedIMEI();
}

// ✅ Move to Next Unscanned IMEI
function moveToNextUnscannedIMEI() {
    let nextIndex = orders.findIndex((_, index) => 
        !document.getElementById(`row-${index}`).classList.contains("green") &&
        !document.getElementById(`row-${index}`).classList.contains("orange")
    );

    if (nextIndex === -1) return;

    currentIndex = nextIndex;
    highlightNextIMEI();
}

// ✅ Update Skipped List
function updateSkippedList() {
    let skippedTable = document.getElementById("skipped-orders");
    skippedTable.innerHTML = "";

    let uniqueSkipped = Array.from(new Map(skippedOrders.map(item => [item.order.imei, item])).values());
    uniqueSkipped.forEach((entry) => {
        let newRow = document.createElement("tr");
        newRow.setAttribute("data-index", entry.index);
        newRow.setAttribute("onclick", `undoSpecificSkip(${entry.index})`);
        newRow.innerHTML = `<td>${entry.order.order}</td><td>${entry.order.imei}</td><td>${entry.order.model}</td><td>${entry.order.storage}</td><td>${entry.order.color}</td><td>${entry.order.location}</td>`;
        skippedTable.appendChild(newRow);
    });
}

// ✅ Undo Skipped IMEI (With 5-second Timeout)
function undoSpecificSkip(index) {
    let row = document.getElementById(`row-${index}`);
    if (!row) return;

    row.classList.remove("orange");
    row.classList.add("next");

    skippedOrders = skippedOrders.filter(entry => entry.index !== index);
    updateSkippedList();

    currentIndex = index;
    highlightNextIMEI();

    // ✅ If the user doesn't scan within 5 seconds, return to orange
    setTimeout(() => {
        if (row.classList.contains("next")) {
            row.classList.remove("next");
            row.classList.add("orange");
            highlightNextIMEI();
        }
    }, 5000);
}

function highlightNextIMEI() {
    orders.forEach((_, index) => {
        let row = document.getElementById(`row-${index}`);
        if (!row.classList.contains("green") && !row.classList.contains("orange")) {
            row.classList.remove("next", "red");
        }
    });

    let nextIndex = orders.findIndex((_, index) => 
        !document.getElementById(`row-${index}`).classList.contains("green") &&
        !document.getElementById(`row-${index}`).classList.contains("orange")
    );

    if (nextIndex === -1) return;

    currentIndex = nextIndex;
    let activeRow = document.getElementById(`row-${currentIndex}`);
    if (activeRow) {
        activeRow.classList.add("next");

        // ✅ Auto-scroll to keep the next IMEI visible
        let tableContainer = document.querySelector(".table-container");
        let rowPosition = activeRow.offsetTop;
        tableContainer.scrollTo({ top: rowPosition - 60, behavior: "smooth" });
    }
}
