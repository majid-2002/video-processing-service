import express from "express";
import {
  convertVideo,
  deleteProcessedVideo,
  deleteRawVideo,
  downloadVideo,
  setupDirectory,
  uploadProcessedVideo,
} from "./storage";
import { isVideoNew, setVideo } from "./firestore";

setupDirectory();

const app = express();
app.use(express.json());

app.post("/process-video", async (req, res) => {
  // get the bucket name and file name from Cloud pub/sub message
  let data;
  try {
    const message = Buffer.from(req.body.message.data, "base64").toString(
      "utf-8"
    );
    data = JSON.parse(message);
    if (!data.bucket || !data.name) {
      throw new Error("Bucket or name is missing from data");
    }
  } catch (error) {
    console.error(error);
    return res.status(400).send("Bad Request missing bucket or name");
  }
  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;
  const videoId = inputFileName.split(".")[0];

  if (!isVideoNew(videoId)) {
    return res.status(400).send("Bad Request video already processed");
  } else {
    await setVideo(videoId, {
      id: videoId,
      uid: videoId.split("-")[0],
      status: "processing",
    });
  }

  //download the video from raw bucket
  await downloadVideo(inputFileName);

  try {
    await convertVideo(inputFileName, outputFileName);
  } catch (error) {
    // delete the raw and processed video if there is an error during conversion
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName),
    ]);
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }

  //upload the processed video to processed bucket
  await uploadProcessedVideo(outputFileName);

  await setVideo(videoId, { 
    status: "processed", 
    filename: outputFileName 
  });

  // delete the raw and processed video
  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName),
  ]);

  return res.status(200).send("Processing finished successfully");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
