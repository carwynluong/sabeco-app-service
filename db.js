const { Pool } = require("pg");

const config = {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'postgres',
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { 
        rejectUnauthorized: false 
    } : false,
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000,
    acquireTimeoutMillis: 60000,
};

let pool;

async function getConnection() {
    try {
        if (!pool) {
            pool = new Pool(config);
            
            // Test connection
            const client = await pool.connect();
            console.log("Database connection established");
            client.release();
        }
        return pool;
    } catch (err) {
        console.error("Database connection failed:", err);
        pool = null; // Reset on failure
        throw err;
    }
}

async function connectToDb() {
    try {
        await getConnection();
        return true;
    } catch (err) {
        console.error("Database connection test failed:", err.message);
        console.log("Database connection test failed");
        return false;
    }
}

async function getTables() {
    try {
        console.log("Getting tables from database...");
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT tablename as name 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename
        `);
        console.log(`Found ${result.rows.length} tables`);
        return result.rows;
    } catch (err) {
        console.error("Error getting tables:", err.message);
        throw new Error(`Database query failed: ${err.message}`);
    }
}

async function getStudents() {
    try {
        console.log("Getting students from database...");
        const pool = await getConnection();

        // First check if table exists
        const tableCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'students'
        `);

        if (parseInt(tableCheck.rows[0].count) === 0) {
            console.log("Students table does not exist, creating it...");
            await pool.query(`
                CREATE TABLE students (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100),
                    age INTEGER,
                    city VARCHAR(100)
                )
            `);
            console.log("Students table created successfully");
            
            // Add sample data
            await pool.query(`
                INSERT INTO students (name, age, city) VALUES 
                ('Nguyễn Văn An', 22, 'Hà Nội'),
                ('Trần Thị Bình', 21, 'Hồ Chí Minh'),
                ('Lê Văn Cường', 23, 'Đà Nẵng'),
                ('Phạm Thị Dung', 20, 'Hải Phòng'),
                ('Hoàng Văn Em', 24, 'Cần Thơ')
            `);
            console.log("Sample data inserted");
        }

        const result = await pool.query(
            "SELECT id, name, age, city FROM students ORDER BY id"
        );
        console.log(`Found ${result.rows.length} students`);
        
        // If table exists but is empty, add sample data
        if (result.rows.length === 0) {
            console.log("Table is empty, adding sample data...");
            await pool.query(`
                INSERT INTO students (name, age, city) VALUES 
                ('Nguyễn Văn An', 22, 'Hà Nội'),
                ('Trần Thị Bình', 21, 'Hồ Chí Minh'),
                ('Lê Văn Cường', 23, 'Đà Nẵng'),
                ('Phạm Thị Dung', 20, 'Hải Phòng'),
                ('Hoàng Văn Em', 24, 'Cần Thơ')
            `);
            console.log("Sample data inserted");
            
            // Re-fetch data
            const newResult = await pool.query(
                "SELECT id, name, age, city FROM students ORDER BY id"
            );
            return newResult.rows;
        }
        
        return result.rows;
    } catch (err) {
        console.error("Error getting students:", err.message);
        throw new Error(`Database query failed: ${err.message}`);
    }
}

async function addStudent(name, age, city) {
    try {
        console.log(`Adding student: ${name}, ${age}, ${city}`);
        const pool = await getConnection();
        
        const result = await pool.query(
            "INSERT INTO students (name, age, city) VALUES ($1, $2, $3) RETURNING id",
            [name, age, city]
        );
        console.log(
            `Student added successfully with ID: ${result.rows[0].id}`
        );
        return { success: true, id: result.rows[0].id };
    } catch (err) {
        console.error("Error adding student:", err.message);
        return { success: false, error: err.message };
    }
}

// Graceful shutdown
process.on("SIGINT", async () => {
    try {
        if (pool) {
            await pool.end();
            console.log("Database connection closed.");
        }
    } catch (err) {
        console.error("Error closing database connection:", err);
    }
    process.exit(0);
});

module.exports = { connectToDb, getTables, getStudents, addStudent };
