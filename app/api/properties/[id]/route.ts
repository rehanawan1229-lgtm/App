import { NextResponse } from "next/server"
import { getPropertyById, replacePropertyRecord, deletePropertyRecord } from "@/lib/server-store"

// Properties sync as a whole object: the client always sends its complete,
// current copy (documents and tenants included), and this just replaces
// whatever the server had — see the note in lib/server-store.ts.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const existing = await getPropertyById(id)
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    const property = await replacePropertyRecord(id, { ...existing, ...body, id })
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }
    return NextResponse.json({ property })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Property could not be updated" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const removed = await deletePropertyRecord(id)
    if (!removed) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Property could not be deleted" }, { status: 500 })
  }
}
