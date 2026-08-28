import api from './api';
import axios from 'axios';

export const uploadService = {
  getPresignedUrl: (purpose, mimeType) =>
    api.post('/uploads/presign', { purpose, mime_type: mimeType }),

  uploadFile: async (file, purpose) => {
    const mimeType = file.type;
    const { data } = await api.post('/uploads/presign', { purpose, mime_type: mimeType });
    await axios.put(data.upload_url, file, {
      headers: { 'Content-Type': mimeType },
    });
    return data.file_url;
  },
};
