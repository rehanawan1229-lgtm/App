import { NextResponse } from "next/server"
import { readProperties, createPropertyRecord } from "@/lib/server-store"
import type { PropertyType, PropertyStatus } from "@/lib/zameen-data"

export async function GET() {
  try {
    const properties = await readProperties()
    return NextResponse.json({ properties })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Could not load properties" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Property name is required" }, { status: 400 })
    }

    const property = await createPropertyRecord({
      name,
      location: typeof body.location === "string" ? body.location : "",
      type: (body.type as PropertyType) ?? "House",
      status: (body.status as PropertyStatus) ?? "Owned",
      size: typeof body.size === "string" ? body.size : "",
      value: Number.isFinite(Number(body.value)) ? Number(body.value) : 0,
      color: typeof body.color === "string" ? body.color : "",
      documents: Array.isArray(body.documents) ? body.documents : [],
      tenants: Array.isArray(body.tenants) ? body.tenants : [],
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Property could not be created" }, { status: 500 })
  }
}
