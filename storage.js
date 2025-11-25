const { BlobServiceClient } = require('@azure/storage-blob');

// Polyfill for crypto in Docker environments
if (typeof global.crypto === 'undefined') {
    global.crypto = require('crypto');
}

let blobServiceClient;

function getBlobServiceClient() {
    if (!blobServiceClient) {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
        }
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
    return blobServiceClient;
}

async function testConnection() {
    try {
        const blobServiceClient = getBlobServiceClient();
        // Test connection by getting account info
        const accountInfo = await blobServiceClient.getAccountInfo();
        console.log('Azure Storage connection successful');
        return { success: true, accountInfo };
    } catch (err) {
        console.error('Azure Storage connection failed:', err);
        return { success: false, error: err.message };
    }
}

async function listContainers() {
    try {
        const blobServiceClient = getBlobServiceClient();
        const containers = [];
        
        for await (const container of blobServiceClient.listContainers()) {
            containers.push({
                name: container.name,
                lastModified: container.properties.lastModified,
                publicAccess: container.properties.publicAccess || 'private'
            });
        }
        
        console.log(`Found ${containers.length} containers`);
        return containers;
    } catch (err) {
        console.error('Error listing containers:', err);
        throw new Error(`Failed to list containers: ${err.message}`);
    }
}

async function listBlobs(containerName) {
    try {
        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobs = [];
        
        for await (const blob of containerClient.listBlobsFlat()) {
            blobs.push({
                name: blob.name,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified,
                contentType: blob.properties.contentType
            });
        }
        
        console.log(`Found ${blobs.length} blobs in container ${containerName}`);
        return blobs;
    } catch (err) {
        console.error(`Error listing blobs in container ${containerName}:`, err);
        throw new Error(`Failed to list blobs: ${err.message}`);
    }
}

async function uploadBlob(containerName, blobName, content, contentType = 'application/octet-stream') {
    try {
        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        const uploadBlobResponse = await blockBlobClient.upload(content, content.length, {
            blobHTTPHeaders: { blobContentType: contentType }
        });
        
        console.log(`Blob ${blobName} uploaded successfully`);
        return {
            success: true,
            requestId: uploadBlobResponse.requestId,
            url: blockBlobClient.url
        };
    } catch (err) {
        console.error(`Error uploading blob ${blobName}:`, err);
        return {
            success: false,
            error: err.message
        };
    }
}

async function deleteBlob(containerName, blobName) {
    try {
        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        await blockBlobClient.delete();
        
        console.log(`Blob ${blobName} deleted successfully`);
        return { success: true };
    } catch (err) {
        console.error(`Error deleting blob ${blobName}:`, err);
        return {
            success: false,
            error: err.message
        };
    }
}

module.exports = {
    testConnection,
    listContainers,
    listBlobs,
    uploadBlob,
    deleteBlob
};