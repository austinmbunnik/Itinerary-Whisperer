const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const ffprobe = require('node-ffprobe');
const ffprobeStatic = require('ffprobe-static');
const { needsConversion, convertAudioFile, cleanupConvertedFile } = require('./audioConverter');
const { trackTranscriptionCost, getCostInfoForJob } = require('./costTrackingService');

// Set ffprobe path
ffprobe.FFPROBE_PATH = ffprobeStatic.path;

// Get audio duration using ffprobe
async function getAudioDuration(filePath) {
  try {
    const probeData = await ffprobe(filePath);
    
    if (probeData && probeData.streams) {
      const audioStream = probeData.streams.find(stream => stream.codec_type === 'audio');
      if (audioStream && audioStream.duration) {
        return parseFloat(audioStream.duration);
      }
      
      // Fallback to format duration
      if (probeData.format && probeData.format.duration) {
        return parseFloat(probeData.format.duration);
      }
    }
    
    console.warn(`Could not determine duration for ${path.basename(filePath)}`);
    return null;
  } catch (error) {
    console.warn(`Failed to get duration for ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

// Constants for Whisper API
const WHISPER_CONSTANTS = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB - Whisper API limit
  SUPPORTED_FORMATS: ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'],
  SUPPORTED_MIMES: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'video/webm', // WebM can contain audio only
    'video/mp4'   // MP4 can contain audio only
  ],
  DEFAULT_MODEL: 'whisper-1',
  RESPONSE_FORMATS: ['json', 'text', 'srt', 'verbose_json', 'vtt'],
  
  // Retry configuration
  INITIAL_RETRY_DELAY: 1000,      // 1 second
  MAX_RETRY_DELAY: 32000,         // 32 seconds
  MAX_RETRIES: 5,
  RETRY_MULTIPLIER: 2,
  
  // Timeout configuration
  REQUEST_TIMEOUT: 300000,        // 5 minutes for large files
  
  // Rate limit handling
  RATE_LIMIT_DELAY: 60000,        // 1 minute delay on rate limit
};

// Error types for better error handling
class WhisperError extends Error {
  constructor(message, code, statusCode = null, details = null) {
    super(message);
    this.name = 'WhisperError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Audio format validation
function validateAudioFormat(filePath, mimeType = null) {
  const ext = path.extname(filePath).toLowerCase();
  const stats = fs.statSync(filePath);
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    throw new WhisperError(
      'Audio file not found',
      'FILE_NOT_FOUND',
      404
    );
  }
  
  // Check file size
  if (stats.size > WHISPER_CONSTANTS.MAX_FILE_SIZE) {
    throw new WhisperError(
      `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds Whisper API limit of 25MB`,
      'FILE_TOO_LARGE',
      413,
      { fileSize: stats.size, maxSize: WHISPER_CONSTANTS.MAX_FILE_SIZE }
    );
  }
  
  // Check file extension
  if (!WHISPER_CONSTANTS.SUPPORTED_FORMATS.includes(ext)) {
    throw new WhisperError(
      `Unsupported file format: ${ext}. Supported formats: ${WHISPER_CONSTANTS.SUPPORTED_FORMATS.join(', ')}`,
      'UNSUPPORTED_FORMAT',
      415,
      { format: ext, supportedFormats: WHISPER_CONSTANTS.SUPPORTED_FORMATS }
    );
  }
  
  // Check MIME type if provided
  if (mimeType && !WHISPER_CONSTANTS.SUPPORTED_MIMES.includes(mimeType)) {
    console.warn(`Unexpected MIME type: ${mimeType} for file ${ext}. Proceeding with file extension validation.`);
  }
  
  return {
    isValid: true,
    format: ext,
    size: stats.size,
    mimeType: mimeType || `audio/${ext.slice(1)}`
  };
}

// Create a readable stream with proper error handling
function createAudioStream(filePath) {
  try {
    const stream = fs.createReadStream(filePath);
    
    // Add error handling to stream
    stream.on('error', (error) => {
      console.error(`Stream error for file ${filePath}:`, error);
      throw new WhisperError(
        'Failed to read audio file',
        'STREAM_ERROR',
        500,
        { originalError: error.message }
      );
    });
    
    return stream;
  } catch (error) {
    throw new WhisperError(
      'Failed to create audio stream',
      'STREAM_CREATION_ERROR',
      500,
      { originalError: error.message }
    );
  }
}

// Calculate exponential backoff delay
function calculateBackoffDelay(retryCount) {
  const delay = Math.min(
    WHISPER_CONSTANTS.INITIAL_RETRY_DELAY * Math.pow(WHISPER_CONSTANTS.RETRY_MULTIPLIER, retryCount),
    WHISPER_CONSTANTS.MAX_RETRY_DELAY
  );
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

// Check if error is retryable
function isRetryableError(error) {
  // Network errors
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED') {
    return true;
  }
  
  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }
  
  // OpenAI specific errors
  if (error.message && (
    error.message.includes('timeout') ||
    error.message.includes('network') ||
    error.message.includes('ECONNRESET')
  )) {
    return true;
  }
  
  return false;
}

// Parse Whisper API error response
function parseWhisperError(error) {
  const statusCode = error.status || error.statusCode || 500;
  let errorCode = 'WHISPER_API_ERROR';
  let errorMessage = error.message || 'Unknown Whisper API error';
  let details = {};
  
  // Handle specific error cases
  switch (statusCode) {
    case 400:
      errorCode = 'INVALID_REQUEST';
      errorMessage = 'Invalid request to Whisper API';
      if (error.message.includes('format')) {
        errorCode = 'INVALID_FORMAT';
        errorMessage = 'Audio format not supported by Whisper API';
      }
      break;
      
    case 401:
      errorCode = 'INVALID_API_KEY';
      errorMessage = 'Invalid or missing OpenAI API key';
      break;
      
    case 403:
      errorCode = 'FORBIDDEN';
      errorMessage = 'Access forbidden. Check your API key permissions';
      break;
      
    case 413:
      errorCode = 'FILE_TOO_LARGE';
      errorMessage = 'Audio file exceeds Whisper API size limit';
      break;
      
    case 429:
      errorCode = 'RATE_LIMIT';
      errorMessage = 'OpenAI API rate limit exceeded';
      if (error.headers && error.headers['retry-after']) {
        details.retryAfter = parseInt(error.headers['retry-after']);
      }
      break;
      
    case 500:
    case 502:
    case 503:
      errorCode = 'SERVER_ERROR';
      errorMessage = 'OpenAI server error. Please try again later';
      break;
      
    case 504:
      errorCode = 'TIMEOUT';
      errorMessage = 'Request to OpenAI timed out';
      break;
  }
  
  // Extract additional details from error
  if (error.response && error.response.data) {
    details = { ...details, ...error.response.data };
  }
  
  return new WhisperError(errorMessage, errorCode, statusCode, details);
}

// Log API request for debugging
function logApiRequest(requestId, filePath, options) {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    type: 'WHISPER_API_REQUEST',
    file: path.basename(filePath),
    fileSize: fs.statSync(filePath).size,
    model: options.model || WHISPER_CONSTANTS.DEFAULT_MODEL,
    responseFormat: options.response_format || 'text',
    language: options.language || 'auto',
    temperature: options.temperature || 0
  };
  
  console.log('Whisper API Request:', JSON.stringify(logData, null, 2));
}

// Log API response for debugging
function logApiResponse(requestId, response, duration) {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    type: 'WHISPER_API_RESPONSE',
    duration: `${duration}ms`,
    success: true,
    transcriptLength: response ? response.length : 0
  };
  
  console.log('Whisper API Response:', JSON.stringify(logData, null, 2));
}

// Log API error for debugging
function logApiError(requestId, error, retryCount = 0) {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    type: 'WHISPER_API_ERROR',
    error: {
      message: error.message,
      code: error.code || 'UNKNOWN',
      statusCode: error.status || error.statusCode || null,
      retryCount,
      isRetryable: isRetryableError(error)
    }
  };
  
  console.error('Whisper API Error:', JSON.stringify(logData, null, 2));
}

// Main transcription function with retry logic
async function transcribeWithRetry(openaiClient, filePath, options = {}, jobId = null, updateJobStatus = null) {
  const requestId = crypto.randomBytes(8).toString('hex');
  const startTime = Date.now();
  let lastError = null;
  let audioDuration = null;
  let costTracking = null;
  
  // Validate audio format first
  const validation = validateAudioFormat(filePath, options.mimeType);
  
  // Get audio duration for cost calculation
  try {
    audioDuration = await getAudioDuration(filePath);
  } catch (error) {
    console.warn(`Could not get audio duration for cost calculation: ${error.message}`);
  }
  
  // Prepare transcription options
  const transcriptionOptions = {
    file: createAudioStream(filePath),
    model: options.model || WHISPER_CONSTANTS.DEFAULT_MODEL,
    response_format: options.response_format || 'text',
    temperature: options.temperature || 0,
    ...options
  };
  
  // Log the request
  logApiRequest(requestId, filePath, transcriptionOptions);
  
  // Retry loop
  for (let retryCount = 0; retryCount <= WHISPER_CONSTANTS.MAX_RETRIES; retryCount++) {
    try {
      // Update job status if callback provided
      if (updateJobStatus && jobId) {
        updateJobStatus(jobId, 'PROCESSING', {
          retryCount,
          message: retryCount > 0 ? `Retrying transcription (attempt ${retryCount + 1})` : 'Sending to Whisper API'
        });
      }
      
      // Make the API call
      const response = await openaiClient.audio.transcriptions.create(transcriptionOptions);
      
      // Log successful response
      const duration = Date.now() - startTime;
      logApiResponse(requestId, response, duration);
      
      // Validate response
      if (!response) {
        throw new WhisperError(
          'Empty response from Whisper API',
          'EMPTY_RESPONSE',
          500
        );
      }
      
      // Track cost for successful transcription
      costTracking = trackTranscriptionCost(requestId, filePath, audioDuration, {
        fileSize: validation.size,
        format: validation.format,
        model: transcriptionOptions.model
      });
      
      return {
        success: true,
        transcript: response,
        metadata: {
          requestId,
          duration,
          retryCount,
          fileSize: validation.size,
          format: validation.format,
          audioDuration,
          cost: getCostInfoForJob(costTracking)
        }
      };
      
    } catch (error) {
      lastError = error;
      logApiError(requestId, error, retryCount);
      
      // Parse the error
      const whisperError = error instanceof WhisperError ? error : parseWhisperError(error);
      
      // Check if we should retry
      if (retryCount < WHISPER_CONSTANTS.MAX_RETRIES && isRetryableError(error)) {
        const delay = calculateBackoffDelay(retryCount);
        
        // Special handling for rate limits
        if (whisperError.code === 'RATE_LIMIT' && whisperError.details?.retryAfter) {
          const rateLimitDelay = whisperError.details.retryAfter * 1000;
          console.log(`Rate limited. Waiting ${rateLimitDelay / 1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        } else {
          console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/${WHISPER_CONSTANTS.MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Recreate the file stream for retry
        transcriptionOptions.file = createAudioStream(filePath);
        continue;
      }
      
      // No more retries, throw the error
      throw whisperError;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new WhisperError(
    'Maximum retries exceeded',
    'MAX_RETRIES_EXCEEDED',
    500,
    { maxRetries: WHISPER_CONSTANTS.MAX_RETRIES }
  );
}

// Resource cleanup function
async function cleanupResources(resources = {}) {
  const { stream, tempFiles = [] } = resources;
  
  try {
    // Close any open streams
    if (stream && !stream.destroyed) {
      stream.destroy();
    }
    
    // Remove temporary files
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          await fs.promises.unlink(tempFile);
          console.log(`Cleaned up temporary file: ${tempFile}`);
        }
      } catch (error) {
        console.error(`Failed to clean up temp file ${tempFile}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during resource cleanup:', error);
  }
}

// Main export function that integrates with job tracking
async function processWhisperTranscription(openaiClient, filePath, options = {}, jobCallbacks = {}) {
  const { jobId, updateJobStatus, onProgress } = jobCallbacks;
  const resources = { tempFiles: [] };
  let conversionResult = null;
  let processFilePath = filePath;
  
  try {
    // Initial validation
    console.log(`Starting Whisper transcription for file: ${path.basename(filePath)}`);
    
    if (!openaiClient) {
      throw new WhisperError(
        'OpenAI client not initialized',
        'CLIENT_NOT_INITIALIZED',
        500
      );
    }
    
    // Update job status to processing
    if (updateJobStatus && jobId) {
      updateJobStatus(jobId, 'PROCESSING', {
        stage: 'validation',
        message: 'Validating audio file'
      });
    }
    
    // Check if file needs conversion
    if (needsConversion(filePath)) {
      console.log(`File needs conversion: ${path.basename(filePath)}`);
      
      if (updateJobStatus && jobId) {
        updateJobStatus(jobId, 'PROCESSING', {
          stage: 'conversion',
          message: 'Converting audio format for compatibility'
        });
      }
      
      try {
        // Convert the audio file
        conversionResult = await convertAudioFile(filePath, path.dirname(filePath));
        
        if (conversionResult.converted) {
          processFilePath = conversionResult.outputPath;
          resources.tempFiles.push(conversionResult.outputPath);
          
          console.log(`Audio converted successfully: ${path.basename(processFilePath)}`);
          
          if (updateJobStatus && jobId) {
            updateJobStatus(jobId, 'PROCESSING', {
              stage: 'conversion_complete',
              message: 'Audio format conversion completed'
            });
          }
        }
      } catch (convError) {
        throw new WhisperError(
          `Audio format conversion failed: ${convError.message}`,
          'CONVERSION_FAILED',
          422,
          { originalFormat: path.extname(filePath) }
        );
      }
    }
    
    // Perform transcription with retry logic
    const result = await transcribeWithRetry(
      openaiClient,
      processFilePath,
      options,
      jobId,
      updateJobStatus
    );
    
    // Add conversion info to metadata if applicable
    if (conversionResult && conversionResult.converted) {
      result.metadata.wasConverted = true;
      result.metadata.originalFormat = path.extname(filePath);
      result.metadata.conversionDuration = conversionResult.duration;
    }
    
    // Update job status to completed
    if (updateJobStatus && jobId) {
      updateJobStatus(jobId, 'COMPLETED', {
        transcriptText: result.transcript,
        metadata: result.metadata
      });
    }
    
    // Notify progress callback if provided
    if (onProgress) {
      onProgress({
        status: 'completed',
        transcript: result.transcript,
        metadata: result.metadata
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Whisper transcription failed:', error);
    
    // Update job status to failed
    if (updateJobStatus && jobId) {
      updateJobStatus(jobId, 'FAILED', {
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorDetails: error.details || {}
      });
    }
    
    // Notify progress callback if provided
    if (onProgress) {
      onProgress({
        status: 'failed',
        error: error.message,
        errorCode: error.code
      });
    }
    
    throw error;
    
  } finally {
    // Cleanup converted file if it exists
    if (conversionResult && conversionResult.converted) {
      await cleanupConvertedFile(conversionResult);
    }
    
    // Always cleanup resources
    await cleanupResources(resources);
  }
}

// Export all functions and constants
module.exports = {
  processWhisperTranscription,
  transcribeWithRetry,
  validateAudioFormat,
  getAudioDuration,
  WhisperError,
  WHISPER_CONSTANTS,
  isRetryableError,
  parseWhisperError,
  cleanupResources
};