import { NextResponse } from "next/server"
import { updateProjectRecord, deleteProjectRecord } from "@/lib/server-store"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const patch: Record<string, unknown> = {}
    if (typeof body.name === "string") patch.name = body.name.trim()
    if (typeof body.client === "string") patch.client = body.client.trim() || undefined
    if (body.budget !== undefined) patch.budget = body.budget === "" || body.budget === null ? undefined : Number(body.budget)
    if (typeof body.location === "string") patch.location = body.location.trim()
    if (typeof body.link === "string") patch.link = body.link.trim()
    if (typeof body.coordinates === "string") patch.coordinates = body.coordinates.trim()
    if (typeof body.photoUrl === "string") patch.photoUrl = body.photoUrl
    if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl

    const project = await updateProjectRecord(id, patch)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Project could not be updated" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const removed = await deleteProjectRecord(id)
    if (!removed) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Project could not be deleted" }, { status: 500 })
  }
}
