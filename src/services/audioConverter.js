const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Supported input formats (broader than Whisper's supported formats)
const CONVERSION_CONFIG = {
  // Formats that need conversion
  needsConversion: ['.flac', '.aac', '.wma', '.amr', '.opus', '.ogg'],
  
  // Target format for conversion
  targetFormat: 'mp3',
  targetExtension: '.mp3',
  
  // Conversion settings
  audioCodec: 'libmp3lame',
  audioBitrate: '128k',
  audioChannels: 2,
  audioFrequency: 44100
};

// Check if file needs conversion
function needsConversion(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONVERSION_CONFIG.needsConversion.includes(ext);
}

// Get file metadata using ffprobe
function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get audio metadata: ${err.message}`));
        return;
      }
      
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) {
        reject(new Error('No audio stream found in file'));
        return;
      }
      
      resolve({
        duration: metadata.format.duration,
        bitrate: metadata.format.bit_rate,
        codec: audioStream.codec_name,
        channels: audioStream.channels,
        sampleRate: audioStream.sample_rate,
        format: metadata.format.format_name
      });
    });
  });
}

// Convert audio file to Whisper-compatible format
async function convertAudioFile(inputPath, outputDir = null) {
  const ext = path.extname(inputPath).toLowerCase();
  
  // Check if conversion is needed
  if (!needsConversion(inputPath)) {
    console.log(`File ${path.basename(inputPath)} doesn't need conversion`);
    return {
      converted: false,
      originalPath: inputPath,
      outputPath: inputPath
    };
  }
  
  // Generate output path
  const tempDir = outputDir || path.dirname(inputPath);
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const outputFileName = `converted-${uniqueId}-${path.basename(inputPath, ext)}${CONVERSION_CONFIG.targetExtension}`;
  const outputPath = path.join(tempDir, outputFileName);
  
  console.log(`Converting ${path.basename(inputPath)} from ${ext} to ${CONVERSION_CONFIG.targetFormat}...`);
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    ffmpeg(inputPath)
      .audioCodec(CONVERSION_CONFIG.audioCodec)
      .audioBitrate(CONVERSION_CONFIG.audioBitrate)
      .audioChannels(CONVERSION_CONFIG.audioChannels)
      .audioFrequency(CONVERSION_CONFIG.audioFrequency)
      .toFormat(CONVERSION_CONFIG.targetFormat)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Conversion progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        console.error('Conversion error:', err.message);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .on('end', async () => {
        const duration = Date.now() - startTime;
        console.log(`Conversion completed in ${duration}ms`);
        
        try {
          // Verify output file exists
          await fs.access(outputPath);
          
          // Get file size
          const stats = await fs.stat(outputPath);
          
          resolve({
            converted: true,
            originalPath: inputPath,
            outputPath: outputPath,
            duration: duration,
            outputSize: stats.size,
            format: CONVERSION_CONFIG.targetFormat
          });
        } catch (error) {
          reject(new Error(`Conversion output verification failed: ${error.message}`));
        }
      })
      .save(outputPath);
  });
}

// Validate if ffmpeg is available
async function validateFfmpegAvailable() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('FFmpeg validation error:', err);
        resolve(false);
      } else {
        console.log('FFmpeg is available with', Object.keys(formats).length, 'formats');
        resolve(true);
      }
    });
  });
}

// Clean up converted file
async function cleanupConvertedFile(conversionResult) {
  if (conversionResult.converted && conversionResult.outputPath !== conversionResult.originalPath) {
    try {
      await fs.unlink(conversionResult.outputPath);
      console.log(`Cleaned up converted file: ${path.basename(conversionResult.outputPath)}`);
    } catch (error) {
      console.error(`Failed to cleanup converted file: ${error.message}`);
    }
  }
}

module.exports = {
  needsConversion,
  convertAudioFile,
  getAudioMetadata,
  validateFfmpegAvailable,
  cleanupConvertedFile,
  CONVERSION_CONFIG
};