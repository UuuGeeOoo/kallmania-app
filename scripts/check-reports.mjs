import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const rs = await db.report.findMany({
  where: { status: { in: ['SUBMITTED','APPROVED'] } },
  select: { ref: true, type: true, reportDate: true, status: true, userId: true, user: { select: { fullName: true, email: true } } },
  orderBy: { reportDate: 'desc' },
});
const byDate = {};
for (const r of rs) {
  const d = new Date(r.reportDate).toISOString().slice(0,10);
  byDate[d] = (byDate[d]||0)+1;
  console.log(d, r.status.padEnd(9), r.type.padEnd(10), r.user.fullName, r.ref);
}
console.log('---dates:', JSON.stringify(byDate));
await db.$disconnect();
