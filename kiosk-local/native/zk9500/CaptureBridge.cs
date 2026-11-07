using System;
using System.IO;
using System.Text;
using System.Threading;
using libzkfpcsharp;

namespace ThesisKiosk.ZK9500
{
    internal static class CaptureBridge
    {
        private static volatile bool cancelRequested;
        private static IntPtr device;
        private static IntPtr database;
        private static bool initialized;

        private static void Emit(string value)
        {
            Console.Error.WriteLine(value);
            Console.Error.Flush();
        }

        private static int ReadInt32(Stream input)
        {
            byte[] value = new byte[4];
            ReadExactly(input, value, value.Length);
            int result = BitConverter.ToInt32(value, 0);
            Array.Clear(value, 0, value.Length);
            return result;
        }

        private static void ReadExactly(Stream input, byte[] value, int count)
        {
            int offset = 0;
            while (offset < count)
            {
                int read = input.Read(value, offset, count - offset);
                if (read <= 0) throw new EndOfStreamException("Fingerprint index stream ended unexpectedly.");
                offset += read;
            }
        }

        private static byte[] Padded(byte[] template)
        {
            if (template == null || template.Length == 0 || template.Length > 2048)
                throw new InvalidDataException("The SDK returned an invalid fingerprint template.");
            byte[] padded = new byte[2048];
            Buffer.BlockCopy(template, 0, padded, 0, template.Length);
            return padded;
        }

        private static int ReadParameter(int code)
        {
            byte[] value = new byte[4];
            int size = value.Length;
            int result = 0;
            int ret = zkfp2.GetParameters(device, code, value, ref size);
            if (ret != 0) throw new InvalidOperationException("Cannot read reader settings (" + ret + ").");
            zkfp2.ByteArray2Int(value, ref result);
            Array.Clear(value, 0, value.Length);
            return result;
        }

        private static void LoadExistingTemplates(Stream input)
        {
            int count = ReadInt32(input);
            if (count < 0 || count > 100000)
                throw new InvalidDataException("The local fingerprint index has an invalid size.");

            for (int id = 1; id <= count; id++)
            {
                int length = ReadInt32(input);
                if (length < 1 || length > 2048)
                    throw new InvalidDataException("A saved fingerprint template has an invalid size.");

                byte[] template = new byte[length];
                byte[] padded = null;
                try
                {
                    ReadExactly(input, template, length);
                    padded = Padded(template);
                    int ret = zkfp2.DBAdd(database, id, padded);
                    if (ret != 0)
                        throw new InvalidOperationException("Cannot load the local fingerprint index (" + ret + ").");
                }
                finally
                {
                    Array.Clear(template, 0, template.Length);
                    if (padded != null) Array.Clear(padded, 0, padded.Length);
                }
            }
        }

        private static void ReadCancelCommands(Stream input)
        {
            try
            {
                StringBuilder line = new StringBuilder();
                while (!cancelRequested)
                {
                    int next = input.ReadByte();
                    if (next < 0) return;
                    if (next == 10)
                    {
                        if (line.ToString() == "CANCEL") cancelRequested = true;
                        line.Length = 0;
                    }
                    else if (next != 13 && line.Length < 32) line.Append((char)next);
                }
            }
            catch { cancelRequested = true; }
        }

        private static byte[] CaptureMergedTemplate()
        {
            int width = ReadParameter(1);
            int height = ReadParameter(2);
            if (width < 1 || height < 1 || width > 4096 || height > 4096)
                throw new InvalidOperationException("The reader returned invalid image dimensions.");

            byte[] image = new byte[width * height];
            byte[] sdkTemplate = new byte[2048];
            byte[][] samples = new byte[3][];
            int sampleCount = 0;
            bool fingerPresent = false;
            int emptyFrames = 0;
            int errors = 0;

            try
            {
                Emit("READY");
                while (sampleCount < 3 && !cancelRequested)
                {
                    int length = sdkTemplate.Length;
                    int ret = zkfp2.AcquireFingerprint(device, image, sdkTemplate, ref length);
                    if (cancelRequested) break;

                    if (ret == 0)
                    {
                        errors = 0;
                        emptyFrames = 0;
                        if (!fingerPresent)
                        {
                            fingerPresent = true;
                            if (length < 1 || length > sdkTemplate.Length)
                                throw new InvalidDataException("The reader returned an invalid template length.");

                            byte[] current = new byte[length];
                            Buffer.BlockCopy(sdkTemplate, 0, current, 0, length);
                            byte[] padded = null;
                            try
                            {
                                padded = Padded(current);
                                int id = 0;
                                int score = 0;
                                int identify = zkfp2.DBIdentify(database, padded, ref id, ref score);
                                if (identify == 0)
                                {
                                    Emit("DUPLICATE");
                                    throw new InvalidOperationException("This fingerprint is already enrolled. Choose another finger or use the existing enrollment.");
                                }
                                if (identify != -17)
                                    throw new InvalidOperationException("Fingerprint search failed (" + identify + "). Reconnect the reader.");

                                if (sampleCount > 0)
                                {
                                    byte[] previousPadded = Padded(samples[sampleCount - 1]);
                                    int match;
                                    try { match = zkfp2.DBMatch(database, padded, previousPadded); }
                                    finally { Array.Clear(previousPadded, 0, previousPadded.Length); }
                                    if (match <= 0)
                                    {
                                        Emit("MISMATCH:" + sampleCount);
                                        continue;
                                    }
                                }

                                samples[sampleCount++] = current;
                                current = null;
                                Emit("CAPTURED:" + sampleCount);
                            }
                            finally
                            {
                                if (current != null) Array.Clear(current, 0, current.Length);
                                if (padded != null) Array.Clear(padded, 0, padded.Length);
                                Array.Clear(sdkTemplate, 0, sdkTemplate.Length);
                            }
                        }
                    }
                    else if (ret == -8)
                    {
                        errors = 0;
                        if (++emptyFrames >= 2 && fingerPresent)
                        {
                            fingerPresent = false;
                            Emit("RELEASED:" + sampleCount);
                        }
                    }
                    else if (ret == -9 || ret == -12)
                    {
                        if (++errors >= 30)
                            throw new InvalidOperationException("The reader cannot capture a usable fingerprint. Clean and dry your finger, then try again.");
                    }
                    else if (++errors >= 5)
                    {
                        throw new InvalidOperationException("Capture failed (" + ret + "). Check the USB connection and reconnect the reader.");
                    }

                    Thread.Sleep(120);
                }

                if (cancelRequested) throw new OperationCanceledException("Fingerprint enrollment was cancelled.");

                Emit("MERGING");
                byte[] first = Padded(samples[0]);
                byte[] second = Padded(samples[1]);
                byte[] third = Padded(samples[2]);
                byte[] merged = new byte[2048];
                try
                {
                    int mergedLength = merged.Length;
                    int ret = zkfp2.DBMerge(database, first, second, third, merged, ref mergedLength);
                    if (ret != 0 || mergedLength < 1 || mergedLength > merged.Length)
                        throw new InvalidOperationException("The SDK could not merge the three scans (" + ret + "). Please enroll again.");
                    byte[] result = new byte[mergedLength];
                    Buffer.BlockCopy(merged, 0, result, 0, mergedLength);
                    return result;
                }
                finally
                {
                    Array.Clear(first, 0, first.Length);
                    Array.Clear(second, 0, second.Length);
                    Array.Clear(third, 0, third.Length);
                    Array.Clear(merged, 0, merged.Length);
                }
            }
            finally
            {
                Array.Clear(image, 0, image.Length);
                Array.Clear(sdkTemplate, 0, sdkTemplate.Length);
                foreach (byte[] sample in samples)
                    if (sample != null) Array.Clear(sample, 0, sample.Length);
            }
        }

