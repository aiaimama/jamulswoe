import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://560f412c474fd53c9c4d9dad9a68fc5a.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { filename, contentType } = req.query
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)
  await r2.send(new PutObjectCommand({
    Bucket: 'jamulswoe',
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  }))
  res.json({ url: `${process.env.R2_PUBLIC_URL}/${filename}` })
}
