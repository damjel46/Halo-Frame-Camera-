package expo.modules.mymodule

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.net.Uri as AndroidUri
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.nio.ByteBuffer
import java.util.concurrent.Executors

class EncodeOptionsRecord : Record {
    @Field val photoPaths: List<String> = emptyList()
    @Field val timings: List<Double> = emptyList()
    @Field val audioPath: String? = null
    @Field val outputPath: String = ""
}

class VideoEncoderModule : Module() {

    private val executor = Executors.newSingleThreadExecutor()

    override fun definition() = ModuleDefinition {
        Name("VideoEncoder")

        AsyncFunction("encode") { options: EncodeOptionsRecord, promise: Promise ->
            executor.submit {
                try {
                    if (options.photoPaths.isEmpty())
                        throw IllegalArgumentException("photoPaths required")
                    if (options.timings.size != options.photoPaths.size)
                        throw IllegalArgumentException("photoPaths and timings must have same length")
                    if (options.outputPath.isBlank())
                        throw IllegalArgumentException("outputPath required")

                    val timingsMs = options.timings.map { it.toLong() }
                    val result = encodeVideo(
                        options.photoPaths, timingsMs, options.audioPath, options.outputPath
                    )
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("ENCODE_ERROR", e.message ?: "Unknown error", e)
                }
            }
        }
    }

    private fun uriToPath(uri: String): String =
        if (uri.startsWith("file:")) AndroidUri.parse(uri).path ?: uri else uri

    private fun encodeVideo(
        photoPaths: List<String>,
        timings: List<Long>,
        audioPath: String?,
        outputPath: String
    ): String {
        val cleanOutput = uriToPath(outputPath)
        val WIDTH = 1080
        val HEIGHT = 1080
        val FPS = 30
        val BIT_RATE = 6_000_000
        val MIME = MediaFormat.MIMETYPE_VIDEO_AVC
        val FRAME_US = 1_000_000L / FPS

        val format = MediaFormat.createVideoFormat(MIME, WIDTH, HEIGHT).apply {
            setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
            setInteger(MediaFormat.KEY_FRAME_RATE, FPS)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
            setInteger(
                MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar
            )
        }

        val encoder = MediaCodec.createEncoderByType(MIME)
        encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        encoder.start()

        val tempFile = File("$cleanOutput.tmp.mp4")
        val muxer = MediaMuxer(tempFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

        var videoTrackIndex = -1
        var muxerStarted = false
        var presentationTimeUs = 0L
        val bufferInfo = MediaCodec.BufferInfo()
        val nv12Buffer = ByteArray(WIDTH * HEIGHT * 3 / 2)

        fun drainEncoder(endOfStream: Boolean) {
            if (endOfStream) {
                val idx = encoder.dequeueInputBuffer(10_000)
                if (idx >= 0) {
                    encoder.queueInputBuffer(
                        idx, 0, 0, presentationTimeUs,
                        MediaCodec.BUFFER_FLAG_END_OF_STREAM
                    )
                }
            }
            loop@ while (true) {
                val outIdx = encoder.dequeueOutputBuffer(bufferInfo, 10_000)
                when {
                    outIdx == MediaCodec.INFO_TRY_AGAIN_LATER ->
                        if (endOfStream) continue@loop else break@loop
                    outIdx == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        videoTrackIndex = muxer.addTrack(encoder.outputFormat)
                        muxer.start()
                        muxerStarted = true
                    }
                    outIdx >= 0 -> {
                        val buf = encoder.getOutputBuffer(outIdx)!!
                        val isConfig = bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
                        if (!isConfig && muxerStarted && bufferInfo.size > 0) {
                            muxer.writeSampleData(videoTrackIndex, buf, bufferInfo)
                        }
                        encoder.releaseOutputBuffer(outIdx, false)
                        if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return
                    }
                }
            }
        }

        for (idx in photoPaths.indices) {
            val bitmap = loadAndScaleBitmap(photoPaths[idx], WIDTH, HEIGHT)
            bitmapToNV12(bitmap, WIDTH, HEIGHT, nv12Buffer)
            bitmap.recycle()

            val durationUs = timings[idx] * 1000L
            val numFrames = (durationUs / FRAME_US).toInt().coerceAtLeast(1)

            repeat(numFrames) {
                val inputIdx = encoder.dequeueInputBuffer(10_000)
                if (inputIdx >= 0) {
                    val inputBuf = encoder.getInputBuffer(inputIdx)!!
                    inputBuf.clear()
                    inputBuf.put(nv12Buffer)
                    encoder.queueInputBuffer(inputIdx, 0, nv12Buffer.size, presentationTimeUs, 0)
                    presentationTimeUs += FRAME_US
                }
                drainEncoder(false)
            }
        }

        drainEncoder(true)
        encoder.stop()
        encoder.release()
        muxer.stop()
        muxer.release()

        return if (audioPath != null) {
            muxVideoAndAudio(tempFile.absolutePath, uriToPath(audioPath), cleanOutput, presentationTimeUs)
            tempFile.delete()
            cleanOutput
        } else {
            tempFile.renameTo(File(cleanOutput))
            cleanOutput
        }
    }

