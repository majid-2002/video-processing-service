import { initializeApp } from "firebase-admin/app";
import { credential } from "firebase-admin";
import { Firestore } from "firebase-admin/firestore";

initializeApp({ credential: credential.applicationDefault() }); // Initialize the app without any parameters to use the default project
const firestore = new Firestore();

const videoCollectionId = "videos";

export interface Video {
  id?: string;
  uid?: string;
  filename?: string;
  status?: "processing" | "processed";
  title?: string;
  description?: string;
}

async function getVideo(id: string) {
  const snapShot = await firestore.collection(videoCollectionId).doc(id).get();
  return (snapShot.data() as Video) ?? {};
}

export function setVideo(videoId: string, video: Video) {
  return firestore.collection(videoCollectionId).doc(videoId).set(video, {
    merge: true, // Merge the new data with the existing data
  });
}

export async function isVideoNew(videoId: string) {
    const video = await getVideo(videoId);
    return video?.status === undefined;
}
