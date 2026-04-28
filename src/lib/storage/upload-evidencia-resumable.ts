"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

function getProjectRefFromUrl(url: string) {
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co$/);
  if (!match) {
    throw new Error("No se pudo obtener el project ref desde NEXT_PUBLIC_SUPABASE_URL");
  }
  return match[1];
}

export async function uploadEvidenciaResumable(args: {
  bucketName: string;
  objectName: string;
  file: File;
  onProgress?: (percentage: number) => void;
}) {
  const supabase = createClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables públicas de Supabase");
  }

  const projectRef = getProjectRefFromUrl(supabaseUrl);
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const bearerToken = session?.access_token || supabaseAnonKey;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(args.file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${bearerToken}`,
        apikey: supabaseAnonKey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: args.bucketName,
        objectName: args.objectName,
        contentType: args.file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError(error) {
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        args.onProgress?.(percentage);
      },
      onSuccess() {
        resolve();
      },
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });

  const { data } = supabase.storage.from(args.bucketName).getPublicUrl(args.objectName);

  return {
    path: args.objectName,
    publicUrl: data.publicUrl,
  };
}