        private static void Cleanup()
        {
            try { if (database != IntPtr.Zero) { zkfp2.DBFree(database); database = IntPtr.Zero; } }
            finally
            {
                try { if (device != IntPtr.Zero) { zkfp2.CloseDevice(device); device = IntPtr.Zero; } }
                finally { if (initialized) { zkfp2.Terminate(); initialized = false; } }
            }
        }

        private static int Run()
        {
            Stream input = Console.OpenStandardInput();
            try
            {
                int ret = zkfp2.Init();
                if (ret != 0 && ret != 1) throw new InvalidOperationException("ZKFinger SDK initialization failed (" + ret + ").");
                initialized = true;
                if (zkfp2.GetDeviceCount() < 1) throw new InvalidOperationException("No ZK9500 reader found. Connect it by USB and retry.");
                device = zkfp2.OpenDevice(0);
                if (device == IntPtr.Zero) throw new InvalidOperationException("Cannot open the reader. Close ZK9500 Fingerprint Manager and other scanner applications, then retry.");
                database = zkfp2.DBInit();
                if (database == IntPtr.Zero) throw new InvalidOperationException("Cannot start the fingerprint matching engine.");
                Emit("CONNECTED");

                LoadExistingTemplates(input);
                Thread control = new Thread(delegate() { ReadCancelCommands(input); });
                control.IsBackground = true;
                control.Name = "Kiosk scanner cancellation";
                control.Start();

                byte[] result = CaptureMergedTemplate();
                try
                {
                    Emit("TEMPLATE:" + result.Length);
                    Stream output = Console.OpenStandardError();
                    output.Write(result, 0, result.Length);
                    output.Flush();
                }
                finally { Array.Clear(result, 0, result.Length); }
                return 0;
            }
            catch (OperationCanceledException ex)
            {
                Emit("CANCELLED:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(ex.Message)));
                return 2;
            }
            catch (Exception ex)
            {
                Emit("ERROR:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(ex.Message)));
                return 1;
            }
            finally { Cleanup(); }
        }

        private static int Diagnose()
        {
            try
            {
                int ret = zkfp2.Init();
                if (ret != 0 && ret != 1) throw new InvalidOperationException("ZKFinger SDK initialization failed (" + ret + ").");
                initialized = true;
                int count = zkfp2.GetDeviceCount();
                Emit("DEVICE_COUNT:" + count);
                if (count < 1) throw new InvalidOperationException("No ZK9500 reader found. Connect it by USB and retry.");
                device = zkfp2.OpenDevice(0);
                if (device == IntPtr.Zero) throw new InvalidOperationException("Cannot open the reader. Close ZK9500 Fingerprint Manager and other scanner applications, then retry.");
                database = zkfp2.DBInit();
                if (database == IntPtr.Zero) throw new InvalidOperationException("Cannot start the fingerprint matching engine.");
                int width = ReadParameter(1);
                int height = ReadParameter(2);
                if (width < 1 || height < 1 || width > 4096 || height > 4096)
                    throw new InvalidOperationException("The reader returned invalid image dimensions.");
                Emit("DIAG_OK:" + width + "x" + height);
                return 0;
            }
            catch (Exception ex)
            {
                Emit("ERROR:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(ex.Message)));
                return 1;
            }
            finally { Cleanup(); }
        }

        private static int Main(string[] args)
        {
            if (args.Length == 1 && args[0] == "--diagnose") return Diagnose();
            return Run();
        }
    }
}
