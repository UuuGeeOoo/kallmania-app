import { PrismaClient } from '@prisma/client'

// Task 44 post-delivery verification: escalation tables, legacy seeded threads, base data.
const db = new PrismaClient()

const main = async () => {
  const escs = await db.escalation.findMany({
    select: {
      id: true, subject: true, status: true, targetName: true,
      _count: { select: { messages: true, events: true, reads: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`Escalations: ${escs.length}`)
  for (const e of escs) {
    console.log(` - [${e.status}] "${e.subject}" -> ${e.targetName ?? 'role-routed'} | msgs=${e._count.messages} events=${e._count.events} reads=${e._count.reads}`)
  }
  console.log(`EscalationMessages total: ${await db.escalationMessage.count()}`)
  console.log(`EscalationEvents total:   ${await db.escalationEvent.count()}`)
  console.log(`EscalationReads total:    ${await db.escalationRead.count()}`)
  console.log(`Users: ${await db.user.count()} | Reports: ${await db.report.count()}`)
  const masters = await db.reportMasterTemplate.findMany({ select: { reportType: true } })
  console.log(`Masters: ${masters.map((m) => m.reportType).join(', ')}`)
  await db.$disconnect()
}

main()
