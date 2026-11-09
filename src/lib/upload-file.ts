export interface UploadResponse<T = unknown> {
  status: number;
  body: T | { error: unknown } | null;
}

// fetch()는 업로드 진행률을 제공하지 않으므로 XMLHttpRequest로 바이트 전송률을 추적한다
// (PRD 5.3 "파일별 업로드 진행률").
export function uploadFileWithProgress<T = unknown>(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: UploadResponse<T>["body"] = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      resolve({ status: xhr.status, body });
    };

    xhr.onerror = () => reject(new Error("네트워크 오류가 발생했습니다."));

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}
