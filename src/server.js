const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const packageJson = require('../package.json');
const config = require('../config');

const app = express();
const PORT = config.port;

// Constants for file management
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const MAX_FILE_AGE_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CONCURRENT_UPLOADS = 10;

// Track active uploads for memory management
const activeUploads = new Set();

// In-memory job status store
const jobStore = new Map();

// Job status states
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Create temp directory if it doesn't exist
async function ensureTempDir() {
  try {
    if (!existsSync(TEMP_DIR)) {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      console.log('Temp directory created:', TEMP_DIR);
    }
  } catch (error) {
    console.error('Error creating temp directory:', error);
    throw new Error('Failed to initialize temp storage');
  }
}

// Cleanup single file
async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log('Cleaned up file:', path.basename(filePath));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error cleaning up file:', filePath, error);
    }
  }
}

// Cleanup old files in temp directory
async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;
        
        if (age > MAX_FILE_AGE_MS) {
          await cleanupFile(filePath);
        }
      } catch (error) {
        console.error('Error checking file:', file, error);
      }
    }
    
    // Also cleanup completed job statuses
    cleanupCompletedJobs();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Cleanup all files in temp directory
async function cleanupAllTempFiles() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      await cleanupFile(filePath);
    }
    
    console.log('All temp files cleaned up');
  } catch (error) {
    console.error('Error cleaning up all temp files:', error);
  }
}

// Job status management functions
function createJob(uploadId) {
  try {
    const jobId = uuidv4();
    if (!jobId) {
      throw new Error('Failed to generate job ID');
    }
    
    const job = {
      id: jobId,
      status: JOB_STATUS.PENDING,
      uploadId: uploadId,
      createdAt: new Date(),
      updatedAt: new Date(),
      filePath: null,
      fileName: null,
      fileSize: null,
      error: null
    };
    
    jobStore.set(jobId, job);
    console.log(`Job created: ${jobId} for upload: ${uploadId}`);
    return job;
  } catch (error) {
    console.error('Failed to create job:', error);
    throw new Error('Job creation failed');
  }
}

function updateJobStatus(jobId, status, additionalData = {}) {
  try {
    if (!jobId) {
      console.error('Cannot update job: missing job ID');
      return null;
    }
    
    const job = jobStore.get(jobId);
    if (!job) {
      console.error(`Job not found for update: ${jobId}`);
      return null;
    }
    
    const oldStatus = job.status;
    job.status = status;
    job.updatedAt = new Date();
    Object.assign(job, additionalData);
    jobStore.set(jobId, job);
    
    console.log(`Job ${jobId} status updated: ${oldStatus} -> ${status}`);
    return job;
  } catch (error) {
    console.error(`Failed to update job ${jobId}:`, error);
    return null;
  }
}

function getJob(jobId) {
  try {
    if (!jobId) {
      console.error('Cannot get job: missing job ID');
      return null;
    }
    
    return jobStore.get(jobId);
  } catch (error) {
    console.error(`Failed to get job ${jobId}:`, error);
    return null;
  }
}

function cleanupJob(jobId) {
  try {
    if (!jobId) {
      console.error('Cannot cleanup job: missing job ID');
      return false;
    }
    
    const deleted = jobStore.delete(jobId);
    if (deleted) {
      console.log(`Job cleaned up: ${jobId}`);
    }
    return deleted;
  } catch (error) {
    console.error(`Failed to cleanup job ${jobId}:`, error);
    return false;
  }
}

