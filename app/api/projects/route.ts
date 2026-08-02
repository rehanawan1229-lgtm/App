import { NextResponse } from "next/server"
import { readProjects, createProject } from "@/lib/server-store"

export async function GET() {
  try {
    const projects = await readProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Could not load projects" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    const project = await createProject({
      name,
      propertyId: typeof body.propertyId === "string" ? body.propertyId : undefined,
      client: typeof body.client === "string" ? body.client.trim() : undefined,
      budget: Number.isFinite(Number(body.budget)) && body.budget !== undefined ? Number(body.budget) : undefined,
      location: typeof body.location === "string" ? body.location.trim() : undefined,
      link: typeof body.link === "string" ? body.link.trim() : undefined,
      coordinates: typeof body.coordinates === "string" ? body.coordinates.trim() : undefined,
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Project could not be created" }, { status: 500 })
  }
}
