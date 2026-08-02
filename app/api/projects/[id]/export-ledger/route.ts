import { NextResponse } from "next/server"
import { getProjectById } from "@/lib/server-store"
import { getProjectLedgerEntries } from "@/lib/zameen-data"

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

// GET /api/projects/:id/export-ledger
// Full lifetime statement: every expense, transport cost, and payment for the
// project, in one running-balance ledger — the "lifetime kharcha" export.
// Unlike /export-expenses (debit-only, expenses only) this includes Credit
// and covers transport costs too, since those are still project spend.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await getProjectById(id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const entries = getProjectLedgerEntries(project)

    // Date and Time are kept in separate cells so the export opens in Excel
    // with each in its own column, instead of one combined timestamp cell.
    const header = ["Date", "Time", "Voucher/Transaction ID", "Description", "Debit", "Credit", "Running Balance"]
    const lines = [header.join(",")]
    let totalDebit = 0
    let totalCredit = 0
    for (const entry of entries) {
      totalDebit += entry.debit
      totalCredit += entry.credit
      const entryDate = new Date(entry.timestamp)
      lines.push(
        [
          csvCell(entryDate.toLocaleDateString("en-GB")),
          csvCell(entryDate.toLocaleTimeString("en-GB")),
          csvCell(entry.voucherId),
          csvCell(entry.description),
          csvCell(entry.debit || ""),
          csvCell(entry.credit || ""),
          csvCell(entry.balance),
        ].join(","),
      )
    }
    lines.push(["", "", "", "Totals", csvCell(totalDebit), csvCell(totalCredit), csvCell(totalDebit - totalCredit)].join(","))
    lines.push(["", "", "", "Closing Balance", "", "", csvCell(entries.length ? entries[entries.length - 1].balance : 0)].join(","))

    const csv = lines.join("\r\n")
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project"

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-statement.csv"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
