require('dotenv').config();
const express = require("express");
const path = require("path");
const { connectToDb, getTables, getStudents, addStudent } = require("./db");
const { 
    testConnection, 
    listContainers, 
    listBlobs, 
    uploadBlob, 
    deleteBlob 
} = require("./storage");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Health check endpoint for Azure
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/tables", async (req, res) => {
    try {
        console.log("API call: /api/tables");
        const connected = await connectToDb();
        if (!connected) {
            console.error("Database connection test failed");
            return res.status(500).json({
                error: "Database connection failed",
                details:
                    "Unable to establish connection to SQL Managed Instance",
            });
        }

        const tables = await getTables();
        console.log(`Returning ${tables.length} tables`);
        res.json(tables);
    } catch (err) {
        console.error("API Error /api/tables:", err.message);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

app.get("/api/students", async (req, res) => {
    try {
        console.log("API call: /api/students");
        const connected = await connectToDb();
        if (!connected) {
            console.error("Database connection test failed");
            return res.status(500).json({
                error: "Database connection failed",
                details:
                    "Unable to establish connection to SQL Managed Instance",
            });
        }

        const students = await getStudents();
        console.log(`Returning ${students.length} students`);
        res.json(students);
    } catch (err) {
        console.error("API Error /api/students:", err.message);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

app.post("/api/students", async (req, res) => {
    try {
        console.log("API call: POST /api/students", req.body);
        const { name, age, city } = req.body;

        if (!name || !age || !city) {
            console.log("Validation failed: missing required fields");
            return res.status(400).json({
                error: "Vui lòng điền đầy đủ thông tin",
                details: "Name, age, and city are required",
            });
        }

        const connected = await connectToDb();
        if (!connected) {
            console.error("Database connection test failed");
            return res.status(500).json({
                error: "Database connection failed",
                details:
                    "Unable to establish connection to SQL Managed Instance",
            });
        }

        const result = await addStudent(name, parseInt(age), city);
        if (result.success) {
            console.log(`Student added successfully with ID: ${result.id}`);
            res.json({
                success: true,
                message: "Thêm học sinh thành công",
                id: result.id,
            });
        } else {
            console.error("Failed to add student:", result.error);
            res.status(500).json({
                error: result.error,
                details: "Database insert operation failed",
            });
        }
    } catch (err) {
        console.error("API Error POST /api/students:", err.message);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

// Azure Blob Storage endpoints
app.get("/api/storage/test", async (req, res) => {
    try {
        console.log("API call: /api/storage/test");
        const result = await testConnection();
        
        if (result.success) {
            res.json({
                success: true,
                message: "Azure Storage connection successful",
                accountInfo: result.accountInfo
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                details: "Failed to connect to Azure Storage"
            });
        }
    } catch (err) {
        console.error("API Error /api/storage/test:", err.message);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            details: err.message,
        });
    }
});

app.get("/api/storage/containers", async (req, res) => {
    try {
        console.log("API call: /api/storage/containers");
        const containers = await listContainers();
        res.json(containers);
    } catch (err) {
        console.error("API Error /api/storage/containers:", err.message);
        res.status(500).json({
            error: "Failed to list containers",
            details: err.message,
        });
    }
});

app.get("/api/storage/containers/:containerName/blobs", async (req, res) => {
    try {
        const { containerName } = req.params;
        console.log(`API call: /api/storage/containers/${containerName}/blobs`);
        
        const blobs = await listBlobs(containerName);
        res.json(blobs);
    } catch (err) {
        console.error("API Error /api/storage/blobs:", err.message);
        res.status(500).json({
            error: "Failed to list blobs",
            details: err.message,
        });
    }
});


app.delete("/api/storage/containers/:containerName/blobs/:blobName", async (req, res) => {
    try {
        const { containerName, blobName } = req.params;
        console.log(`API call: DELETE /api/storage/containers/${containerName}/blobs/${blobName}`);
        
        const result = await deleteBlob(containerName, blobName);
        if (result.success) {
            res.json({
                success: true,
                message: "Blob deleted successfully"
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                details: "Failed to delete blob"
            });
        }
    } catch (err) {
        console.error("API Error DELETE /api/storage/blobs:", err.message);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