function cleanupCompletedJobs() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [jobId, job] of jobStore.entries()) {
    const age = now - job.updatedAt.getTime();
    
    // Clean up completed/failed jobs older than file age limit
    if ((job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED) && 
        age > MAX_FILE_AGE_MS) {
      jobStore.delete(jobId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} completed job records`);
  }
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureTempDir();
      cb(null, TEMP_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate cryptographically secure unique filename
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const sanitizedOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const extension = path.extname(file.originalname);
    const filename = `audio-${timestamp}-${uniqueId}-${sanitizedOriginalName}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/m4a'
    ];
    
    const allowedExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error(`Invalid file extension. Allowed formats: ${allowedExtensions.join(', ')}`));
    }
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Expected audio file, got: ${file.mimetype}`));
    }
    
    cb(null, true);
  }
});

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.cors.origin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: packageJson.version
  });
});

app.post('/transcribe', async (req, res) => {
  // Check concurrent upload limit
  if (activeUploads.size >= MAX_CONCURRENT_UPLOADS) {
    return res.status(500).json({
      success: false,
      error: 'Server is currently processing too many uploads. Please try again later.',
      details: 'SERVICE_UNAVAILABLE'
    });
  }

  const uploadId = crypto.randomBytes(8).toString('hex');
  activeUploads.add(uploadId);

  // Create job and get job ID
  let job = null;
  let jobId = null;
  
  try {
    job = createJob(uploadId);
    jobId = job.id;
  } catch (error) {
    console.error('Job creation failed for upload:', uploadId, error);
    activeUploads.delete(uploadId);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize job tracking',
      details: 'JOB_CREATION_FAILED'
    });
  }

  upload.single('audio')(req, res, async (err) => {
    let filePath = null;
    
    try {
      // Handle multer errors
      if (err) {
        activeUploads.delete(uploadId);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: 'File too large' });
            if (!updated) {
              console.error(`Failed to update job status to FAILED for job: ${jobId}`);
              cleanupJob(jobId);
            }
            return res.status(400).json({
              success: false,
              error: 'File too large. Maximum size allowed is 100MB',
              details: 'FILE_TOO_LARGE'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: 'Invalid field name' });
            if (!updated) {
              console.error(`Failed to update job status to FAILED for job: ${jobId}`);
              cleanupJob(jobId);
            }
            return res.status(400).json({
              success: false,
              error: 'Unexpected field name. Use "audio" as the field name',
              details: 'INVALID_FIELD_NAME'
            });
          }
          const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: err.message });
          if (!updated) {
            console.error(`Failed to update job status to FAILED for job: ${jobId}`);
            cleanupJob(jobId);
          }
          return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`,
            details: 'UPLOAD_ERROR'
          });
        }
        
        // Handle custom validation errors
        const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: err.message });
        if (!updated) {
          console.error(`Failed to update job status to FAILED for job: ${jobId}`);
          cleanupJob(jobId);
        }
        return res.status(400).json({
          success: false,
          error: err.message,
          details: 'VALIDATION_ERROR'
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        activeUploads.delete(uploadId);
        const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: 'No file provided' });
        if (!updated) {
          console.error(`Failed to update job status to FAILED for job: ${jobId}`);
          cleanupJob(jobId);
        }
        return res.status(400).json({
          success: false,
          error: 'No audio file provided. Please upload a file using the "audio" field',
          details: 'NO_FILE_PROVIDED'
        });
      }

      // Store file path for cleanup and update job
      filePath = req.file.path;
      const processingUpdate = updateJobStatus(jobId, JOB_STATUS.PROCESSING, {
        filePath: filePath,
        fileName: req.file.filename,
        fileSize: req.file.size
      });
      
      if (!processingUpdate) {
        console.error(`Failed to update job status to PROCESSING for job: ${jobId}`);
        await cleanupFile(filePath);
        activeUploads.delete(uploadId);
        cleanupJob(jobId);
        return res.status(500).json({
          success: false,
          error: 'Failed to update job status',
          details: 'JOB_UPDATE_FAILED'
        });
      }

      // Additional file size validation (redundant but explicit)
      if (req.file.size > 100 * 1024 * 1024) {
        await cleanupFile(filePath);
        activeUploads.delete(uploadId);
        const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: 'File size exceeds limit' });
        if (!updated) {
          console.error(`Failed to update job status to FAILED for job: ${jobId}`);
          cleanupJob(jobId);
        }
        return res.status(400).json({
          success: false,
          error: 'File size exceeds 100MB limit',
          details: 'FILE_TOO_LARGE'
        });
      }

      // TODO: Process the audio file here (transcription logic)
      // For now, we'll simulate processing with a timeout
      
      // Success response with job ID
      res.status(200).json({
        success: true,
        jobId: jobId,
        message: 'Audio file received and processing started'
      });

      // Simulate processing and mark as completed
      setTimeout(async () => {
        try {
          const completed = updateJobStatus(jobId, JOB_STATUS.COMPLETED, {
            transcriptText: 'Sample transcript would go here...',
            processedAt: new Date()
          });
          
          if (!completed) {
            console.error(`Failed to update job status to COMPLETED for job: ${jobId}`);
            // Still clean up the file even if job update fails
          }
        } catch (error) {
          console.error(`Error updating job to completed for ${jobId}:`, error);
        }
        
        // Schedule file cleanup after processing is complete
        if (filePath) {
          await cleanupFile(filePath);
        }
      }, 5000); // Clean up after 5 seconds for demo purposes

    } catch (error) {
      console.error('Error in /transcribe endpoint:', error);
      
      // Update job status to failed with error handling
      try {
        const updated = updateJobStatus(jobId, JOB_STATUS.FAILED, { error: error.message });
        if (!updated) {
          console.error(`Failed to update job status to FAILED for job: ${jobId}`);
          cleanupJob(jobId);
        }
      } catch (jobError) {
        console.error(`Error updating job status to failed for ${jobId}:`, jobError);
        cleanupJob(jobId);
      }
      
      // Clean up file if it exists
      if (filePath) {
        await cleanupFile(filePath);
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during file processing',
        details: 'INTERNAL_ERROR'
      });
    } finally {
      // Always remove from active uploads
      activeUploads.delete(uploadId);
    }
  });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', err.stack);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler (must be last)
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      timestamp: new Date().toISOString()
    }
  });
});

// Initialize server and cleanup processes
let cleanupInterval;

async function initializeServer() {
  try {
    // Ensure temp directory exists
    await ensureTempDir();
    
    // Clean up any old files on startup
    await cleanupOldFiles();
    
    // Set up periodic cleanup
    cleanupInterval = setInterval(cleanupOldFiles, CLEANUP_INTERVAL_MS);
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Temp directory: ${TEMP_DIR}`);
      console.log(`Max concurrent uploads: ${MAX_CONCURRENT_UPLOADS}`);
      console.log(`File cleanup interval: ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(() => {
        console.log('Server closed to new connections');
      });
      
      // Clear cleanup interval
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
      
      // Wait for active uploads to complete (with timeout)
      const shutdownTimeout = setTimeout(() => {
        console.log('Shutdown timeout reached, forcing exit');
        process.exit(0);
      }, 30000); // 30 second timeout
      
      // Wait for active uploads
      while (activeUploads.size > 0) {
        console.log(`Waiting for ${activeUploads.size} active uploads to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Clean up all temp files
      await cleanupAllTempFiles();
      
      clearTimeout(shutdownTimeout);
      console.log('Graceful shutdown complete');
      process.exit(0);
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();

module.exports = app;