    private fun muxVideoAndAudio(
        videoPath: String,
        audioPath: String,
        outputPath: String,
        videoDurationUs: Long
    ) {
        val videoExtractor = MediaExtractor().apply { setDataSource(videoPath) }
        val audioExtractor = MediaExtractor().apply { setDataSource(audioPath) }

        val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        val bufferInfo = MediaCodec.BufferInfo()
        val buffer = ByteBuffer.allocate(2 * 1024 * 1024)

        var videoTrackIdx = -1
        for (i in 0 until videoExtractor.trackCount) {
            val fmt = videoExtractor.getTrackFormat(i)
            if (fmt.getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true) {
                videoExtractor.selectTrack(i)
                videoTrackIdx = muxer.addTrack(fmt)
                break
            }
        }

        var audioTrackIdx = -1
        for (i in 0 until audioExtractor.trackCount) {
            val fmt = audioExtractor.getTrackFormat(i)
            if (fmt.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
                audioExtractor.selectTrack(i)
                audioTrackIdx = muxer.addTrack(fmt)
                break
            }
        }

        muxer.start()

        while (true) {
            buffer.clear()
            val size = videoExtractor.readSampleData(buffer, 0)
            if (size < 0) break
            bufferInfo.set(0, size, videoExtractor.sampleTime, videoExtractor.sampleFlags)
            muxer.writeSampleData(videoTrackIdx, buffer, bufferInfo)
            videoExtractor.advance()
        }

        if (audioTrackIdx >= 0) {
            while (true) {
                buffer.clear()
                val size = audioExtractor.readSampleData(buffer, 0)
                if (size < 0) break
                val sampleTime = audioExtractor.sampleTime
                if (sampleTime > videoDurationUs) break
                bufferInfo.set(0, size, sampleTime, audioExtractor.sampleFlags)
                muxer.writeSampleData(audioTrackIdx, buffer, bufferInfo)
                audioExtractor.advance()
            }
        }

        videoExtractor.release()
        audioExtractor.release()
        muxer.stop()
        muxer.release()
    }

    private fun loadAndScaleBitmap(path: String, width: Int, height: Int): Bitmap {
        val cleanPath = uriToPath(path)

        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(cleanPath, opts)
        val sample = maxOf(opts.outWidth / width, opts.outHeight / height).coerceAtLeast(1)

        val raw = BitmapFactory.decodeFile(cleanPath, BitmapFactory.Options().apply {
            inSampleSize = sample
        }) ?: throw IllegalArgumentException("Cannot decode: $path")

        val scale = maxOf(width.toFloat() / raw.width, height.toFloat() / raw.height)
        val sw = (raw.width * scale).toInt()
        val sh = (raw.height * scale).toInt()

        val scaled = Bitmap.createScaledBitmap(raw, sw, sh, true)
        if (scaled !== raw) raw.recycle()

        val x = (sw - width) / 2
        val y = (sh - height) / 2
        val cropped = Bitmap.createBitmap(scaled, x, y, width, height)
        if (cropped !== scaled) scaled.recycle()

        return if (cropped.config == Bitmap.Config.ARGB_8888) cropped
        else cropped.copy(Bitmap.Config.ARGB_8888, false).also { cropped.recycle() }
    }

    private fun bitmapToNV12(bitmap: Bitmap, width: Int, height: Int, out: ByteArray) {
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        var yIdx = 0
        var uvIdx = width * height

        for (j in 0 until height) {
            for (i in 0 until width) {
                val p = pixels[j * width + i]
                val r = (p shr 16) and 0xFF
                val g = (p shr 8) and 0xFF
                val b = p and 0xFF

                val y = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
                out[yIdx++] = y.coerceIn(16, 235).toByte()

                if (j % 2 == 0 && i % 2 == 0) {
                    val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
                    val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128
                    out[uvIdx++] = u.coerceIn(16, 240).toByte()
                    out[uvIdx++] = v.coerceIn(16, 240).toByte()
                }
            }
        }
    }
}
