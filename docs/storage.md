# Cloud Storage ☁️

Easily manage file and image uploads without setting up AWS S3 buckets or managing complex multi-part forms.

## 1. Upload a File

To upload a file, send a `POST` request with a `multipart/form-data` body.

**Endpoint**: `POST /api/storage/upload`

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch('https://api.urbackend.bitbros.in/api/storage/upload', {
  method: 'POST',
  headers: { 'x-api-key': 'YOUR_KEY' },
  body: formData
});

const { url, path } = await res.json();
// url: "https://storage.urbackend.bitbros.in/.../image.jpg"
// path: "project_id/image.jpg"
```

> [!NOTE]
> Do **NOT** set the `Content-Type` header manually for file uploads; the browser will handle it for you when you pass a `FormData` object.

## 2. Delete a File

To delete a file, you must provide the `path` returned during the upload.

**Endpoint**: `DELETE /api/storage/file`

```javascript
await fetch('https://api.urbackend.bitbros.in/api/storage/file', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_KEY' },
  body: JSON.stringify({
    path: "YOUR_PROJECT_ID/your_file_name.png"
  })
});
```

## Limits

- **File Size**: Maximum **10 MB** per file.
- **Storage Quota**: Total storage depends on your project's plan (default: **100 MB**).
- **Public Access**: All uploaded files are publicly accessible via the returned URL. Do not upload sensitive, private documents.
