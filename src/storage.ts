import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const storage = new Storage();

const rawVideoBucketName = "yt-raw-videos-001";
const processedVideoBucketName = "yt-processed-videos-001";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

/**
 * Creates the local directories for raw and processed videos.
 */

export function setupDirectory() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

/**
 * @param rawVideoName - The name of the video file to convert from {@link localRawVideoPath}
 * @param processedVideoName - The name of the video file to convert to {@link localProcessedVideoPath}
 * @returns A promise that resolves when the video has been converted
 */

export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360") // 360p
      .on("end", () => {
        console.log("Video conversion complete");
        resolve();
      })
      .on("error", (err) => {
        console.log("Error: ", err);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

/**
 * @param fileName - The name of the video file to upload from {@link localProcessedVideoPath}
 * into the {@link processedVideoBucketName} bucket
 * @returns A promise that resolves when the video has been uploaded
 */

export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);

  await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
    destination: fileName,
  });

  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
  );

  await bucket.file(fileName).makePublic();
}

/**
 * @param fileName - The name of the video file to download from {@link rawVideoBucketName}
 * into the {@link localRawVideoPath} directory
 * @returns A promise that resolves when the video has been downloaded
 */

export function downloadVideo(fileName: string) {
  return new Promise<void>((resolve, reject) => {
    const file = storage.bucket(rawVideoBucketName).file(fileName);

    file.exists().then((data) => {
      const exists = data[0];

      if (!exists) {
        console.log(`gs://${rawVideoBucketName}/${fileName} does not exist`);
        reject();
      }

      file
        .download({ destination: `${localRawVideoPath}/${fileName}` })
        .then(() => {
          console.log(
            `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}`
          );
          resolve();
        })
        .catch((err) => {
          console.error("ERROR:", err);
          reject(err);
        });
    });
  });
}

/**
 * @param fileName - The name of the video file to delete.
 * @returns A promise that resolves when the video has been deleted
 */

function deleteVideo(filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(`Failed to delete file at ${filePath}`);
          reject(err);
        } else {
          console.log(`File deleted at ${filePath}`);
          resolve();
        }
      });
    } else {
      console.log(`File ${filePath} does not exist`);
      resolve();
    }
  });
}

/**
 * @param fileName - The name of the video file to delete {@link localRawVideoPath}
 * @returns A promise that resolves when the video has been deleted
 */

export function deleteRawVideo(fileName: string) {
  return deleteVideo(`${localRawVideoPath}/${fileName}`);
}

/**
 * @param fileName - The name of the video file to delete {@link localProcessedVideoPath}
 * @returns A promise that resolves when the video has been deleted
 */

export function deleteProcessedVideo(fileName: string) {
  return deleteVideo(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * Ensure that directories exist
 * @param {string} - The path to the directory to create
 */

function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }); //? recursive: true creates parent directories if they don't exist
    console.log(`Directory created at ${dirPath}`);
  }
}
