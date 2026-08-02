import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const projectId = formData.get("projectId")

    if (!(file instanceof Blob) || !projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "Missing file or project id" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = path.join(process.cwd(), "public", "project")
    await fs.mkdir(uploadDir, { recursive: true })
    const ext = path.extname((file as File).name || ".jpg")
    const fileName = `${projectId}${ext}`
    const destination = path.join(uploadDir, fileName)
    await fs.writeFile(destination, buffer)

    return NextResponse.json({ url: `/project/${fileName}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
