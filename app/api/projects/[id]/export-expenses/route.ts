import { NextResponse } from "next/server"
import { getProjectById } from "@/lib/server-store"

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await getProjectById(id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const sortedExpenses = [...project.expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let balance = 0
    const rows = sortedExpenses.map((expense) => {
      balance += expense.amount
      const expenseDate = new Date(expense.date)
      return {
        date: expenseDate.toLocaleDateString("en-GB"),
        time: expenseDate.toLocaleTimeString("en-GB"),
        voucherId: expense.id,
        description: expense.title,
        debit: expense.amount,
        balance,
      }
    })

    // Date and Time are kept in separate cells so the export opens in Excel
    // with each in its own column, instead of one combined timestamp cell.
    const header = ["Date", "Time", "Voucher ID", "Description", "Debit", "Running Balance"]
    const lines = [header.join(",")]
    for (const row of rows) {
      lines.push([csvCell(row.date), csvCell(row.time), csvCell(row.voucherId), csvCell(row.description), csvCell(row.debit), csvCell(row.balance)].join(","))
    }
    lines.push(["", "", "", "Total Debit", csvCell(balance), ""].join(","))

    const csv = lines.join("\r\n")
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project"

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-expenses.csv"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
